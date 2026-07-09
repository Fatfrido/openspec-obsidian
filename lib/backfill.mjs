// Backfill Obsidian frontmatter onto existing OpenSpec artifacts.
// Deterministic and idempotent: a file whose first line is "---" is never touched.
// Pure helpers are exported for tests; bin/cli.mjs dispatches backfill().

import fs from "node:fs";
import path from "node:path";

export class BackfillError extends Error {}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

// Change id of a dated archive dir name: "YYYY-MM-DD-<id>" -> "<id>".
function stripDate(dirName) {
  const m = dirName.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return m ? m[1] : dirName;
}

// Classify a path relative to openspec/ (posix or win separators).
// Returns { kind, changeId?, capability?, prefix? } or null for non-artifacts.
// kind: "spec" | "proposal" | "design" | "tasks" | "delta".
// prefix is the change's wikilink prefix ("changes/<id>/" or "changes/archive/<dated>/").
export function deriveArtifact(relPath) {
  const p = relPath.split("\\").join("/");
  let m;
  if ((m = p.match(/^specs\/([^/]+)\/spec\.md$/))) {
    return { kind: "spec", capability: m[1] };
  }
  if ((m = p.match(/^changes\/archive\/([^/]+)\/(proposal|design|tasks)\.md$/))) {
    return { kind: m[2], changeId: stripDate(m[1]), prefix: `changes/archive/${m[1]}/` };
  }
  if ((m = p.match(/^changes\/archive\/([^/]+)\/specs\/([^/]+)\/spec\.md$/))) {
    return {
      kind: "delta",
      changeId: stripDate(m[1]),
      capability: m[2],
      prefix: `changes/archive/${m[1]}/`,
    };
  }
  if ((m = p.match(/^changes\/([^/]+)\/(proposal|design|tasks)\.md$/)) && m[1] !== "archive") {
    return { kind: m[2], changeId: m[1], prefix: `changes/${m[1]}/` };
  }
  if ((m = p.match(/^changes\/([^/]+)\/specs\/([^/]+)\/spec\.md$/)) && m[1] !== "archive") {
    return { kind: "delta", changeId: m[1], capability: m[2], prefix: `changes/${m[1]}/` };
  }
  return null;
}

// Render the frontmatter block (including both "---" fences, trailing newline)
// for an artifact. `files` describes the change's siblings on disk:
// { design: bool, tasks: bool, deltaCaps: string[] } — only consulted for
// proposal/design/tasks artifacts.
export function generateFrontmatter(artifact, files = {}) {
  const { kind, changeId: id, capability: cap, prefix } = artifact;
  const caps = files.deltaCaps ?? [];
  const capTags = caps.map((c) => `, capability/${c}`).join("");
  const lines = ["---"];
  if (kind === "spec") {
    lines.push(
      "type: spec",
      `capability: ${cap}`,
      `tags: [openspec, type/spec, capability/${cap}]`,
      `aliases: ["${cap} spec"]`,
    );
  } else if (kind === "proposal") {
    lines.push(
      "type: proposal",
      `change: ${id}`,
      `tags: [openspec, type/proposal${capTags}]`,
      `aliases: ["${id} proposal"]`,
    );
    if (files.design) lines.push(`design: "[[${prefix}design|${id} design]]"`);
    if (files.tasks) lines.push(`tasks: "[[${prefix}tasks|${id} tasks]]"`);
    if (caps.length) {
      const entries = caps.map((c) => `"[[${prefix}specs/${c}/spec|${id} ${c} delta]]"`);
      lines.push(`specs: [${entries.join(", ")}]`);
    }
  } else if (kind === "design" || kind === "tasks") {
    lines.push(
      `type: ${kind}`,
      `change: ${id}`,
      `tags: [openspec, type/${kind}${capTags}]`,
      `aliases: ["${id} ${kind}"]`,
    );
  } else if (kind === "delta") {
    lines.push(
      "type: spec-delta",
      `change: ${id}`,
      `capability: ${cap}`,
      `tags: [openspec, type/spec, capability/${cap}]`,
      `aliases: ["${id} ${cap} delta"]`,
      `main_spec: "[[specs/${cap}/spec|${cap} spec]]"`,
    );
  } else {
    throw new BackfillError(`unknown artifact kind: ${kind}`);
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}

function walkMd(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(p));
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Sibling state of a change dir, for proposal/design/tasks frontmatter.
function changeFiles(openspecDir, prefix) {
  const changeDir = path.join(openspecDir, ...prefix.replace(/\/$/, "").split("/"));
  const specsDir = path.join(changeDir, "specs");
  const deltaCaps = fs.existsSync(specsDir)
    ? fs
        .readdirSync(specsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(specsDir, d.name, "spec.md")))
        .map((d) => d.name)
        .sort()
    : [];
  return {
    design: fs.existsSync(path.join(changeDir, "design.md")),
    tasks: fs.existsSync(path.join(changeDir, "tasks.md")),
    deltaCaps,
  };
}

// Extract the frontmatter region (lines between the two "---" fences) of a file.
function frontmatterRegion(text) {
  const lines = text.split("\n");
  if (lines[0].trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return lines.slice(0, i + 1).join("\n");
  }
  return null;
}

// Add frontmatter to every bare artifact under root/openspec.
// Returns { written: string[], skipped: string[] } (openspec-relative posix paths).
// dryRun prints per-file planned actions and writes nothing.
export function backfill(root, { dryRun = false } = {}) {
  const openspecDir = path.join(root, "openspec");
  const files = [
    ...walkMd(path.join(openspecDir, "specs")),
    ...walkMd(path.join(openspecDir, "changes")),
  ].sort();

  const written = [];
  const skipped = [];
  for (const file of files) {
    const rel = path.relative(openspecDir, file).split(path.sep).join("/");
    const artifact = deriveArtifact(rel);
    if (!artifact) continue;
    const text = fs.readFileSync(file, "utf8");
    if (text.split("\n")[0].trim() === "---") {
      console.log(`SKIP ${rel} (has frontmatter)`);
      skipped.push(rel);
      continue;
    }
    const needsSiblings = ["proposal", "design", "tasks"].includes(artifact.kind);
    const fm = generateFrontmatter(
      artifact,
      needsSiblings ? changeFiles(openspecDir, artifact.prefix) : {},
    );
    if (dryRun) {
      console.log(`ADD ${rel} (dry-run, not written)`);
    } else {
      fs.writeFileSync(file, fm + "\n" + text);
      console.log(`ADD ${rel}`);
    }
    written.push(rel);
  }

  // Post-write verification: every [[target|...]] in written frontmatter must
  // resolve to openspec/<target>.md on disk.
  if (!dryRun) {
    const broken = [];
    for (const rel of written) {
      const text = fs.readFileSync(path.join(openspecDir, ...rel.split("/")), "utf8");
      const fm = frontmatterRegion(text);
      if (!fm) continue;
      let m;
      WIKILINK_RE.lastIndex = 0;
      while ((m = WIKILINK_RE.exec(fm)) !== null) {
        const target = m[1].trim();
        if (!fs.existsSync(path.join(openspecDir, ...`${target}.md`.split("/")))) {
          broken.push(`${rel}: [[${target}]] -> openspec/${target}.md missing`);
        }
      }
    }
    if (broken.length) {
      throw new BackfillError(
        `ERROR: backfill produced unresolvable wikilinks:\n  ${broken.join("\n  ")}\n` +
          `Backfill requires each delta's main spec to exist \u2014 sync the capability first ` +
          `(openspec-obsidian archive, or your sync flow), then re-run backfill.`,
      );
    }
  }

  if (files.length === 0) console.log("BACKFILL OK: no artifacts found (empty openspec tree)");
  else if (dryRun) console.log(`DRY RUN: ${written.length} to write, ${skipped.length} skipped`);
  else console.log(`BACKFILL OK: ${written.length} written, ${skipped.length} skipped`);
  return { written, skipped };
}

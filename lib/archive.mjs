// Archive OpenSpec changes: sync delta specs into openspec/specs/ and move
// every all-tasks-complete change to openspec/changes/archive/YYYY-MM-DD-<id>/,
// rewriting intra-change Obsidian wikilinks. Deterministic; no OpenSpec CLI, no git.
//
// Pure functions are exported for tests; bin/cli.mjs dispatches archive()/check().

import fs from "node:fs";
import path from "node:path";

export class ArchiveError extends Error {}

const REQ_PREFIX = "### Requirement:";

// --- parsing -----------------------------------------------------------------

// Strip a leading YAML frontmatter block (--- ... ---) and return the body.
export function stripFrontmatter(text) {
  const lines = text.split("\n");
  if (lines[0] !== "---") return text;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(i + 1).join("\n");
  }
  return text;
}

// The heading text following "### Requirement: " on a requirement header line,
// or null if the line is not a requirement header.
export function requirementHeading(line) {
  if (!line.startsWith(REQ_PREFIX)) return null;
  return line.slice(REQ_PREFIX.length).trim();
}

// Split a region of lines into requirement blocks. A block runs from a "### "
// line through the line before the next "### " / "## " / EOF, trailing blank
// lines trimmed. Returns [{ heading, lines, text }].
export function parseBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (cur) blocks.push(cur);
      cur = { heading: requirementHeading(line), lines: [line] };
    } else if (line.startsWith("## ")) {
      if (cur) blocks.push(cur);
      cur = null;
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);
  for (const b of blocks) {
    while (b.lines.length && b.lines[b.lines.length - 1].trim() === "") b.lines.pop();
    b.text = b.lines.join("\n");
  }
  return blocks;
}

// Parse a delta spec body into ordered operation sections.
// ADDED/MODIFIED/REMOVED -> { op, blocks }; RENAMED -> { op, renames:[{from,to}] }.
export function parseDelta(deltaText) {
  const body = stripFrontmatter(deltaText);
  const lines = body.split("\n");
  const opRe = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/;
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(opRe);
    if (m) {
      cur = { op: m[1], lines: [] };
      sections.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  for (const s of sections) {
    if (s.op === "RENAMED") s.renames = parseRenames(s.lines);
    else s.blocks = parseBlocks(s.lines);
    delete s.lines;
  }
  return sections;
}

// Parse "- FROM: `### Requirement: X`" / "- TO: `### Requirement: Y`" pairs.
export function parseRenames(lines) {
  const renames = [];
  let from = null;
  const fromRe = /^-\s*FROM:\s*`### Requirement:\s*(.+?)`\s*$/;
  const toRe = /^-\s*TO:\s*`### Requirement:\s*(.+?)`\s*$/;
  for (const line of lines) {
    const fm = line.match(fromRe);
    const tm = line.match(toRe);
    if (fm) from = fm[1].trim();
    else if (tm && from != null) {
      renames.push({ from, to: tm[1].trim() });
      from = null;
    }
  }
  return renames;
}

// First blank-line-delimited paragraph of a proposal's "## Why" section, or null.
export function parseWhy(proposalText) {
  const lines = proposalText.split("\n");
  const start = lines.findIndex((l) => l.trim() === "## Why");
  if (start === -1) return null;
  let j = start + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  const para = [];
  for (; j < lines.length; j++) {
    if (lines[j].trim() === "" || lines[j].startsWith("## ")) break;
    para.push(lines[j]);
  }
  const text = para.join("\n").trim();
  return text.length ? text : null;
}

// --- main-spec assembly ------------------------------------------------------

// Split an existing main spec into its head (through "## Requirements" + spacing)
// and its parsed requirement blocks.
export function parseSpec(specText) {
  const lines = specText.split("\n");
  const reqIdx = lines.findIndex((l) => l.trim() === "## Requirements");
  if (reqIdx === -1) throw new ArchiveError('main spec missing "## Requirements" section');
  let firstBlock = lines.length;
  for (let i = reqIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("### ")) {
      firstBlock = i;
      break;
    }
  }
  const head = lines.slice(0, firstBlock).join("\n");
  const blocks = parseBlocks(lines.slice(firstBlock));
  return { head, blocks };
}

export function newSpecHead(cap, purpose) {
  return [
    "---",
    "type: spec",
    `capability: ${cap}`,
    `tags: [openspec, type/spec, capability/${cap}]`,
    `aliases: ["${cap} spec"]`,
    "---",
    "",
    `# ${cap} Specification`,
    "",
    "## Purpose",
    "",
    purpose,
    "",
    "## Requirements",
  ].join("\n");
}

// Reassemble a spec from its head (ending at "## Requirements") and blocks.
export function renderSpec(head, blocks) {
  const body = blocks.map((b) => b.text.replace(/\s+$/, "")).join("\n\n");
  const trimmedHead = head.replace(/\s+$/, "");
  return `${trimmedHead}\n\n${body}\n`;
}

// Apply ordered delta sections onto a mutable block list. ctx = "<id>/<cap>".
export function applyOps(blocks, sections, ctx) {
  const find = (heading) => blocks.findIndex((b) => b.heading === heading);
  for (const s of sections) {
    if (s.op === "ADDED") {
      for (const nb of s.blocks) {
        const i = find(nb.heading);
        if (i === -1) blocks.push(nb);
        else blocks[i] = nb; // idempotent replace
      }
    } else if (s.op === "MODIFIED") {
      for (const nb of s.blocks) {
        const i = find(nb.heading);
        if (i === -1)
          throw new ArchiveError(`ERROR ${ctx}: MODIFIED requirement not found: "${nb.heading}"`);
        blocks[i] = nb;
      }
    } else if (s.op === "REMOVED") {
      for (const nb of s.blocks) {
        const i = find(nb.heading);
        if (i === -1)
          throw new ArchiveError(`ERROR ${ctx}: REMOVED requirement not found: "${nb.heading}"`);
        blocks.splice(i, 1);
      }
    } else if (s.op === "RENAMED") {
      for (const r of s.renames) {
        const i = find(r.from);
        if (i === -1)
          throw new ArchiveError(`ERROR ${ctx}: RENAMED requirement not found: "${r.from}"`);
        const b = blocks[i];
        b.lines[0] = `${REQ_PREFIX} ${r.to}`;
        b.heading = r.to;
        b.text = b.lines.join("\n");
      }
    }
  }
}

// Merge one change's delta specs into the main specs under root. Returns synced caps.
export function syncChange(root, id) {
  const changeDir = path.join(root, "openspec", "changes", id);
  const specsDir = path.join(changeDir, "specs");
  const synced = [];
  if (!fs.existsSync(specsDir)) return synced;
  for (const cap of fs.readdirSync(specsDir).sort()) {
    const deltaPath = path.join(specsDir, cap, "spec.md");
    if (!fs.existsSync(deltaPath)) continue;
    const sections = parseDelta(fs.readFileSync(deltaPath, "utf8"));
    const mainPath = path.join(root, "openspec", "specs", cap, "spec.md");
    const ctx = `${id}/${cap}`;
    let head, blocks;
    if (fs.existsSync(mainPath)) {
      ({ head, blocks } = parseSpec(fs.readFileSync(mainPath, "utf8")));
    } else {
      head = newSpecHead(cap, readPurpose(changeDir, id));
      blocks = [];
    }
    applyOps(blocks, sections, ctx);
    fs.mkdirSync(path.dirname(mainPath), { recursive: true });
    fs.writeFileSync(mainPath, renderSpec(head, blocks));
    synced.push(cap);
  }
  return synced;
}

export function readPurpose(changeDir, id) {
  const proposalPath = path.join(changeDir, "proposal.md");
  const tbd = `TBD — created by auto-archive of change ${id}; refine on next edit.`;
  if (!fs.existsSync(proposalPath)) return tbd;
  return parseWhy(fs.readFileSync(proposalPath, "utf8")) || tbd;
}

// --- move / archive ----------------------------------------------------------

function walkMd(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(p));
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Move a change dir into the dated archive dir, rewrite intra-change wikilinks,
// and verify the moved proposal's wikilinks still resolve.
export function moveChange(root, id, date) {
  const src = path.join(root, "openspec", "changes", id);
  const archiveRoot = path.join(root, "openspec", "changes", "archive");
  const destName = `${date}-${id}`;
  const dest = path.join(archiveRoot, destName);
  if (fs.existsSync(dest))
    throw new ArchiveError(`ERROR: archive target exists: ${path.relative(root, dest)}`);
  fs.mkdirSync(archiveRoot, { recursive: true });
  fs.renameSync(src, dest);

  const oldPrefix = `changes/${id}/`;
  const newPrefix = `changes/archive/${destName}/`;
  for (const file of walkMd(dest)) {
    const txt = fs.readFileSync(file, "utf8");
    if (txt.includes(oldPrefix)) fs.writeFileSync(file, txt.split(oldPrefix).join(newPrefix));
  }

  const proposalPath = path.join(dest, "proposal.md");
  if (fs.existsSync(proposalPath)) {
    const txt = fs.readFileSync(proposalPath, "utf8");
    const re = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      const target = m[1].trim();
      const resolved = path.join(root, "openspec", `${target}.md`);
      if (!fs.existsSync(resolved))
        throw new ArchiveError(
          `ERROR ${id}: broken wikilink after archive: [[${target}]] -> ${path.relative(root, resolved)} missing`,
        );
    }
  }
}

// --- discovery ---------------------------------------------------------------

export function discoverChanges(root) {
  const changesDir = path.join(root, "openspec", "changes");
  if (!fs.existsSync(changesDir)) return [];
  return fs
    .readdirSync(changesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "archive")
    .map((d) => d.name)
    .sort();
}

// A change is complete iff tasks.md exists with >=1 "- [x]" and zero "- [ ]".
export function taskState(root, id) {
  const tasksPath = path.join(root, "openspec", "changes", id, "tasks.md");
  if (!fs.existsSync(tasksPath)) return { complete: false, reason: "no tasks.md" };
  const t = fs.readFileSync(tasksPath, "utf8");
  const done = (t.match(/- \[x\]/gi) || []).length;
  const open = (t.match(/- \[ \]/g) || []).length;
  if (done >= 1 && open === 0) return { complete: true };
  if (open > 0) return { complete: false, reason: `${open} incomplete tasks` };
  return { complete: false, reason: "no completed tasks" };
}

// --- driver ------------------------------------------------------------------

function writeOutputs(archived, caps) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  const a = [...archived].sort().join(",");
  const c = [...new Set(caps)].sort().join(",");
  fs.appendFileSync(out, `archived=${a}\nsynced_caps=${c}\n`);
}

export function archive(root = process.cwd()) {
  const changes = discoverChanges(root);
  const complete = [];
  for (const id of changes) {
    const st = taskState(root, id);
    if (st.complete) complete.push(id);
    else console.log(`SKIP ${id}: ${st.reason}`);
  }
  if (complete.length === 0) {
    console.log("NOTHING TO ARCHIVE");
    writeOutputs([], []);
    return;
  }
  // Sync every complete change first; a hard error aborts before any move so a
  // failed run never leaves a half-archived change.
  const caps = [];
  for (const id of complete) {
    for (const cap of syncChange(root, id)) caps.push(cap);
  }
  const date = new Date().toISOString().slice(0, 10);
  for (const id of complete) moveChange(root, id, date);
  for (const id of complete) console.log(`ARCHIVED ${id}`);
  writeOutputs(complete, caps);
}

// CI gate: fail when any change is complete (all tasks checked) but not archived.
// Never writes GITHUB_OUTPUT — read-only check.
export function check(root = process.cwd()) {
  const complete = discoverChanges(root).filter((id) => taskState(root, id).complete);
  if (complete.length > 0)
    throw new ArchiveError(
      `ERROR: complete change(s) not archived: ${complete.sort().join(", ")} — run: openspec-obsidian archive`,
    );
  console.log("CHECK OK: no complete unarchived changes");
}

// Tests for lib/changelog.mjs: release-anchored changelog generation.
// Pure helpers are exercised directly; the changelog() entry runs against real
// mkdtemp git repos (git init / commits / tags) with pinned commit dates so the
// %cs-derived section date is deterministic for byte-for-byte golden assertions.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

import {
  ChangelogError,
  parseAnchor,
  bucketOf,
  archiveIndex,
  linkSubject,
  renderSection,
  prependSection,
  changelog,
  EMPTY_NOTE,
} from "../lib/changelog.mjs";

// --- git fixture helpers -----------------------------------------------------

function git(root, args, date) {
  const env = { ...process.env };
  if (date) {
    env.GIT_AUTHOR_DATE = date;
    env.GIT_COMMITTER_DATE = date;
  }
  return execFileSync("git", args, { cwd: root, encoding: "utf8", env });
}

function mkGitRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-cl-"));
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "t@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  return root;
}

let seq = 0;
function commit(root, subject, { body = "", date = "2026-07-01T12:00:00" } = {}) {
  fs.writeFileSync(path.join(root, "f.txt"), `${subject}\n${seq++}\n`);
  git(root, ["add", "-A"], date);
  const args = ["commit", "-m", subject];
  if (body) args.push("-m", body);
  git(root, args, date);
}

function tag(root, name) {
  git(root, ["tag", name]);
}

function read(root) {
  return fs.readFileSync(path.join(root, "openspec", "changelog.md"), "utf8");
}

// --- pure helpers ------------------------------------------------------------

test("parseAnchor returns the topmost version tag or null", () => {
  assert.equal(parseAnchor(null), null);
  assert.equal(parseAnchor("# Changelog\n\nno sections\n"), null);
  const note = "# Changelog\n\n## v1.8.0 — 2026-07-20\n\n## v1.6.0 — 2026-07-01\n";
  assert.equal(parseAnchor(note), "v1.8.0");
});

test("bucketOf maps message to a bucket, breaking wins over type", () => {
  assert.equal(bucketOf({ subject: "feat(x): add" }), "Features");
  assert.equal(bucketOf({ subject: "fix: bug" }), "Fixes");
  assert.equal(bucketOf({ subject: "ci: pin node" }), "Internal");
  assert.equal(bucketOf({ subject: "not conventional at all" }), "Internal");
  assert.equal(bucketOf({ subject: "feat(init)!: drop legacy" }), "Breaking");
  assert.equal(bucketOf({ subject: "feat: x", body: "BREAKING CHANGE: removed y" }), "Breaking");
});

test("linkSubject wikilinks an archived id token, leaves others plain", () => {
  const idx = {
    "add-frontmatter-titles": "2026-07-13-add-frontmatter-titles",
    "titles": "2026-07-13-titles",
  };
  assert.equal(
    linkSubject("feat(backfill): stamp titles (add-frontmatter-titles) (#12)", idx),
    "feat(backfill): stamp titles ([[changes/archive/2026-07-13-add-frontmatter-titles/proposal|add-frontmatter-titles]]) (#12)",
  );
  // longest id wins: the substring "titles" inside the longer id is not linked separately
  assert.equal(linkSubject("ci: auto-version main commits", idx), "ci: auto-version main commits");
});

test("renderSection groups in order, omits empty buckets", () => {
  const commits = [
    { subject: "feat: a" },
    { subject: "fix: b" },
    { subject: "chore: c" },
  ];
  const lines = renderSection("v1.0.0", "2026-07-03", commits);
  assert.deepEqual(lines, [
    "## v1.0.0 — 2026-07-03",
    "",
    "### Features",
    "",
    "- feat: a",
    "",
    "### Fixes",
    "",
    "- fix: b",
    "",
    "### Internal",
    "",
    "- chore: c",
  ]);
});

test("prependSection preserves head and existing sections byte-for-byte", () => {
  const existing =
    "---\ntype: changelog\n---\n\n# Changelog\n\n<!-- gen -->\n\n## v1.0.0 — 2026-07-01\n\n### Fixes\n\n- fix: old\n";
  const next = prependSection(existing, ["## v1.1.0 — 2026-07-05", "", "### Features", "", "- feat: new"]);
  assert.equal(
    next,
    "---\ntype: changelog\n---\n\n# Changelog\n\n<!-- gen -->\n\n## v1.1.0 — 2026-07-05\n\n### Features\n\n- feat: new\n\n## v1.0.0 — 2026-07-01\n\n### Fixes\n\n- fix: old\n",
  );
});

// --- changelog() integration -------------------------------------------------

test("first release bootstraps a full-history note (golden)", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "chore: scaffold", { date: "2026-07-01T12:00:00" });
  commit(root, "feat: add thing", { date: "2026-07-02T12:00:00" });
  commit(root, "fix: bug", { date: "2026-07-03T12:00:00" });
  tag(root, "v1.0.0");

  const res = changelog(root, { release: "v1.0.0" });
  assert.equal(res.written, true);
  assert.equal(
    read(root),
    EMPTY_NOTE.replace(/\s+$/, "\n") +
      "\n## v1.0.0 — 2026-07-03\n\n### Features\n\n- feat: add thing\n\n### Fixes\n\n- fix: bug\n\n### Internal\n\n- chore: scaffold\n",
  );
});

test("subsequent release covers the gap and preserves the anchor section", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "feat: base", { date: "2026-07-01T12:00:00" });
  tag(root, "v1.0.0");
  changelog(root, { release: "v1.0.0" });
  const anchorSection = read(root);
  assert.match(anchorSection, /## v1\.0\.0 — 2026-07-01/);

  commit(root, "fix: later", { date: "2026-07-05T12:00:00" });
  tag(root, "v1.1.0");
  changelog(root, { release: "v1.1.0" });
  const note = read(root);

  // v1.1.0 prepended above v1.0.0; v1.0.0 section byte-preserved.
  assert.match(note, /## v1\.1\.0 — 2026-07-05\n\n### Fixes\n\n- fix: later\n\n## v1\.0\.0/);
  assert.ok(note.indexOf("## v1.1.0") < note.indexOf("## v1.0.0"));
  assert.ok(note.endsWith("\n"));
  // v1.1.0 section (up to the next heading) excludes the base commit (belongs to v1.0.0).
  const v11 = note.slice(note.indexOf("## v1.1.0"), note.indexOf("## v1.0.0"));
  assert.ok(!v11.includes("feat: base"));
});

test("intermediate tags are subsumed as entries, not headings", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "feat: base", { date: "2026-07-01T12:00:00" });
  tag(root, "v1.0.0");
  changelog(root, { release: "v1.0.0" });

  commit(root, "fix: mid", { date: "2026-07-02T12:00:00" });
  tag(root, "v1.0.1");
  commit(root, "feat: top", { date: "2026-07-03T12:00:00" });
  tag(root, "v1.1.0");

  changelog(root, { release: "v1.1.0" });
  const note = read(root);
  assert.match(note, /- fix: mid/);
  assert.match(note, /- feat: top/);
  assert.ok(!note.includes("## v1.0.1")); // intermediate tag never a heading
});

test("breaking marker outranks feat; body BREAKING CHANGE also breaks", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "feat(init)!: drop legacy layout", { date: "2026-07-01T12:00:00" });
  tag(root, "v2.0.0");
  changelog(root, { release: "v2.0.0" });
  const note = read(root);
  assert.match(note, /### Breaking\n\n- feat\(init\)!: drop legacy layout/);
  assert.ok(!/### Features/.test(note));
});

test("subject naming an archived change is wikilinked; infra stays plain", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "openspec", "changes", "archive", "2026-07-13-add-frontmatter-titles"), {
    recursive: true,
  });
  commit(root, "feat(backfill): stamp titles (add-frontmatter-titles) (#12)", { date: "2026-07-01T12:00:00" });
  commit(root, "ci: auto-version main commits", { date: "2026-07-02T12:00:00" });
  tag(root, "v1.0.0");
  changelog(root, { release: "v1.0.0" });
  const note = read(root);
  assert.match(
    note,
    /\[\[changes\/archive\/2026-07-13-add-frontmatter-titles\/proposal\|add-frontmatter-titles\]\]/,
  );
  assert.match(note, /- ci: auto-version main commits\n/); // no wikilink
});

test("re-run for the recorded release is a no-op", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "feat: x", { date: "2026-07-01T12:00:00" });
  tag(root, "v1.0.0");
  changelog(root, { release: "v1.0.0" });
  const before = read(root);
  const res = changelog(root, { release: "v1.0.0" });
  assert.equal(res.written, false);
  assert.equal(read(root), before);
});

test("dry-run prints the section and writes nothing", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "feat: x", { date: "2026-07-01T12:00:00" });
  tag(root, "v1.0.0");
  const res = changelog(root, { release: "v1.0.0", dryRun: true });
  assert.equal(res.written, false);
  assert.match(res.section, /## v1\.0\.0 — 2026-07-01/);
  assert.ok(!fs.existsSync(path.join(root, "openspec", "changelog.md")));
});

test("unknown release tag throws ChangelogError naming the tag", (t) => {
  const root = mkGitRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  commit(root, "feat: x", { date: "2026-07-01T12:00:00" });
  tag(root, "v1.0.0");
  assert.throws(() => changelog(root, { release: "v9.9.9" }), (err) => {
    assert.ok(err instanceof ChangelogError);
    assert.match(err.message, /v9\.9\.9/);
    return true;
  });
});

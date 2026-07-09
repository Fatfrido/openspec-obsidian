// Tests for lib/archive.mjs: OpenSpec delta-sync + change-archive script.
// Each case builds an isolated mini-repo (openspec/ tree only) under the OS temp
// dir and exercises real observable behavior — files written/moved on disk,
// thrown ArchiveErrors — never internal call plumbing.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  ArchiveError,
  parseBlocks,
  parseDelta,
  parseSpec,
  applyOps,
  syncChange,
  moveChange,
  taskState,
  archive,
  check,
} from "../lib/archive.mjs";

// --- fixture helpers -----------------------------------------------------

function mkRepoRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-"));
  fs.mkdirSync(path.join(root, "openspec", "changes"), { recursive: true });
  fs.mkdirSync(path.join(root, "openspec", "specs"), { recursive: true });
  return root;
}

function writeFile(root, relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const TASKS_COMPLETE = `# Tasks

- [x] Step one
- [x] Step two
`;

const TASKS_INCOMPLETE = `# Tasks

- [x] Step one
- [ ] Step two
`;

// ==========================================================================
// 1. All-ADDED delta, new capability
// ==========================================================================

test("1. all-ADDED delta creates a fresh main spec and archives the change", async (t) => {
  const root = mkRepoRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const id = "add-widgets";
  const cap = "widgets";
  const WHY_PARAGRAPH =
    "Widgets currently have nowhere to live in the UI, so players cannot interact with them directly during a run.";

  const BLOCK_1 = `### Requirement: Widgets render within their bounds
Each widget SHALL render entirely within its assigned bounding box.

#### Scenario: Widget stays inside its box
- **WHEN** a widget is drawn on screen
- **THEN** its pixels remain within the bounding box`;

  const BLOCK_2 = `### Requirement: Widget count is tracked
The system SHALL track the total number of active widgets.

#### Scenario: Count increments on add
- **WHEN** a widget is added to the scene
- **THEN** the tracked widget count increases by one`;

  writeFile(root, `openspec/changes/${id}/tasks.md`, TASKS_COMPLETE);
  writeFile(
    root,
    `openspec/changes/${id}/proposal.md`,
    `---
type: proposal
change: ${id}
tags: [openspec, type/proposal, capability/${cap}]
---

## Why

${WHY_PARAGRAPH}

## What Changes

- Adds widget rendering and count tracking.
`,
  );
  writeFile(
    root,
    `openspec/changes/${id}/specs/${cap}/spec.md`,
    `---
type: delta
op: added
capability: ${cap}
---

## ADDED Requirements

${BLOCK_1}

${BLOCK_2}
`,
  );

  const date = today();
  archive(root);

  const mainSpecPath = path.join(root, "openspec", "specs", cap, "spec.md");
  assert.ok(fs.existsSync(mainSpecPath), "main spec was created");

  const expected = `---
type: spec
capability: ${cap}
tags: [openspec, type/spec, capability/${cap}]
aliases: ["${cap} spec"]
---

# ${cap} Specification

## Purpose

${WHY_PARAGRAPH}

## Requirements

${BLOCK_1}

${BLOCK_2}
`;
  assert.equal(fs.readFileSync(mainSpecPath, "utf8"), expected);

  assert.ok(
    !fs.existsSync(path.join(root, "openspec", "changes", id)),
    "source change dir no longer exists",
  );
  assert.ok(
    fs.existsSync(path.join(root, "openspec", "changes", "archive", `${date}-${id}`)),
    "change dir moved into the dated archive",
  );
});

// ==========================================================================
// 2. ADDED into an existing main spec + idempotency
// ==========================================================================

test("2. ADDED appends to an existing main spec and re-sync is a no-op", async (t) => {
  const root = mkRepoRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const id = "add-gadget-boost";
  const cap = "gadgets";

  const PERSIST_BLOCK = `### Requirement: Gadgets persist across frames
A gadget SHALL retain its state across frames once created.

#### Scenario: Gadget state persists
- **WHEN** a gadget is created
- **THEN** its state persists on the next frame`;

  const BOOST_BLOCK = `### Requirement: Gadgets can be boosted
A gadget SHALL support a boosted state that increases its effect magnitude.

#### Scenario: Boost increases magnitude
- **WHEN** a gadget receives a boost
- **THEN** its effect magnitude increases`;

  const mainSpecPath = path.join(root, "openspec", "specs", cap, "spec.md");
  writeFile(
    root,
    `openspec/specs/${cap}/spec.md`,
    `---
type: spec
capability: ${cap}
tags: [openspec, type/spec, capability/${cap}]
aliases: ["${cap} spec"]
---

# ${cap} Specification

## Purpose

Gadgets are simple interactive props scattered around the venue.

## Requirements

${PERSIST_BLOCK}
`,
  );
  writeFile(
    root,
    `openspec/changes/${id}/specs/${cap}/spec.md`,
    `---
type: delta
op: added
capability: ${cap}
---

## ADDED Requirements

${BOOST_BLOCK}
`,
  );

  const synced1 = syncChange(root, id);
  assert.ok(synced1.includes(cap), "syncChange reports the synced capability");

  const afterFirst = fs.readFileSync(mainSpecPath, "utf8");
  const expected = `---
type: spec
capability: ${cap}
tags: [openspec, type/spec, capability/${cap}]
aliases: ["${cap} spec"]
---

# ${cap} Specification

## Purpose

Gadgets are simple interactive props scattered around the venue.

## Requirements

${PERSIST_BLOCK}

${BOOST_BLOCK}
`;
  assert.equal(afterFirst, expected, "new block appended after the existing one");

  syncChange(root, id);
  const afterSecond = fs.readFileSync(mainSpecPath, "utf8");
  assert.equal(afterSecond, afterFirst, "re-running the sync is byte-identical (idempotent)");
});

// ==========================================================================
// 3. MODIFIED whole-block replacement + missing-heading error
// ==========================================================================

test("3. MODIFIED replaces the whole block; missing heading is a hard error", async (t) => {
  await t.test("a: replaces the entire matching block, siblings untouched", () => {
    const specText = `---
type: spec
capability: things
tags: [openspec, type/spec, capability/things]
aliases: ["things spec"]
---

# things Specification

## Purpose

Things do stuff.

## Requirements

### Requirement: Alpha requirement
Alpha description original.

#### Scenario: Alpha original scenario
- **WHEN** alpha condition
- **THEN** alpha result

### Requirement: Beta requirement
Beta description original.

#### Scenario: Beta original scenario
- **WHEN** beta condition
- **THEN** beta result
`;

    const deltaText = `---
type: delta
op: modified
capability: things
---

## MODIFIED Requirements

### Requirement: Beta requirement
Beta description CHANGED entirely — now covers a new edge case.

#### Scenario: Beta new scenario
- **WHEN** a different beta condition holds
- **THEN** a different beta result occurs
`;

    const { blocks } = parseSpec(specText);
    const sections = parseDelta(deltaText);
    applyOps(blocks, sections, "things-change/things");

    assert.equal(blocks.length, 2, "no block was added or removed");

    assert.equal(blocks[0].heading, "Alpha requirement");
    assert.ok(
      blocks[0].text.includes("Alpha description original."),
      "sibling block left intact",
    );

    assert.equal(blocks[1].heading, "Beta requirement");
    assert.ok(blocks[1].text.includes("Beta description CHANGED entirely"));
    assert.ok(blocks[1].text.includes("Beta new scenario"));
    assert.ok(
      !blocks[1].text.includes("Beta description original."),
      "old block content fully replaced, not merged",
    );
  });

  await t.test("b: applyOps throws when the MODIFIED heading is absent", () => {
    const blocks = parseBlocks(
      "### Requirement: Alpha requirement\nAlpha text.".split("\n"),
    );
    const sections = parseDelta(`## MODIFIED Requirements

### Requirement: Nonexistent requirement
Some text.
`);

    assert.throws(
      () => applyOps(blocks, sections, "things-change/things"),
      (err) => {
        assert.ok(err instanceof ArchiveError);
        assert.match(err.message, /MODIFIED requirement not found/);
        assert.match(err.message, /Nonexistent requirement/);
        return true;
      },
    );
  });

  await t.test("c: archive() throws ArchiveError (not process.exit) and archives nothing", () => {
    const root = mkRepoRoot();
    try {
      const id = "modify-ghost";
      const cap = "things2";

      writeFile(
        root,
        `openspec/specs/${cap}/spec.md`,
        `---
type: spec
capability: ${cap}
tags: [openspec, type/spec, capability/${cap}]
aliases: ["${cap} spec"]
---

# ${cap} Specification

## Purpose

Things2 do stuff too.

## Requirements

### Requirement: Alpha requirement
Alpha description original.

#### Scenario: Alpha original scenario
- **WHEN** alpha condition
- **THEN** alpha result
`,
      );
      writeFile(root, `openspec/changes/${id}/tasks.md`, TASKS_COMPLETE);
      writeFile(
        root,
        `openspec/changes/${id}/specs/${cap}/spec.md`,
        `---
type: delta
op: modified
capability: ${cap}
---

## MODIFIED Requirements

### Requirement: Ghost requirement
This requirement does not exist in the main spec.

#### Scenario: Ghost scenario
- **WHEN** ghost condition
- **THEN** ghost result
`,
      );

      assert.throws(
        () => archive(root),
        (err) => {
          assert.ok(err instanceof ArchiveError, "archive() throws ArchiveError, never process.exit");
          assert.match(err.message, /MODIFIED requirement not found/);
          return true;
        },
      );

      assert.ok(
        fs.existsSync(path.join(root, "openspec", "changes", id)),
        "change dir left in place: sync runs (and fails) before any move",
      );
      assert.ok(
        !fs.existsSync(path.join(root, "openspec", "changes", "archive")),
        "no archive dir was ever created",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// ==========================================================================
// 4. REMOVED + RENAMED
// ==========================================================================

test("4. REMOVED deletes a block and RENAMED rewrites a heading; both error when absent", async (t) => {
  await t.test("REMOVED deletes the matching block, RENAMED rewrites a sibling heading", () => {
    const region = `### Requirement: Alpha behavior
Alpha description.

#### Scenario: Alpha works
- **WHEN** alpha triggered
- **THEN** alpha behaves

### Requirement: Beta behavior
Beta description.

#### Scenario: Beta works
- **WHEN** beta triggered
- **THEN** beta behaves

### Requirement: Gamma behavior
Gamma description.

#### Scenario: Gamma works
- **WHEN** gamma triggered
- **THEN** gamma behaves`;

    const blocks = parseBlocks(region.split("\n"));
    assert.equal(blocks.length, 3);

    const deltaText = `## REMOVED Requirements

### Requirement: Beta behavior
(removed for this test)

## RENAMED Requirements

- FROM: \`### Requirement: Alpha behavior\`
- TO: \`### Requirement: Alpha behavior v2\`
`;
    const sections = parseDelta(deltaText);
    applyOps(blocks, sections, "rename-change/things");

    assert.equal(blocks.length, 2, "Beta behavior was removed");
    assert.equal(
      blocks.find((b) => b.heading === "Beta behavior"),
      undefined,
    );

    assert.equal(blocks[0].heading, "Alpha behavior v2", "heading field renamed");
    assert.equal(
      blocks[0].lines[0],
      "### Requirement: Alpha behavior v2",
      "requirement header line rewritten",
    );
    assert.ok(
      blocks[0].text.startsWith("### Requirement: Alpha behavior v2"),
      "text recomposed with new heading",
    );
    assert.ok(blocks[0].text.includes("Alpha description."), "body content preserved");

    assert.equal(blocks[1].heading, "Gamma behavior", "sibling untouched");
    assert.ok(blocks[1].text.includes("Gamma description."));
  });

  await t.test("REMOVED throws when the target heading is absent", () => {
    const blocks = parseBlocks("### Requirement: Something\nBody text.".split("\n"));
    const sections = parseDelta(`## REMOVED Requirements

### Requirement: Nonexistent behavior
Body.
`);

    assert.throws(
      () => applyOps(blocks, sections, "rename-change/things"),
      (err) => {
        assert.ok(err instanceof ArchiveError);
        assert.match(err.message, /REMOVED requirement not found/);
        assert.match(err.message, /Nonexistent behavior/);
        return true;
      },
    );
  });

  await t.test("RENAMED throws when the FROM heading is absent", () => {
    const blocks = parseBlocks("### Requirement: Something\nBody text.".split("\n"));
    const sections = parseDelta(`## RENAMED Requirements

- FROM: \`### Requirement: Nonexistent behavior\`
- TO: \`### Requirement: New name\`
`);

    assert.throws(
      () => applyOps(blocks, sections, "rename-change/things"),
      (err) => {
        assert.ok(err instanceof ArchiveError);
        assert.match(err.message, /RENAMED requirement not found/);
        assert.match(err.message, /Nonexistent behavior/);
        return true;
      },
    );
  });
});

// ==========================================================================
// 5. Incomplete tasks -> skipped
// ==========================================================================

test("5. a change with an unchecked task is skipped entirely", async (t) => {
  const root = mkRepoRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const id = "add-half-baked";
  const cap = "halfbaked";
  const date = today();

  writeFile(root, `openspec/changes/${id}/tasks.md`, TASKS_INCOMPLETE);
  writeFile(
    root,
    `openspec/changes/${id}/specs/${cap}/spec.md`,
    `---
type: delta
op: added
capability: ${cap}
---

## ADDED Requirements

### Requirement: Halfbaked thing exists
The system SHALL have a halfbaked thing.

#### Scenario: It exists
- **WHEN** the system starts
- **THEN** the halfbaked thing is present
`,
  );

  const stateBefore = taskState(root, id);
  assert.deepEqual(stateBefore, { complete: false, reason: "1 incomplete tasks" });

  archive(root);

  assert.ok(
    fs.existsSync(path.join(root, "openspec", "changes", id)),
    "change dir left in place",
  );
  assert.ok(
    !fs.existsSync(path.join(root, "openspec", "changes", "archive", `${date}-${id}`)),
    "no archive dir created for the incomplete change",
  );
  assert.ok(
    !fs.existsSync(path.join(root, "openspec", "specs", cap, "spec.md")),
    "no main spec written for the skipped capability",
  );
});

// ==========================================================================
// 6. Archive target already exists -> error, source untouched
// ==========================================================================

test("6. an existing archive target aborts the move and leaves the source alone", async (t) => {
  const root = mkRepoRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const id = "add-conflict";
  const date = today();

  writeFile(root, `openspec/changes/${id}/tasks.md`, TASKS_COMPLETE);
  writeFile(
    root,
    `openspec/changes/archive/${date}-${id}/dummy.txt`,
    "existing archive content\n",
  );

  assert.throws(
    () => moveChange(root, id, date),
    (err) => {
      assert.ok(err instanceof ArchiveError);
      assert.match(err.message, /archive target exists/);
      return true;
    },
  );

  assert.ok(
    fs.existsSync(path.join(root, "openspec", "changes", id)),
    "source change dir still exists",
  );
  assert.equal(
    fs.readFileSync(
      path.join(root, "openspec", "changes", "archive", `${date}-${id}`, "dummy.txt"),
      "utf8",
    ),
    "existing archive content\n",
    "pre-existing archive target left untouched",
  );
});

// ==========================================================================
// 7. Wikilink rewrite + resolution
// ==========================================================================

test("7. archiving rewrites intra-change wikilinks and they resolve after the move", async (t) => {
  const root = mkRepoRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const id = "add-linked-thing";
  const cap = "linkything";
  const date = today();

  writeFile(root, `openspec/changes/${id}/tasks.md`, TASKS_COMPLETE);
  writeFile(
    root,
    `openspec/changes/${id}/proposal.md`,
    `---
type: proposal
change: ${id}
tags: [openspec, type/proposal, capability/${cap}]
design: "[[changes/${id}/design|${id} design]]"
tasks: "[[changes/${id}/tasks|${id} tasks]]"
specs: ["[[changes/${id}/specs/${cap}/spec|${id} ${cap} delta]]"]
---

## Why

Linked things need a proposal to justify their existence in this fixture.

## What Changes

- Adds the ${cap} capability.
`,
  );
  writeFile(root, `openspec/changes/${id}/design.md`, "# Design\n\nSome design notes.\n");
  writeFile(
    root,
    `openspec/changes/${id}/specs/${cap}/spec.md`,
    `---
type: delta
op: added
capability: ${cap}
---

## ADDED Requirements

### Requirement: Linked thing exists
The system SHALL have a linked thing.

#### Scenario: It exists
- **WHEN** the system starts
- **THEN** the linked thing is present
`,
  );

  archive(root);

  const dest = path.join(root, "openspec", "changes", "archive", `${date}-${id}`);
  assert.ok(fs.existsSync(dest), "change dir moved into the dated archive");

  const proposalAfter = fs.readFileSync(path.join(dest, "proposal.md"), "utf8");
  const newPrefix = `changes/archive/${date}-${id}/`;
  const oldPrefix = `changes/${id}/`;

  assert.ok(proposalAfter.includes(`${newPrefix}design`), "design link carries the new prefix");
  assert.ok(proposalAfter.includes(`${newPrefix}tasks`), "tasks link carries the new prefix");
  assert.ok(
    proposalAfter.includes(`${newPrefix}specs/${cap}/spec`),
    "specs link carries the new prefix",
  );
  assert.ok(!proposalAfter.includes(oldPrefix), "no reference to the old change path remains");

  // Every rewritten link target must resolve, which is exactly what moveChange's
  // internal wikilink check verifies before returning (it would have thrown
  // ArchiveError otherwise, and archive() would not have completed).
  assert.ok(fs.existsSync(path.join(dest, "design.md")));
  assert.ok(fs.existsSync(path.join(dest, "tasks.md")));
  assert.ok(fs.existsSync(path.join(dest, "specs", cap, "spec.md")));
});

// ==========================================================================
// 8. --check gate: complete-but-unarchived changes fail CI
// ==========================================================================

test("8. check() fails on complete unarchived changes and passes otherwise", async (t) => {
  await t.test("a: a complete unarchived change throws with its id in the message", () => {
    const root = mkRepoRoot();
    try {
      writeFile(root, "openspec/changes/add-done-thing/tasks.md", TASKS_COMPLETE);

      assert.throws(
        () => check(root),
        (err) => {
          assert.ok(err instanceof ArchiveError);
          assert.match(err.message, /complete change\(s\) not archived/);
          assert.match(err.message, /add-done-thing/);
          assert.match(err.message, /openspec-obsidian archive/);
          return true;
        },
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("b: a change with open tasks passes the check", () => {
    const root = mkRepoRoot();
    try {
      writeFile(root, "openspec/changes/add-half-thing/tasks.md", TASKS_INCOMPLETE);
      check(root); // must not throw
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("c: a repo without a changes dir passes the check", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-nochanges-"));
    try {
      check(root); // must not throw
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("d: archived entries are ignored even with complete tasks", () => {
    const root = mkRepoRoot();
    try {
      writeFile(
        root,
        `openspec/changes/archive/${today()}-add-old-thing/tasks.md`,
        TASKS_COMPLETE,
      );
      check(root); // must not throw
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

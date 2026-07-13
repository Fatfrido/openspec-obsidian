// Read optional-feature toggles from the tool-owned openspec/obsidian.yaml.
// Zero-dependency hand-rolled parser (no YAML library): a top-level `features:`
// header followed by indented `name: true|false` entries. Absent file, absent
// features: key, or an unlisted name means disabled; unknown names are kept but
// harmless; any other line under features: is a hard error. Exported for tests.

import fs from "node:fs";
import path from "node:path";

export class FeaturesError extends Error {}

const CONFIG_REL = "openspec/obsidian.yaml";
const ENTRY = /^\s+([A-Za-z0-9_-]+):\s*(true|false)\s*$/;

// Parse the features: map from openspec/obsidian.yaml into { name: boolean }.
// Throws FeaturesError (naming the file) on a malformed entry under features:.
export function readFeatures(root = process.cwd()) {
  const configPath = path.join(root, ...CONFIG_REL.split("/"));
  if (!fs.existsSync(configPath)) return {};

  const lines = fs.readFileSync(configPath, "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => /^features:\s*$/.test(l));
  if (start === -1) return {};

  const features = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || /^\s*#/.test(line)) continue; // blank / comment
    if (!/^\s/.test(line)) break; // dedented: features: block ended
    const m = ENTRY.exec(line);
    if (!m) {
      throw new FeaturesError(
        `ERROR: malformed features entry in ${CONFIG_REL}: ${line.trim()} \u2014 expected 'name: true|false'`,
      );
    }
    features[m[1]] = m[2] === "true";
  }
  return features;
}

// True only when the named feature is present and set to true.
export function featureEnabled(root, name) {
  return readFeatures(root)[name] === true;
}

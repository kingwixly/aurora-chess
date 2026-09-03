#!/usr/bin/env node
/**
 * Keep emoji out of the interface.
 *
 * Emoji are drawn by the platform's own font, so the same glyph looks
 * different on every device and reads as informal next to everything else.
 * Unicode has proper blocks for chess figurines, geometric shapes and symbols
 * that render consistently.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

const problems = [];
for (const root of ["apps/web/src", "apps/admin/src", "packages/ui/src", "packages/chess/src"]) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      if (EMOJI.test(line)) problems.push(`${file}:${i + 1}  ${line.trim().slice(0, 60)}`);
    });
  }
}

for (const p of problems) console.error("EMOJI", p);
if (problems.length) {
  console.error(`\n${problems.length} line(s) contain emoji. Use Unicode symbols instead.`);
  process.exit(1);
}
console.log("No emoji in the interface.");

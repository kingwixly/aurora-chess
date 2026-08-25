#!/usr/bin/env node
/**
 * Catch duplicate fields and dangling relations in the Prisma schema.
 *
 * `prisma validate` does this properly, but it needs an engine binary this
 * sandbox cannot download — so the error surfaced only at Docker build time,
 * twice, after a push. This catches the same class of mistake locally.
 *
 * The specific failure it was written for: interrupted edits left `emailTokens`
 * and `supportTickets` declared three times on `User`, two of them with
 * @relation names that had no counterpart on the other model.
 */
import { readFileSync } from "node:fs";

const src = readFileSync("apps/api/prisma/schema.prisma", "utf8");
const problems = [];

// ── Duplicate field names within a model ──
const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
const relationNames = new Map(); // name -> [{model, field}]

for (const m of src.matchAll(modelRe)) {
  const [, model, body] = m;
  const seen = new Map();

  for (const line of body.split("\n")) {
    const f = line.match(/^\s{2}(\w+)\s+([\w\[\]?]+)/);
    if (!f) continue;
    const [, field] = f;
    if (seen.has(field)) {
      problems.push(`${model}.${field} is declared more than once`);
    }
    seen.set(field, line);

    const rel = line.match(/@relation\("([^"]+)"/);
    if (rel) {
      const name = rel[1];
      if (!relationNames.has(name)) relationNames.set(name, []);
      relationNames.get(name).push(`${model}.${field}`);
    }
  }
}

// ── Named relations need exactly two sides ──
for (const [name, sides] of relationNames) {
  if (sides.length !== 2) {
    problems.push(
      `@relation("${name}") has ${sides.length} side(s): ${sides.join(", ")} — a named relation needs exactly two`
    );
  }
}

// ── Every referenced model must exist ──
const declared = new Set([...src.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1]));
const enums = new Set([...src.matchAll(/^enum\s+(\w+)/gm)].map((m) => m[1]));
const scalars = new Set([
  "String", "Int", "Float", "Boolean", "DateTime", "Json", "Bytes", "Decimal", "BigInt",
]);

for (const m of src.matchAll(modelRe)) {
  const [, model, body] = m;
  for (const line of body.split("\n")) {
    const f = line.match(/^\s{2}\w+\s+(\w+)(\[\])?\??/);
    if (!f) continue;
    const type = f[1];
    if (scalars.has(type) || declared.has(type) || enums.has(type)) continue;
    problems.push(`${model} references unknown type "${type}"`);
  }
}

for (const p of problems) console.error("SCHEMA", p);
if (problems.length) {
  console.error(`\n${problems.length} schema problem(s).`);
  process.exit(1);
}
console.log(`Schema: ${declared.size} models, no duplicate fields or dangling relations.`);

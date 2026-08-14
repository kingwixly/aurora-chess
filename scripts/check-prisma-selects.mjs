#!/usr/bin/env node
/**
 * Cross-check Prisma `select` blocks against schema.prisma.
 *
 * Motivation: apps/api cannot be typechecked without a generated Prisma client,
 * so a select naming a column that no longer exists compiles fine and throws at
 * runtime. That is exactly how a dropped `activeFlair` column took down every
 * /auth/me call — and with it the entire session system — while every other
 * check passed.
 *
 * Only top-level fields of each select are checked; nested blocks belong to a
 * relation and resolving those would mean walking the relation graph.
 *
 * Run: node scripts/check-prisma-selects.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const schema = readFileSync("apps/api/prisma/schema.prisma", "utf8");

const models = new Map();
for (const m of schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) {
  const fields = new Set();
  for (const raw of m[2].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("@@") || line.startsWith("///")) continue;
    const f = line.match(/^(\w+)\s+\S/);
    if (f) fields.add(f[1]);
  }
  models.set(m[1], fields);
}

/** Text of the brace-balanced block starting at `open` (index of `{`). */
function block(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return "";
}

/** Top-level `key: true` entries, ignoring anything inside nested braces. */
function topLevel(body) {
  const out = [];
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (depth === 0) {
      const m = /^(\w+)\s*:\s*true/.exec(body.slice(i));
      if (m && (i === 0 || /[\s,{]/.test(body[i - 1]))) {
        out.push(m[1]);
        i += m[0].length - 1;
      }
    }
  }
  return out;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const problems = [];

/**
 * Shared select constants, e.g. `export const TITLE_SELECT = { ... } as const`.
 *
 * These are spread into selects, so their fields never appear inline in a
 * prisma call and would otherwise be invisible to this check — which is
 * precisely where the activeFlair bug hid.
 */
const SHARED_SELECTS = [
  { file: "apps/api/src/lib/titles.ts", name: "TITLE_SELECT", model: "User" },
  { file: "apps/api/src/lib/titles.ts", name: "PUBLIC_USER_SELECT", model: "User" },
];

for (const { file, name, model } of SHARED_SELECTS) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    problems.push(`${file}  missing, but referenced by the select check`);
    continue;
  }
  const decl = src.indexOf(`const ${name} =`);
  if (decl === -1) {
    problems.push(`${file}  ${name} not found`);
    continue;
  }
  const open = src.indexOf("{", decl);
  const fields = models.get(model);
  for (const f of topLevel(block(src, open))) {
    if (!fields.has(f)) {
      const line = src.slice(0, decl).split("\n").length;
      problems.push(`${file}:${line}  ${name} selects ${model}.${f}, not in the schema`);
    }
  }
}

for (const file of walk("apps/api/src")) {
  const src = readFileSync(file, "utf8");
  const callRe = /prisma\.(\w+)\.(?:findUnique|findFirst|findMany|update|create|upsert)\(/g;
  let call;
  while ((call = callRe.exec(src))) {
    const model = call[1][0].toUpperCase() + call[1].slice(1);
    const fields = models.get(model);
    if (!fields) continue;

    const argOpen = src.indexOf("{", call.index + call[0].length - 1);
    if (argOpen === -1) continue;
    const args = block(src, argOpen);

    // Find `select:` at the top level of the argument object only.
    let depth = 0;
    let selBody = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "{") depth++;
      else if (args[i] === "}") depth--;
      else if (depth === 0 && args.startsWith("select:", i)) {
        const o = args.indexOf("{", i);
        if (o !== -1) selBody = block(args, o);
        break;
      }
    }
    if (!selBody) continue;

    for (const f of topLevel(selBody)) {
      if (!fields.has(f)) {
        const line = src.slice(0, call.index).split("\n").length;
        problems.push(`${file}:${line}  ${model}.${f} is not in the schema`);
      }
    }
  }
}

for (const p of [...new Set(problems)].sort()) console.error("MISMATCH", p);
if (problems.length) {
  console.error(`\n${new Set(problems).size} select(s) reference fields that do not exist.`);
  process.exit(1);
}
console.log(`Checked ${models.size} models — every Prisma select matches the schema.`);

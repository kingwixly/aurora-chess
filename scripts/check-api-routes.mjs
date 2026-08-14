#!/usr/bin/env node
/**
 * Cross-check every client API call against the routes the server defines.
 *
 * Motivation: a spelling sweep renamed the client's analysis call from
 * `/analyze` to `/analysis` without touching the route, and server-side
 * analysis was silently broken from then on. Nothing caught it — the client
 * compiled, the server compiled, and the failure only appeared as a 404 when
 * somebody clicked the button.
 *
 * Run: node scripts/check-api-routes.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, exts, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => p.endsWith(x)) && !p.includes(".test.")) out.push(p);
  }
  return out;
}

// Routes the server defines. Fastify instances get renamed inside plugins
// (`app`, `authed`, `v1`), so any identifier followed by a verb counts.
const defined = new Set();
for (const file of walk("apps/api/src/routes", [".ts"])) {
  const src = readFileSync(file, "utf8");

  // Walk each `<instance>.<verb>(` call and take the FIRST quoted path that
  // follows it, tracking bracket depth so a generic parameter cannot swallow
  // the path and a coarse fallback cannot invent one.
  //
  // Precision matters here: a checker that collects every quoted string would
  // have reported success on the exact bug this exists to catch, because the
  // path was present in the file under a different verb.
  const call = /\b\w+\.(get|post|patch|put|delete)\s*[<(]/g;
  let m;
  while ((m = call.exec(src))) {
    const verb = m[1].toUpperCase();
    const path = src.slice(m.index, m.index + 1200).match(/["'`](\/[^"'`\s]*)["'`]/);
    if (path) defined.add(`${verb} ${path[1]}`);
  }
}

/** A route pattern with `:params` as a matcher against a concrete path. */
function matches(pattern, path) {
  const re = new RegExp("^" + pattern.replace(/:[\w]+/g, "[^/]+").replace(/\/$/, "") + "/?$");
  return re.test(path.replace(/\/$/, ""));
}

const problems = [];
for (const file of walk("apps/web/src", [".ts", ".tsx"])) {
  const src = readFileSync(file, "utf8");
  const re = /api\.(get|post|patch|put|delete)\s*[<(][^)]*?["'`]\/api\/v1([^"'`?]*)/g;
  let m;
  while ((m = re.exec(src))) {
    const verb = m[1].toUpperCase();
    // Template params become a placeholder segment.
    const path = m[2].replace(/\$\{[^}]+\}/g, "PARAM");
    const ok = [...defined].some(
      (d) => d.startsWith(verb + " ") && matches(d.slice(verb.length + 1), path)
    );
    if (!ok) problems.push(`${file}: ${verb} /api/v1${m[2]}`);
  }
}

for (const p of [...new Set(problems)].sort()) console.error("NO ROUTE", p);
if (problems.length) {
  console.error(`\n${new Set(problems).size} client call(s) have no matching server route.`);
  process.exit(1);
}
console.log(`Checked client calls against ${defined.size} server routes — all match.`);

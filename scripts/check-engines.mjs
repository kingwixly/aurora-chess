#!/usr/bin/env node
/**
 * Every catalogued engine must actually be on disk.
 *
 * A wrong worker path does not throw. The Worker is constructed, the fetch
 * 404s, no message ever arrives, and the board sits at "Loading engine"
 * forever — which is exactly the failure this project already shipped once.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync("packages/chess/src/analysis/engines.ts", "utf8");
const problems = [];
let checked = 0;

// Each entry's worker path, paired with whether it claims to be bundled.
const entries = src.matchAll(
  /worker:\s*"([^"]+)"[\s\S]{0,400}?available:\s*(true|false)/g
);

for (const [, worker, available] of entries) {
  checked++;
  if (available !== "true") continue;
  // A worker path may carry a query string - the adapter uses one to choose
  // which build to load. Strip it before looking on disk.
  const [workerPath, query] = worker.split("?");
  const onDisk = join("apps/web/public", workerPath);
  if (!existsSync(onDisk)) {
    problems.push(`${worker} is marked available but ${onDisk} does not exist`);
    continue;
  }

  // For an adapter, the build it names has to exist too - otherwise the
  // adapter loads fine and then fails on an import nobody checked.
  if (query) {
    const engineName = new URLSearchParams(query).get("engine");
    const target = join("apps/web/public/engines", `${engineName}.js`);
    if (!existsSync(target)) {
      problems.push(`${worker} points at ${engineName}, which is not on disk`);
      continue;
    }
    if (!existsSync(target.replace(/\.js$/, ".wasm"))) {
      problems.push(`${engineName} has no matching .wasm alongside it`);
    }
    continue;
  }

  // A worker without its wasm loads and then fails on first use.
  const wasm = onDisk.replace(/\.js$/, ".wasm");
  if (!existsSync(wasm)) {
    problems.push(`${worker} has no matching .wasm alongside it`);
  }
}

for (const p of problems) console.error("ENGINE", p);
if (problems.length) {
  console.error(`\n${problems.length} engine problem(s).`);
  process.exit(1);
}
console.log(`Engines: ${checked} catalogued, every available one is on disk.`);

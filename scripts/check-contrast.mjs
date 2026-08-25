#!/usr/bin/env node
/**
 * Fail the build on unreadable text.
 *
 * Written after four separate rounds of "the bot page text is unreadable",
 * each of which I tried to fix by eye and got wrong. The failure is not
 * visible in review because a class string like
 * `bg-aurora-cyan/20 text-night-950` reads as dark-on-light and renders as
 * dark-on-dark — the /20 makes it a faint tint over a dark page.
 *
 * Contrast is arithmetic. It should not be a judgement call.
 *
 * Run: node scripts/check-contrast.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PALETTE = {
  "night-950": "#05070E", "night-900": "#0A0F1C", "night-800": "#111a2e",
  "night-700": "#1b2740", "night-600": "#2a3a5c", "night-500": "#4d6289",
  "night-400": "#8296b8", "night-300": "#b6c4da", "night-200": "#d5dfef",
  white: "#ffffff", black: "#000000", "aurora-cyan": "#18C0D8",
};

/** The page background everything sits on unless told otherwise. */
const PAGE = "#05070E";
/** WCAG AA for body text. */
const MIN_RATIO = 4.5;

const luminance = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const blend = (fg, bg, alpha) => {
  const parse = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const [f, b] = [parse(fg), parse(bg)];
  return "#" + f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha))
    .toString(16).padStart(2, "0")).join("");
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") && !p.includes(".test.")) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of walk("apps/web/src")) {
  // The standing pages are a light theme with their own palette.
  if (file.includes("/standing/")) continue;
  const src = readFileSync(file, "utf8");

  // Each quoted class string is evaluated on its own, because that is what a
  // single branch of a conditional actually renders as.
  for (const m of src.matchAll(/"([^"]*(?:bg-|text-)[^"]*)"/g)) {
    const cls = m.group ?? m[1];
    const text = /text-(night-\d{3}|white|black|aurora-cyan)(?:\/(\d+))?/.exec(cls);
    if (!text) continue;
    let fg = PALETTE[text[1]];
    if (!fg) continue;
    if (text[2]) fg = blend(fg, PAGE, Number(text[2]) / 100);

    const bgm = /bg-(night-\d{3}|white|aurora-cyan)(?:\/(\d+))?/.exec(cls);
    let bg = bgm ? (PALETTE[bgm[1]] ?? PAGE) : PAGE;
    if (bgm?.[2]) bg = blend(bg, PAGE, Number(bgm[2]) / 100);

    // An element can inherit its background from a parent this checker cannot
    // see. Those are marked `contrast-ok` at the point they apply, so the
    // exception is visible in review rather than hidden in a config list.
    const before = src.slice(Math.max(0, m.index - 200), m.index);
    if (before.includes("contrast-ok")) continue;

    const r = ratio(fg, bg);
    if (r < MIN_RATIO) {
      const line = src.slice(0, m.index).split("\n").length;
      problems.push(`${file}:${line}  ${r.toFixed(2)}:1  ${cls.slice(0, 70)}`);
    }
  }
}

for (const p of problems) console.error("LOW CONTRAST", p);
if (problems.length) {
  console.error(`\n${problems.length} text/background pairs below ${MIN_RATIO}:1.`);
  process.exit(1);
}
console.log("Contrast: every text/background pair meets WCAG AA.");

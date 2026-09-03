"use client";

import { availableEngines, type EngineSpec } from "@aurora/chess";

/**
 * Choosing an engine.
 *
 * A dropdown of names and sizes does not help anyone decide: the difference
 * that matters is not "7MB versus 1MB" but "this one loads instantly on an old
 * phone" and "this one is the only one that plays Chess960". So each option
 * states what it is actually for.
 *
 * Only bundled engines appear. An engine we do not ship would download nothing,
 * fall back silently, and leave the player believing they had chosen something.
 */

const STRENGTH_LABEL: Record<string, string> = {
  weak: "Beginner",
  club: "Club level",
  strong: "Very strong",
  superhuman: "Stronger than any human",
};

export default function EnginePicker({
  purpose,
  value,
  onChange,
}: {
  purpose: "play" | "analyse";
  value: string;
  onChange: (id: string) => void;
}) {
  const engines = availableEngines(purpose);

  return (
    <ul className="space-y-2">
      {engines.map((eng) => (
        <li key={eng.id}>
          <button
            type="button"
            onClick={() => onChange(eng.id)}
            aria-pressed={value === eng.id}
            className={`w-full rounded-lg p-3 text-left transition-colors ${
              value === eng.id
                ? "bg-aurora-cyan/15 ring-1 ring-inset ring-aurora-cyan"
                : "bg-night-800 ring-1 ring-inset ring-night-700 hover:bg-night-700"
            }`}
          >
            <span className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-night-200">{eng.name}</span>
              <span className="shrink-0 font-mono text-xs text-night-400">
                {eng.sizeMb}MB download
              </span>
            </span>

            <span className="mt-1 block text-xs leading-relaxed text-night-400">
              {eng.description}
            </span>

            <span className="mt-1.5 flex flex-wrap gap-1">
              <Tag>{STRENGTH_LABEL[eng.strength] ?? eng.strength}</Tag>
              {eng.variants && eng.variants.length > 0 && <Tag>{eng.variants.length} variants</Tag>}
              {!eng.canAnalyse && <Tag>play only</Tag>}
            </span>
          </button>
        </li>
      ))}

      {engines.length === 0 && (
        <li className="rounded-lg bg-night-800 p-3 text-xs text-night-400">
          No engines are available for this.
        </li>
      )}
    </ul>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-night-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-night-400">
      {children}
    </span>
  );
}

export type { EngineSpec };

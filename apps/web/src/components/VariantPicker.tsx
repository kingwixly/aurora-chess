"use client";

import { PLAYABLE_VARIANTS, VARIANTS, type Variant } from "@aurora/chess";

/**
 * Choosing a variant.
 *
 * Each option states its rule and how you win, because "Atomic" tells someone
 * who has not played it nothing at all, and a variant you do not understand is
 * a game you lose in six moves without learning why.
 *
 * Standard is first and selected by default. The rest are a deliberate detour.
 */
export default function VariantPicker({
  value,
  onChange,
}: {
  value: Variant;
  onChange: (v: Variant) => void;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {PLAYABLE_VARIANTS.map((id) => {
        const info = VARIANTS[id];
        const selected = value === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={selected}
              className={`h-full w-full rounded-lg p-3 text-left transition-colors ${
                selected
                  ? "bg-aurora-cyan/15 ring-1 ring-inset ring-aurora-cyan"
                  : "bg-night-800 ring-1 ring-inset ring-night-700 hover:bg-night-700"
              }`}
            >
              <span className="block text-sm font-medium text-night-200">{info.name}</span>
              <span className="mt-1 block text-xs leading-relaxed text-night-400">{info.rule}</span>
              {id !== "STANDARD" && (
                <span className="mt-1.5 block text-xs text-aurora-cyan">{info.winsBy}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

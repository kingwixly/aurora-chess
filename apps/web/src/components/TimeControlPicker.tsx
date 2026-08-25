"use client";

import { useState, useEffect } from "react";
import { TIME_CONTROL_PRESETS, type TimeControl } from "@aurora/chess";

interface TimeControlPickerProps {
  selectedTime: string | null;
  showCustomTime: boolean;
  customMinutes: number;
  customIncrement: number;
  onSelect: (presetKey: string) => void;
  onSelectCustom: (minutes: number, increment: number) => void;
  onCustomMinutesChange: (v: number) => void;
  onCustomIncrementChange: (v: number) => void;
  disabled?: boolean;
}

interface CategoryGroup {
  key: TimeControl;
  label: string;
  presets: { key: string; label: string }[];
}

const CATEGORY_ORDER: TimeControl[] = ["BULLET", "BLITZ", "RAPID", "CLASSICAL"];
const CATEGORY_LABELS: Record<TimeControl, string> = {
  BULLET: "Bullet",
  BLITZ: "Blitz",
  RAPID: "Rapid",
  CLASSICAL: "Classical",
  UNLIMITED: "Unlimited",
};

const CATEGORIES: CategoryGroup[] = CATEGORY_ORDER.map((cat) => ({
  key: cat,
  label: CATEGORY_LABELS[cat],
  presets: Object.entries(TIME_CONTROL_PRESETS)
    .filter(([, p]) => p.timeControl === cat)
    .map(([key, p]) => ({ key, label: p.label })),
}));

function findCategory(presetKey: string): TimeControl | null {
  const preset = TIME_CONTROL_PRESETS[presetKey];
  if (!preset || preset.timeControl === "UNLIMITED") return null;
  return preset.timeControl;
}

export default function TimeControlPicker({
  selectedTime,
  showCustomTime,
  customMinutes,
  customIncrement,
  onSelect,
  onSelectCustom,
  onCustomMinutesChange,
  onCustomIncrementChange,
  disabled,
}: TimeControlPickerProps) {
  const [expanded, setExpanded] = useState<TimeControl | null>(null);

  // Auto-expand the category containing the selected preset
  useEffect(() => {
    if (selectedTime && !showCustomTime) {
      const cat = findCategory(selectedTime);
      if (cat) setExpanded(cat);
    }
  }, []);

  function toggleCategory(cat: TimeControl) {
    setExpanded((prev) => (prev === cat ? null : cat));
  }

  const isUnlimited = selectedTime === "unlimited" && !showCustomTime;
  const isCustom = showCustomTime;

  return (
    <div className="bg-night-900 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-night-400 mb-3">Time Control</h2>
      <div className="space-y-1">
        {CATEGORIES.map((cat) => {
          const isOpen = expanded === cat.key;
          const hasSelected =
            !showCustomTime && !!selectedTime && findCategory(selectedTime) === cat.key;

          return (
            <div key={cat.key}>
              <button
                onClick={() => toggleCategory(cat.key)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${hasSelected ? "bg-aurora-cyan/20 text-night-200" : "bg-night-800 hover:bg-night-700 text-night-200"} disabled:opacity-50`}
              >
                <span className="flex items-center gap-2">
                  {cat.label}
                  {hasSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-aurora-cyan text-night-950" />
                  )}
                </span>
                <svg
                  className={`w-4 h-4 text-night-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-20 mt-1" : "max-h-0"}`}
              >
                <div className="flex gap-2 px-2 pb-1">
                  {cat.presets.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => onSelect(p.key)}
                      disabled={disabled}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!showCustomTime && selectedTime === p.key ? "bg-aurora-cyan  text-night-950" : "bg-night-800 hover:bg-night-700 text-night-200"} disabled:opacity-50`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* No Time Limit */}
        <button
          onClick={() => onSelect("unlimited")}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-lg text-sm font-medium text-left transition-colors ${isUnlimited ? "bg-aurora-cyan  text-night-950" : "bg-night-800 hover:bg-night-700 text-night-200"} disabled:opacity-50`}
        >
          No Time Limit
        </button>

        {/* Custom */}
        <div
          className={`rounded-lg px-4 py-3 transition-colors ${isCustom ? "bg-aurora-cyan/20 text-night-200" : "bg-night-800 text-night-200"}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-night-300 shrink-0">Custom</span>
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
              <input
                type="number"
                min={0}
                max={180}
                value={customMinutes}
                onChange={(e) => onCustomMinutesChange(parseInt(e.target.value) || 0)}
                disabled={disabled}
                aria-label="Minutes"
                className="w-14 px-1.5 py-1 bg-night-800 border border-night-600 rounded-lg text-sm text-center disabled:opacity-50"
              />
              <span className="text-xs text-night-400">min</span>
              <input
                type="number"
                min={0}
                max={60}
                value={customIncrement}
                onChange={(e) => onCustomIncrementChange(parseInt(e.target.value) || 0)}
                disabled={disabled}
                aria-label="Increment in seconds"
                className="w-14 px-1.5 py-1 bg-night-800 border border-night-600 rounded-lg text-sm text-center disabled:opacity-50"
              />
              <span className="text-xs text-night-400">sec</span>
            </div>
            <button
              onClick={() => onSelectCustom(customMinutes, customIncrement)}
              disabled={disabled}
              className="px-4 py-1.5 bg-aurora-cyan hover:bg-[#3ad2e8] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors shrink-0 text-night-950"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

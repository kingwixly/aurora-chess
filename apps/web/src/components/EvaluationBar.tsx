"use client";

interface EvaluationBarProps {
  evalCP: number | null;
  mate: number | null;
}

function cpToPercent(cp: number): number {
  // Sigmoid-ish: maps centipawns to 0-100 white percentage
  // At 0cp → 50%, at +400cp → ~90%, at -400cp → ~10%
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.005 * clamped)) - 1);
}

function formatScore(cp: number | null, mate: number | null): string {
  if (mate !== null) {
    return mate > 0 ? `M${mate}` : `M${mate}`;
  }
  if (cp === null) return "0.0";
  const score = cp / 100;
  return score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
}

/**
 * Renders a vertical evaluation bar that visualizes the engine score as a
 * white-vs-black fill ratio, with a numeric score label.
 *
 * @param props - {@link EvaluationBarProps}
 * @returns A narrow vertical bar showing the positional advantage.
 */
export default function EvaluationBar({ evalCP, mate }: EvaluationBarProps) {
  let whitePercent: number;
  if (mate !== null) {
    whitePercent = mate > 0 ? 100 : 0;
  } else {
    whitePercent = cpToPercent(evalCP ?? 0);
  }

  const score = formatScore(evalCP, mate);
  const isWhiteBetter = mate !== null ? mate > 0 : (evalCP ?? 0) >= 0;

  return (
    <div className="relative w-6 h-full rounded overflow-hidden bg-gray-800 flex flex-col-reverse">
      {/* White fill from bottom */}
      <div
        className="bg-white transition-all duration-300 ease-out w-full"
        style={{ height: `${whitePercent}%` }}
      />
      {/* Black fill is the remainder */}
      <div className="bg-gray-900 w-full flex-1" />
      {/* Score label */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-bold px-0.5 ${
          isWhiteBetter ? "bottom-1 text-gray-900" : "top-1 text-gray-200"
        }`}
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {score}
      </div>
    </div>
  );
}

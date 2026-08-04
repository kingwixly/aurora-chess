"use client";

export interface StreakBadgeProps {
  current: { type: "win" | "loss" | "none"; count: number };
  bestWin: number;
}

/**
 * Displays the player's current streak (win or loss) and their
 * all-time best win streak as a compact badge card.
 */
export default function StreakBadge({ current, bestWin }: StreakBadgeProps) {
  const streakColor =
    current.type === "win"
      ? "text-green-400"
      : current.type === "loss"
        ? "text-red-400"
        : "text-gray-400";
  const streakLabel =
    current.type === "win"
      ? `${current.count} win streak`
      : current.type === "loss"
        ? `${current.count} loss streak`
        : "No active streak";

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Streaks</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-lg font-bold ${streakColor}`}>{streakLabel}</div>
          <div className="text-xs text-gray-500">Current</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-yellow-400">{bestWin}</div>
          <div className="text-xs text-gray-500">Best Win Streak</div>
        </div>
      </div>
    </div>
  );
}

"use client";

export interface AccuracyCardProps {
  average: number | null;
  best: { value: number; gameId: string } | null;
  worst: { value: number; gameId: string } | null;
  gamesAnalysed: number;
}

/**
 * Displays the player's move accuracy statistics including average,
 * best, and worst accuracy values across analysed games.
 */
export default function AccuracyCard({ average, best, worst, gamesAnalysed }: AccuracyCardProps) {
  if (gamesAnalysed === 0) {
    return (
      <div className="bg-night-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-night-300 mb-2">Accuracy</h3>
        <p className="text-night-500 text-sm">No analysed games yet</p>
      </div>
    );
  }

  return (
    <div className="bg-night-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-night-300 mb-3">Accuracy</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-aurora-cyan font-display">{average}%</div>
          <div className="text-xs text-night-500">Average</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-400 font-display">{best?.value}%</div>
          <div className="text-xs text-night-500">Best</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400 font-display">{worst?.value}%</div>
          <div className="text-xs text-night-500">Worst</div>
        </div>
      </div>
      <div className="text-xs text-night-500 text-center mt-2">{gamesAnalysed} games analysed</div>
    </div>
  );
}

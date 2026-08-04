"use client";

export interface AccuracyCardProps {
  average: number | null;
  best: { value: number; gameId: string } | null;
  worst: { value: number; gameId: string } | null;
  gamesAnalyzed: number;
}

/**
 * Displays the player's move accuracy statistics including average,
 * best, and worst accuracy values across analyzed games.
 */
export default function AccuracyCard({ average, best, worst, gamesAnalyzed }: AccuracyCardProps) {
  if (gamesAnalyzed === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Accuracy</h3>
        <p className="text-gray-500 text-sm">No analyzed games yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Accuracy</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-400">{average}%</div>
          <div className="text-xs text-gray-500">Average</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-400">{best?.value}%</div>
          <div className="text-xs text-gray-500">Best</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400">{worst?.value}%</div>
          <div className="text-xs text-gray-500">Worst</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center mt-2">{gamesAnalyzed} games analyzed</div>
    </div>
  );
}

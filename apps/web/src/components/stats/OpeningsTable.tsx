"use client";

export interface OpeningEntry {
  name: string;
  eco: string;
  wins: number;
  losses: number;
  draws: number;
  count: number;
}

export interface OpeningsTableProps {
  openings: OpeningEntry[];
}

/**
 * Renders a table of the player's most-played openings with ECO codes,
 * game counts, and win-rate percentages.
 */
export default function OpeningsTable({ openings }: OpeningsTableProps) {
  if (openings.length === 0) {
    return <p className="text-gray-500 text-sm">No opening data yet</p>;
  }
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Openings</h3>
      <div className="space-y-2">
        {openings.map((o) => {
          const total = o.count;
          const winRate = total > 0 ? Math.round((o.wins / total) * 100) : 0;
          return (
            <div key={o.eco} className="flex items-center justify-between text-sm">
              <div className="min-w-0 flex-1">
                <span className="text-gray-400 font-mono text-xs mr-2">{o.eco}</span>
                <span className="text-gray-200 truncate">{o.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-gray-400 text-xs">{total} games</span>
                <span
                  className={`text-xs font-medium ${winRate >= 50 ? "text-green-400" : "text-red-400"}`}
                >
                  {winRate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

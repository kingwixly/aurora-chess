"use client";

export interface RecordBarProps {
  label: string;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Renders a horizontal stacked bar showing win/draw/loss distribution
 * for a given record category (overall, vs humans, vs bots).
 */
export default function RecordBar({ label, wins, losses, draws }: RecordBarProps) {
  const total = wins + losses + draws;
  if (total === 0) {
    return (
      <div className="text-sm">
        <span className="text-gray-400">{label}:</span>{" "}
        <span className="text-gray-500">No games</span>
      </div>
    );
  }
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400 text-xs">
          <span className="text-green-400">{wins}W</span>{" "}
          <span className="text-gray-400">{draws}D</span>{" "}
          <span className="text-red-400">{losses}L</span>
        </span>
      </div>
      <div className="flex h-3 rounded overflow-hidden bg-gray-700">
        {wPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${wPct}%` }} />}
        {dPct > 0 && <div className="bg-gray-500 transition-all" style={{ width: `${dPct}%` }} />}
        {lPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${lPct}%` }} />}
      </div>
    </div>
  );
}

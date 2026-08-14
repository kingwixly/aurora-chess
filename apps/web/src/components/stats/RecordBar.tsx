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
        <span className="text-night-400">{label}:</span>{" "}
        <span className="text-night-500">No games</span>
      </div>
    );
  }
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-night-300 font-medium">{label}</span>
        <span className="text-night-400 text-xs">
          <span className="text-emerald-400">{wins}W</span>{" "}
          <span className="text-night-400">{draws}D</span>{" "}
          <span className="text-red-400">{losses}L</span>
        </span>
      </div>
      <div className="flex h-3 rounded overflow-hidden bg-night-800">
        {wPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${wPct}%` }} />}
        {dPct > 0 && <div className="bg-night-600 transition-all" style={{ width: `${dPct}%` }} />}
        {lPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${lPct}%` }} />}
      </div>
    </div>
  );
}

"use client";

import { DEFAULT_RATING, isEstablished } from "@aurora/chess";

export interface PoolRating {
  timeControl: string;
  rating: number;
  peak: number;
  games: number;
  deviation?: number;
}

const ORDER = ["BULLET", "BLITZ", "RAPID", "CLASSICAL"] as const;
const LABELS: Record<string, string> = {
  BULLET: "Bullet",
  BLITZ: "Blitz",
  RAPID: "Rapid",
  CLASSICAL: "Classical",
  UNLIMITED: "Correspondence",
};

/**
 * A player's rating in each time control, with their peak.
 *
 * Unplayed pools show the starting figure greyed rather than being hidden: an
 * absent pool reads as "this site does not have bullet", which is worse than an
 * honest "you have not played any".
 *
 * A rating whose deviation is still wide is marked provisional. Presenting an
 * unsettled number as if it were established is how a player who has played
 * four games ends up believing they are 1900.
 */
export default function RatingPools({
  ratings,
  className = "",
}: {
  ratings?: PoolRating[];
  className?: string;
}) {
  const byPool = new Map((ratings ?? []).map((r) => [r.timeControl, r]));

  return (
    <dl
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-night-700 sm:grid-cols-4 ${className}`}
    >
      {ORDER.map((pool) => {
        const r = byPool.get(pool);
        const played = (r?.games ?? 0) > 0;
        // Falls back to the shared constant rather than a literal - this was
        // hardcoded to the old Elo centre and kept showing 1200 after the move
        // to Glicko-2.
        const rating = r?.rating ?? DEFAULT_RATING;
        const peak = r?.peak ?? DEFAULT_RATING;
        const provisional =
          played && r?.deviation !== undefined
            ? !isEstablished({ rating, deviation: r.deviation, volatility: 0.06 })
            : played;

        return (
          <div key={pool} className="bg-night-900 px-4 py-3">
            <dt className="text-xs uppercase tracking-wider text-night-400">{LABELS[pool]}</dt>
            <dd
              className={`mt-1 font-mono text-2xl font-bold tracking-tight ${
                played ? "text-white" : "text-night-400"
              }`}
            >
              {rating}
              {provisional && (
                <span
                  title="Provisional - not enough games for a settled rating"
                  className="ml-0.5 align-super text-xs font-normal text-night-400"
                >
                  ?
                </span>
              )}
            </dd>
            <dd className="mt-0.5 text-xs text-night-400">
              {played ? (
                <>
                  peak <span className="font-mono text-night-400">{peak}</span> &middot; {r!.games}{" "}
                  {r!.games === 1 ? "game" : "games"}
                </>
              ) : (
                "unplayed"
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * How many games one person may have running at once.
 *
 * Playing several games at a time is normal on a chess site, but unlimited
 * concurrency is how one person ties up every opponent in a small pool and how
 * a script starts a thousand games in a minute. The limit exists for the
 * second reason more than the first.
 *
 * Correspondence games are exempt because they are not a real-time commitment —
 * having twenty of those running is a hobby, not a load problem.
 */

/** Real-time games an ordinary account may have at once. */
export const CONCURRENT_LIMIT = 5;

/**
 * Titled players are exempt.
 *
 * Simultaneous exhibitions are a normal thing for a titled player to run, and
 * the limit would make that impossible. A verified title is also a strong
 * enough signal of good faith to trust with it.
 */
export function concurrentLimitFor(opts: { title?: string | null; isTitled?: boolean }): number {
  return opts.isTitled || opts.title ? Number.POSITIVE_INFINITY : CONCURRENT_LIMIT;
}

/** Time controls that do not count toward the concurrency limit. */
export const UNLIMITED_TIME_CONTROLS = ["CORRESPONDENCE", "UNLIMITED", "DAILY"];

export function countsTowardLimit(timeControl: string): boolean {
  return !UNLIMITED_TIME_CONTROLS.includes(timeControl.toUpperCase());
}

export type ChallengeDecision =
  | { allowed: true }
  | { allowed: false; reason: "at-limit"; limit: number; current: number }
  | { allowed: false; reason: "already-playing-them" };

/**
 * May this person accept another game right now?
 *
 * Separated from the route so the rule can be tested without a database, and
 * so the client can apply the same rule to decide whether to offer "play now"
 * or only "queue after this one".
 */
export function canAcceptChallenge(opts: {
  activeRealtimeGames: number;
  isTitled?: boolean;
  title?: string | null;
  alreadyPlayingOpponent?: boolean;
}): ChallengeDecision {
  if (opts.alreadyPlayingOpponent) {
    // Two simultaneous games against the same person is almost always a
    // double-click rather than an intention.
    return { allowed: false, reason: "already-playing-them" };
  }

  const limit = concurrentLimitFor(opts);
  if (opts.activeRealtimeGames >= limit) {
    return { allowed: false, reason: "at-limit", limit, current: opts.activeRealtimeGames };
  }
  return { allowed: true };
}

export type ChallengeAction = "play-now" | "queue" | "decline";

/**
 * What to offer someone who has just been challenged.
 *
 * Mirrors the flow on the big sites: if you are free, you can start now; if you
 * are mid-game, you can queue it to begin when this one ends. Queuing is the
 * useful option — declining because you happen to be busy loses the game
 * entirely, and people rarely come back to re-challenge.
 */
export function actionsForChallenge(opts: {
  activeRealtimeGames: number;
  isTitled?: boolean;
  title?: string | null;
  alreadyPlayingOpponent?: boolean;
}): ChallengeAction[] {
  const decision = canAcceptChallenge(opts);
  if (decision.allowed) {
    return opts.activeRealtimeGames > 0
      ? ["play-now", "queue", "decline"]
      : ["play-now", "decline"];
  }
  if (decision.reason === "already-playing-them") return ["decline"];
  // At the limit: queuing is still fine, since it starts only when a slot frees.
  return ["queue", "decline"];
}

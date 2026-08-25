/**
 * Selectable engines.
 *
 * Aurora runs the engine in the player's own browser, which is what makes
 * unlimited analysis free — but it also means the player pays the download.
 * Stockfish full is roughly 7MB of WebAssembly, and forcing that on someone who
 * wanted a quick game against a 600-rated bot is a poor trade.
 *
 * So the engine is a choice, with the cost stated up front.
 */

export type EngineId = "stockfish-17-lite" | "stockfish-17" | "lc0-maia" | "weiss" | "worstfish";

export interface EngineSpec {
  id: EngineId;
  name: string;
  /** What it is good for, in plain terms. */
  description: string;
  /** Approximate download, in megabytes. */
  sizeMb: number;
  /** Rough playing strength, for ordering rather than precision. */
  strength: "weak" | "club" | "strong" | "superhuman";
  /**
   * Whether this engine can produce evaluations for the analysis board.
   *
   * Not all of them can. Maia predicts likely human moves rather than best
   * ones, which makes it a good sparring partner and a poor analyst — and
   * offering it for analysis would give people confidently wrong numbers.
   */
  canAnalyse: boolean;
  /** Whether it can drive a bot game. */
  canPlay: boolean;
  /** Worker path, relative to the site root. */
  worker: string;
  /** Licence, since these ship to the player. */
  licence: string;
}

export const ENGINES: Record<EngineId, EngineSpec> = {
  "stockfish-17-lite": {
    id: "stockfish-17-lite",
    name: "Stockfish 17 Lite",
    description:
      "A smaller build of the strongest engine there is. Slightly weaker than the full version and a fraction of the download — the right default for almost everyone.",
    sizeMb: 6,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/stockfish-17-lite.js",
    licence: "GPL-3.0",
  },
  "stockfish-17": {
    id: "stockfish-17",
    name: "Stockfish 17",
    description:
      "The full build, with the large neural network. Stronger and slower to download. Worth it if you analyse a lot.",
    sizeMb: 75,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/stockfish-17.js",
    licence: "GPL-3.0",
  },
  "lc0-maia": {
    id: "lc0-maia",
    name: "Maia",
    description:
      "Trained to play like a human of a given rating rather than to play well. Its mistakes are the mistakes people actually make, which makes it far better practice than a weakened engine.",
    sizeMb: 12,
    strength: "club",
    // Maia predicts the likely human move, not the best one. Using it for
    // analysis would produce confident, wrong evaluations.
    canAnalyse: false,
    canPlay: true,
    worker: "/engines/lc0-maia.js",
    licence: "GPL-3.0",
  },
  weiss: {
    id: "weiss",
    name: "Weiss",
    description:
      "A small, fast classical engine. No neural network, so the download is tiny and it runs well on older machines.",
    sizeMb: 1,
    strength: "strong",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/weiss.js",
    licence: "GPL-3.0",
  },
  worstfish: {
    id: "worstfish",
    name: "WorstFish",
    description:
      "Finds the worst legal move in every position. Not a weak engine — an inverted one. Genuinely difficult to lose to.",
    sizeMb: 6,
    strength: "weak",
    canAnalyse: false,
    canPlay: true,
    worker: "/engines/stockfish-17-lite.js",
    licence: "GPL-3.0",
  },
};

/** The default: smallest download that is still strong enough for anything. */
export const DEFAULT_ENGINE: EngineId = "stockfish-17-lite";

export function enginesFor(purpose: "play" | "analyse"): EngineSpec[] {
  return Object.values(ENGINES)
    .filter((e) => (purpose === "analyse" ? e.canAnalyse : e.canPlay))
    .sort((a, b) => a.sizeMb - b.sizeMb);
}

/**
 * Whether an engine choice is usable for a purpose.
 *
 * Checked rather than assumed, because a stored preference can outlive the
 * reason it was valid — someone who picked Maia for play should not silently
 * get it on the analysis board.
 */
export function isEngineValidFor(id: string, purpose: "play" | "analyse"): boolean {
  const spec = ENGINES[id as EngineId];
  if (!spec) return false;
  return purpose === "analyse" ? spec.canAnalyse : spec.canPlay;
}

/** Falls back to the default when a stored choice does not fit. */
export function resolveEngine(
  id: string | null | undefined,
  purpose: "play" | "analyse"
): EngineId {
  return id && isEngineValidFor(id, purpose) ? (id as EngineId) : DEFAULT_ENGINE;
}

/**
 * Selectable engines.
 *
 * Aurora runs the engine in the player's own browser, which is what makes
 * unlimited analysis free - but it also means the player pays the download.
 * Stockfish full is roughly 7MB of WebAssembly, and forcing that on someone who
 * wanted a quick game against a 600-rated bot is a poor trade.
 *
 * So the engine is a choice, with the cost stated up front.
 */

export type EngineId = "stockfish-18" | "stockfish-17" | "lc0-maia" | "weiss";

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
   * ones, which makes it a good sparring partner and a poor analyst - and
   * offering it for analysis would give people confidently wrong numbers.
   */
  canAnalyse: boolean;
  /** Whether it can drive a bot game. */
  canPlay: boolean;
  /** Worker path, relative to the site root. */
  worker: string;
  /**
   * Whether the build is actually bundled.
   *
   * Offering an engine we do not ship means the player picks it, waits, and
   * silently gets something else. Unavailable engines are listed with their
   * status rather than hidden, so the choice is honest either way.
   */
  available: boolean;
  /** Licence, since these ship to the player. */
  licence: string;
}

export const ENGINES: Record<EngineId, EngineSpec> = {
  "stockfish-18": {
    id: "stockfish-18",
    name: "Stockfish 18",
    description:
      "The strongest engine there is. Runs entirely in your browser, which is what makes unlimited analysis free - you pay the download once and it is cached after that.",
    sizeMb: 7,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/stockfish/stockfish.js",
    licence: "GPL-3.0",
    available: true,
  },
  "stockfish-17": {
    id: "stockfish-17",
    name: "Stockfish 17",
    description:
      "The previous release. Useful if you have compared analysis against it before and want the numbers to stay comparable.",
    sizeMb: 6,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/stockfish-17.js",
    licence: "GPL-3.0",
    available: false,
  },
  "lc0-maia": {
    id: "lc0-maia",
    name: "Maia",
    description:
      "Trained to play like a human of a given rating rather than to play well. Its mistakes are the ones people actually make, which makes it better practice than a weakened engine.",
    sizeMb: 12,
    strength: "club",
    canAnalyse: false,
    canPlay: true,
    worker: "/engines/lc0-maia.js",
    licence: "GPL-3.0",
    available: false,
  },
  weiss: {
    id: "weiss",
    name: "Weiss",
    description:
      "A small, fast classical engine with no neural network. Tiny download, and it runs well on older machines.",
    sizeMb: 1,
    strength: "strong",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/weiss.js",
    licence: "GPL-3.0",
    available: false,
  },
};

/** The default: smallest download that is still strong enough for anything. */
export const DEFAULT_ENGINE: EngineId = "stockfish-18";

export function enginesFor(purpose: "play" | "analyse"): EngineSpec[] {
  return (
    Object.values(ENGINES)
      .filter((e) => (purpose === "analyse" ? e.canAnalyse : e.canPlay))
      // Available first, then by download size.
      .sort((a, b) => Number(b.available) - Number(a.available) || a.sizeMb - b.sizeMb)
  );
}

/** Only the engines actually shipped. What a picker should offer. */
export function availableEngines(purpose: "play" | "analyse"): EngineSpec[] {
  return enginesFor(purpose).filter((e) => e.available);
}

/**
 * Whether an engine choice is usable for a purpose.
 *
 * Checked rather than assumed, because a stored preference can outlive the
 * reason it was valid - someone who picked Maia for play should not silently
 * get it on the analysis board.
 */
export function isEngineValidFor(id: string, purpose: "play" | "analyse"): boolean {
  const spec = ENGINES[id as EngineId];
  if (!spec) return false;
  // An unbundled engine is not a valid choice, whatever it claims to support.
  if (!spec.available) return false;
  return purpose === "analyse" ? spec.canAnalyse : spec.canPlay;
}

/** Falls back to the default when a stored choice does not fit. */
export function resolveEngine(
  id: string | null | undefined,
  purpose: "play" | "analyse"
): EngineId {
  return id && isEngineValidFor(id, purpose) ? (id as EngineId) : DEFAULT_ENGINE;
}

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

export type EngineId =
  | "stockfish-18-lite"
  | "stockfish-18-single"
  | "stockfish-classic"
  | "stockfish-16-7"
  | "fairy-sf14";

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
   * How the worker must be constructed.
   *
   * The classic Stockfish.js builds are plain scripts; the lila-stockfish-web
   * builds are ES modules and fail to load without `{ type: "module" }`. This
   * is not a detail the caller can guess, and getting it wrong produces a
   * worker that never sends a message rather than an error.
   */
  workerType?: "classic" | "module";
  /** Variants beyond standard chess, when the engine supports them. */
  variants?: string[];
  /**
   * Whether a player may pick this in settings.
   *
   * Special-purpose engines are chosen by the situation, not the person. They
   * still need to be catalogued so the loader can find them.
   */
  selectable?: boolean;
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
  "stockfish-18-lite": {
    id: "stockfish-18-lite",
    name: "Stockfish 18 Lite",
    description:
      "The strongest engine there is, in its smaller build. Uses multiple threads where the browser allows it. The right choice for almost everyone.",
    sizeMb: 7,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/stockfish-18-lite.js",
    licence: "GPL-3.0",
    available: true,
  },
  "stockfish-18-single": {
    id: "stockfish-18-single",
    name: "Stockfish 18 (single thread)",
    description:
      "The same engine without threading. Slower, but works in browsers and privacy modes that block SharedArrayBuffer - which is why it is here rather than as a fallback nobody can choose.",
    sizeMb: 7,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/stockfish-18-lite-single.js",
    licence: "GPL-3.0",
    available: true,
  },
  "stockfish-16-7": {
    id: "stockfish-16-7",
    name: "Stockfish 16.7",
    description:
      "A much smaller build from the Lichess project. Under half a megabyte, so it loads almost instantly and works well on older phones. Weaker than 18, but far stronger than any human.",
    sizeMb: 1,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/lila-adapter.js?engine=stockfish-16-7",
    workerType: "module",
    licence: "GPL-3.0",
    available: true,
  },
  /**
   * Not a choice. Selected automatically for variant games.
   *
   * Kept out of every picker via `selectable: false`: asking someone to pick
   * an engine that only matters for Atomic, and which is chosen for them the
   * moment they start an Atomic game, is a question with no useful answer.
   */
  "fairy-sf14": {
    id: "fairy-sf14",
    name: "Fairy-Stockfish 14",
    description: "Used automatically for variant games. Not offered as a general choice.",
    sizeMb: 1,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/engines/lila-adapter.js?engine=fairy-sf14",
    workerType: "module",
    variants: ["chess960", "crazyhouse", "atomic", "horde", "kingofthehill", "3check", "antichess"],
    licence: "GPL-3.0",
    available: true,
  },
  "stockfish-classic": {
    id: "stockfish-classic",
    name: "Stockfish (classic build)",
    description:
      "The build Aurora shipped originally. Kept so analysis you have already run stays comparable.",
    sizeMb: 7,
    strength: "superhuman",
    canAnalyse: true,
    canPlay: true,
    worker: "/stockfish/stockfish.js",
    licence: "GPL-3.0",
    available: true,
  },
};

/** The default: smallest download that is still strong enough for anything. */
export const DEFAULT_ENGINE: EngineId = "stockfish-18-lite";

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
  return enginesFor(purpose).filter((e) => e.available && e.selectable !== false);
}

/**
 * The engine to use for a game.
 *
 * Variants override the player's preference entirely, because only one engine
 * understands them - offering the choice and then ignoring it would be worse
 * than not offering it. Standard games use whatever they picked.
 */
export function engineForVariant(
  variant: string | null | undefined,
  preferred: string | null | undefined,
  purpose: "play" | "analyse" = "play"
): EngineId {
  const v = (variant ?? "STANDARD").toUpperCase();
  if (v !== "STANDARD" && v !== "CHESS960") {
    return "fairy-sf14";
  }
  return resolveEngine(preferred, purpose);
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

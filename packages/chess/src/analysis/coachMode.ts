import { bandFor, coachingText, type MoveQuality } from "./coaching";

/**
 * Coach mode: live feedback at a strength you choose.
 *
 * Builds on the existing coaching text rather than replacing it. What is new
 * here is the *strength dial*, and that is the point of the feature.
 *
 * A 3200 engine tells a 900-rated player their move gave up 0.4 pawns. True,
 * and useless - at that level games turn on hanging pieces, not on small
 * positional concessions. A coach set near your own rating flags what you can
 * act on and stays quiet about the rest.
 */

export const COACH_MIN = 600;
export const COACH_MAX = 3200;
export const COACH_DEFAULT = 1500;

export interface CoachPersona {
  id: string;
  name: string;
  /** How this coach talks, shown when picking one. */
  style: string;
  /** Where its dial starts. The player can move it. */
  suggestedStrength: number;
}

export const COACHES: CoachPersona[] = [
  {
    id: "patient",
    name: "Wren",
    style: "Encouraging. Says what you were going for before saying what went wrong.",
    suggestedStrength: 1000,
  },
  {
    id: "direct",
    name: "Halden",
    style: "Blunt and brief. The move, the reason, nothing more.",
    suggestedStrength: 1800,
  },
  {
    id: "analytical",
    name: "Sable",
    style: "Detailed. The line, the alternative, and the evaluation behind both.",
    suggestedStrength: 2400,
  },
];

/**
 * Centipawn loss below which the coach says nothing.
 *
 * Scaled to strength deliberately. Told about every 30-point inaccuracy, a
 * 700-rated player learns to ignore the coach - and a muted coach teaches
 * nothing at all. The same threshold at 2400 would hide the mistakes that
 * actually decide games there.
 */
export function noiseFloorFor(strength: number): number {
  if (strength < 1000) return 150;
  if (strength < 1400) return 100;
  if (strength < 1800) return 70;
  if (strength < 2200) return 45;
  return 25;
}

/**
 * Search depth for a coach of a given strength.
 *
 * A weak coach is not a strong engine kept quiet - it should genuinely miss
 * what a player at that level misses, so its advice is reachable rather than
 * oracular.
 */
export function depthForStrength(strength: number): number {
  if (strength < 1000) return 6;
  if (strength < 1400) return 8;
  if (strength < 1800) return 10;
  if (strength < 2200) return 13;
  if (strength < 2600) return 16;
  return 20;
}

export interface CoachNote {
  quality: MoveQuality;
  /** One line, in the chosen coach's voice. */
  message: string;
  /** The engine's move, when it differs and is worth naming. */
  betterMove: string | null;
  cpLoss: number;
}

/**
 * Feedback for a move, or null when it is unremarkable at this strength.
 *
 * Silence is a feature. A coach that comments on every move becomes noise, and
 * noise gets switched off.
 */
export function coachNote(opts: {
  cpLoss: number;
  strength: number;
  playedSan: string;
  bestSan: string | null;
  isBook: boolean;
  forced?: boolean;
  brilliant?: boolean;
  persona?: string;
}): CoachNote | null {
  const { cpLoss, strength, playedSan, bestSan, isBook, forced, brilliant } = opts;
  const persona = opts.persona ?? "direct";

  // Nothing to teach about a move that had no alternative.
  if (forced) return null;

  if (isBook) {
    return {
      quality: "book",
      message: voiced(persona, "book", playedSan, null),
      betterMove: null,
      cpLoss: 0,
    };
  }
  if (brilliant) {
    return {
      quality: "brilliant",
      message: voiced(persona, "brilliant", playedSan, null),
      betterMove: null,
      cpLoss,
    };
  }

  const floor = noiseFloorFor(strength);

  if (cpLoss < floor / 3) {
    return {
      quality: "best",
      message: voiced(persona, "best", playedSan, null),
      betterMove: null,
      cpLoss,
    };
  }
  if (cpLoss < floor) return null;

  const quality: MoveQuality =
    cpLoss >= floor * 4 ? "blunder" : cpLoss >= floor * 2 ? "mistake" : "inaccuracy";

  return {
    quality,
    message: voiced(persona, quality, playedSan, bestSan),
    betterMove: bestSan,
    cpLoss,
  };
}

function voiced(
  persona: string,
  quality: MoveQuality,
  played: string,
  better: string | null
): string {
  const alt = better ?? "something else";

  if (persona === "patient") {
    switch (quality) {
      case "book":
        return `${played} is theory - a well-known move here.`;
      case "best":
        return `${played} is the move. Nicely spotted.`;
      case "brilliant":
        return `${played} is brilliant. That takes nerve.`;
      case "inaccuracy":
        return `${played} is playable, though ${alt} keeps more of your edge.`;
      case "mistake":
        return `${played} gives something back. ${alt} was the one - worth seeing why.`;
      case "blunder":
        return `${played} costs material. ${alt} held it together.`;
      default:
        return coachingText(quality, 1000);
    }
  }
  if (persona === "analytical") {
    switch (quality) {
      case "book":
        return `${played} - book move, established theory.`;
      case "best":
        return `${played} is the engine's first choice.`;
      case "brilliant":
        return `${played} is a sound sacrifice; the compensation is real.`;
      case "inaccuracy":
        return `${played} concedes a little. ${alt} was more accurate.`;
      case "mistake":
        return `${played} is a mistake. ${alt} was correct, and the gap is significant.`;
      case "blunder":
        return `${played} is a blunder. ${alt} was necessary.`;
      default:
        return coachingText(quality, 2400);
    }
  }
  switch (quality) {
    case "book":
      return `${played}. Book.`;
    case "best":
      return `${played}. Best move.`;
    case "brilliant":
      return `${played}. Brilliant.`;
    case "inaccuracy":
      return `${played} is inaccurate. ${alt}.`;
    case "mistake":
      return `${played} is a mistake. ${alt}.`;
    case "blunder":
      return `${played} is a blunder. ${alt}.`;
    default:
      return coachingText(quality, 1800);
  }
}

/** Clamp a requested strength into the supported range. */
export function clampStrength(value: number): number {
  if (!Number.isFinite(value)) return COACH_DEFAULT;
  return Math.max(COACH_MIN, Math.min(COACH_MAX, Math.round(value)));
}

/** The coaching band a strength falls into, reusing the existing scale. */
export function bandForStrength(strength: number) {
  return bandFor(strength);
}

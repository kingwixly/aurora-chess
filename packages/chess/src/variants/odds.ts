import { Chess } from "chess.js";

/**
 * Odds - deliberate handicaps that make a lopsided pairing worth playing.
 *
 * A 900 against a 2100 is not a game; it is a formality. Odds turn it into one,
 * and they are the oldest fix in chess for exactly this problem.
 *
 * Two rules shape everything here:
 *
 * 1. **Odds are never applied without both players agreeing.** They are
 *    suggested, offered, and accepted. A game that silently starts with your
 *    queen missing is a bug report, not a feature.
 * 2. **Odds games do not affect rating.** A rating measures even play. Feeding
 *    handicap results into it corrupts the number for both players and makes
 *    the leaderboard meaningless - which is the whole reason the leaderboard
 *    excludes unsettled ratings in the first place.
 */

export type OddsKind =
  | "none"
  | "pawn-f7"
  | "pawn-and-move"
  | "knight"
  | "rook"
  | "queen"
  | "two-moves"
  | "three-moves"
  | "time-double"
  | "time-triple";

export interface OddsDefinition {
  kind: OddsKind;
  label: string;
  /** Shown when offering, so both sides know what they are agreeing to. */
  description: string;
  /**
   * Roughly how many rating points this is worth to the receiver.
   *
   * Approximate by nature - these are traditional figures, not measurements,
   * and they exist to order the suggestions sensibly rather than to be precise.
   */
  worth: number;
  /** Material odds remove a piece from the STRONGER player. */
  removes?: string;
}

export const ODDS: Record<OddsKind, OddsDefinition> = {
  none: { kind: "none", label: "No odds", description: "An even game.", worth: 0 },
  "pawn-f7": {
    kind: "pawn-f7",
    label: "Pawn",
    description: "The stronger player starts without their f-pawn.",
    worth: 200,
    removes: "f",
  },
  "pawn-and-move": {
    kind: "pawn-and-move",
    label: "Pawn and move",
    description: "The stronger player loses their f-pawn and plays black.",
    worth: 300,
    removes: "f",
  },
  knight: {
    kind: "knight",
    label: "Knight",
    description: "The stronger player starts without their queen's knight.",
    worth: 500,
    removes: "b",
  },
  rook: {
    kind: "rook",
    label: "Rook",
    description: "The stronger player starts without their queen's rook.",
    worth: 700,
    removes: "a",
  },
  queen: {
    kind: "queen",
    label: "Queen",
    description: "The stronger player starts without their queen.",
    worth: 1000,
    removes: "d",
  },
  "two-moves": {
    kind: "two-moves",
    label: "Two moves",
    description: "The weaker player makes two moves before the game begins.",
    worth: 300,
  },
  "three-moves": {
    kind: "three-moves",
    label: "Three moves",
    description: "The weaker player makes three moves before the game begins.",
    worth: 450,
  },
  "time-double": {
    kind: "time-double",
    label: "Double time",
    description: "The weaker player gets twice the clock.",
    worth: 250,
  },
  "time-triple": {
    kind: "time-triple",
    label: "Triple time",
    description: "The weaker player gets three times the clock.",
    worth: 400,
  },
};

/** Below this gap, odds are not suggested - the game is competitive already. */
export const ODDS_SUGGESTION_THRESHOLD = 500;

/**
 * Should odds be suggested, and which?
 *
 * Returns an ordered list, closest match first. Nothing is applied - this only
 * decides what to put in front of the two players.
 */
export function suggestOdds(strongerRating: number, weakerRating: number): OddsDefinition[] {
  const gap = strongerRating - weakerRating;
  if (gap < ODDS_SUGGESTION_THRESHOLD) return [];

  return Object.values(ODDS)
    .filter((o) => o.kind !== "none")
    .sort((a, b) => Math.abs(a.worth - gap) - Math.abs(b.worth - gap))
    .slice(0, 4);
}

/** Which side receives the handicap. */
export type OddsReceiver = "white" | "black";

/**
 * The starting position for a set of odds.
 *
 * Material odds remove a piece from the STRONGER player, who is the one not
 * receiving the handicap. Move odds and time odds leave the position alone -
 * those are applied by the clock and the move counter instead.
 *
 * Returns null for anything that does not change the starting position.
 */
export function fenForOdds(kind: OddsKind, receiver: OddsReceiver): string | null {
  const def = ODDS[kind];
  if (!def?.removes) return null;

  const chess = new Chess();
  // The handicap comes off the player who is NOT receiving it.
  const giver = receiver === "white" ? "black" : "white";
  const rank = giver === "white" ? "1" : "7";
  const pawnRank = giver === "white" ? "2" : "7";

  const file = def.removes;
  const square = kind.startsWith("pawn")
    ? `${file}${pawnRank}`
    : `${file}${giver === "white" ? "1" : "8"}`;

  chess.remove(square as never);

  // Removing a rook invalidates the castling right on that side, and a FEN
  // claiming a right the rook cannot exercise is rejected by strict parsers.
  let fen = chess.fen();
  if (kind === "rook") {
    const strip = giver === "white" ? "Q" : "q";
    const parts = fen.split(" ");
    parts[2] = parts[2].replace(strip, "") || "-";
    fen = parts.join(" ");
  }
  return fen;
}

/** Extra opening moves the receiver plays before the game starts. */
export function freeMovesForOdds(kind: OddsKind): number {
  if (kind === "two-moves") return 2;
  if (kind === "three-moves") return 3;
  return 0;
}

/** Clock multiplier for the receiver. */
export function timeMultiplierForOdds(kind: OddsKind): number {
  if (kind === "time-double") return 2;
  if (kind === "time-triple") return 3;
  return 1;
}

/**
 * Whether a game with these odds counts toward rating.
 *
 * Always false for real odds. A rating describes even play; results from a
 * handicap game describe the handicap.
 */
export function affectsRating(kind: OddsKind): boolean {
  return kind === "none";
}

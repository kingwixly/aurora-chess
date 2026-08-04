import { Chess } from "chess.js";
import type { GameResult, Termination } from "@eyeonchess/chess";

/**
 * Check if the chess position is a game-ending state and return the result.
 * @returns the result and termination, or null if the game continues
 */
export function detectGameEnd(
  chess: Chess
): { result: GameResult; termination: Termination } | null {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) {
    return {
      result: chess.turn() === "w" ? "BLACK_WIN" : "WHITE_WIN",
      termination: "CHECKMATE",
    };
  }
  return { result: "DRAW", termination: "AGREEMENT" };
}

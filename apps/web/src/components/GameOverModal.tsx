"use client";

import Link from "next/link";

export interface GameOverModalProps {
  gameOver: {
    result: string;
    termination: string;
    ratingChange: { white: number; black: number };
  };
  rematchIncoming: boolean;
  rematchOffered: boolean;
  onRematchOffer: () => void;
  onRematchAccept: () => void;
  onRematchDecline: () => void;
  onClose: () => void;
  resultLabel: string;
  /** Which side the viewer played, so the headline can address them. */
  playerColor?: "white" | "black" | null;
  /** Analysis link, when the game is on the server rather than local. */
  gameId?: string;
}

/**
 * Normalise a result to one of three values.
 *
 * The socket sends `WHITE_WIN`; some call sites and stored games use PGN
 * notation (`1-0`). Getting this wrong tells a winner they lost, so both are
 * accepted rather than assuming one.
 */
function normaliseResult(result: string): "white" | "black" | "draw" | null {
  const r = result.trim().toUpperCase();
  if (r === "WHITE_WIN" || r === "1-0") return "white";
  if (r === "BLACK_WIN" || r === "0-1") return "black";
  if (r === "DRAW" || r === "1/2-1/2" || r === "0.5-0.5") return "draw";
  return null;
}

/** How the game ended, in words rather than an enum. */
const TERMINATION_TEXT: Record<string, string> = {
  CHECKMATE: "by checkmate",
  RESIGNATION: "by resignation",
  TIMEOUT: "on time",
  STALEMATE: "by stalemate",
  AGREEMENT: "by agreement",
  INSUFFICIENT_MATERIAL: "insufficient material",
  THREEFOLD_REPETITION: "by repetition",
  FIFTY_MOVE_RULE: "by the fifty-move rule",
  ABANDONED: "abandoned",
};

/**
 * End-of-game dialog.
 *
 * Leads with the outcome from the viewer's point of view - "You won", not
 * "WHITE_WIN" - because that is the only thing anyone reads. The rating delta
 * is the second most important thing, so it is large and adjacent, and the
 * actions are ordered by what people actually do next: play again, look at what
 * went wrong, leave.
 */
export default function GameOverModal({
  gameOver,
  rematchIncoming,
  rematchOffered,
  onRematchOffer,
  onRematchAccept,
  onRematchDecline,
  onClose,
  resultLabel,
  playerColor,
  gameId,
}: GameOverModalProps) {
  const outcome = normaliseResult(gameOver.result);
  const isDraw = outcome === "draw";
  const won = !isDraw && outcome !== null && outcome === playerColor;

  const headline = !playerColor ? resultLabel : isDraw ? "Draw" : won ? "You won" : "You lost";

  const delta =
    playerColor === "white"
      ? gameOver.ratingChange?.white
      : playerColor === "black"
        ? gameOver.ratingChange?.black
        : undefined;

  const accent = isDraw
    ? "text-night-400"
    : !playerColor
      ? "text-white"
      : won
        ? "text-emerald-400"
        : "text-red-400";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-night-900 ring-1 ring-inset ring-night-700">
        {/* A plain close control, in the corner where people look for one.
            The buttons below all navigate somewhere; this is the one that just
            dismisses. */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-night-400 transition-colors hover:bg-night-800 hover:text-white"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            &times;
          </span>
        </button>
        {/* The aurora band carries the result colour, so the outcome registers
            before you have read a word. */}
        <div
          className={`h-1 w-full ${
            isDraw ? "bg-night-700" : won ? "bg-emerald-400" : "bg-red-400"
          }`}
        />

        <div className="p-6 text-center">
          <h2 id="game-over-title" className={`font-display text-4xl tracking-tight ${accent}`}>
            {headline}
          </h2>
          <p className="mt-1 text-sm text-night-400">
            {TERMINATION_TEXT[gameOver.termination] ?? resultLabel}
          </p>

          {delta !== undefined && (
            <div className="mt-5 inline-flex items-baseline gap-2 rounded-xl bg-night-800 px-5 py-3">
              <span
                className={`font-mono text-3xl font-bold ${
                  delta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {delta}
              </span>
              <span className="text-sm text-night-400">rating</span>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {rematchIncoming ? (
              <>
                <p className="mb-2 text-sm text-night-400">Your opponent wants a rematch.</p>
                <button
                  onClick={onRematchAccept}
                  className="w-full rounded-lg bg-aurora-cyan py-3 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
                >
                  Accept rematch
                </button>
                <button
                  onClick={onRematchDecline}
                  className="w-full rounded-lg py-2.5 font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                >
                  Decline
                </button>
              </>
            ) : rematchOffered ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-night-800 py-3 text-sm font-medium text-night-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-aurora-cyan motion-reduce:animate-none" />
                Waiting for your opponent
              </div>
            ) : (
              <button
                onClick={onRematchOffer}
                className="w-full rounded-lg bg-aurora-cyan py-3 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8]"
              >
                Play again
              </button>
            )}

            {gameId && (
              <Link
                href={`/game/${gameId}/analysis`}
                className="block w-full rounded-lg py-2.5 text-center font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
              >
                Analyse this game
              </Link>
            )}

            {/* Two different exits. Dismissing the modal leaves you staring
                at a finished position with no route out, which is why there
                was no way back to the menu from here. */}
            <Link
              href="/play"
              className="block w-full rounded-lg py-2.5 text-center font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
            >
              Back to the menu
            </Link>

            <button
              onClick={onClose}
              className="w-full rounded-lg py-2.5 font-medium text-night-400 transition-colors hover:text-white"
            >
              Stay on the board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

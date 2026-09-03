"use client";

import { useState } from "react";

/**
 * Resign, draw and abort controls for local games.
 *
 * Shared by pass-and-play and the over-the-board clock, because both have the
 * same problem: two people, one device, and no server to arbitrate. A draw
 * offer here is not a network message - it is a prompt handed physically across
 * the table, so the confirmation belongs on the same screen.
 *
 * Every destructive action asks twice. On a shared phone a mis-tap ends
 * somebody else's game, and "are you sure" is cheap next to that.
 */

export type LocalAction = "resign-white" | "resign-black" | "draw" | "abort";

interface Props {
  /** Which side is to move, so resignation is offered to the right person. */
  turn: "w" | "b";
  onAction: (action: LocalAction) => void;
  /** Hidden once the game is over. */
  disabled?: boolean;
  /** Rotate the control row for the player sitting opposite. */
  rotated?: boolean;
}

export default function LocalGameControls({ turn, onAction, disabled, rotated }: Props) {
  const [confirming, setConfirming] = useState<LocalAction | null>(null);
  const [drawOffered, setDrawOffered] = useState<"w" | "b" | null>(null);

  if (disabled) return null;

  const resignAction: LocalAction = turn === "w" ? "resign-white" : "resign-black";
  const sideName = turn === "w" ? "White" : "Black";

  // A draw offer from one side, waiting on the other. Deliberately shown to
  // the player who has to answer it rather than the one who made it.
  if (drawOffered && drawOffered !== turn) {
    return (
      <div className={`rounded-lg bg-night-800 p-3 text-center ${rotated ? "rotate-180" : ""}`}>
        <p className="text-sm">{drawOffered === "w" ? "White" : "Black"} offers a draw.</p>
        <div className="mt-2 flex justify-center gap-2">
          <button
            onClick={() => {
              setDrawOffered(null);
              onAction("draw");
            }}
            className="rounded-lg bg-aurora-cyan px-4 py-1.5 text-sm font-semibold text-night-950"
          >
            Accept
          </button>
          <button
            onClick={() => setDrawOffered(null)}
            className="rounded-lg bg-night-700 px-4 py-1.5 text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (confirming) {
    const label = confirming === "abort" ? "Abandon this game?" : `Resign as ${sideName}?`;
    return (
      <div className={`rounded-lg bg-night-800 p-3 text-center ${rotated ? "rotate-180" : ""}`}>
        <p className="text-sm">{label}</p>
        <div className="mt-2 flex justify-center gap-2">
          <button
            onClick={() => {
              const action = confirming;
              setConfirming(null);
              onAction(action);
            }}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="rounded-lg bg-night-700 px-4 py-1.5 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center gap-2 ${rotated ? "rotate-180" : ""}`}>
      <button
        onClick={() => setConfirming(resignAction)}
        className="rounded-lg bg-night-800 px-3 py-1.5 text-xs text-night-200 transition-colors hover:bg-night-700"
      >
        {sideName} resigns
      </button>
      <button
        onClick={() => setDrawOffered(turn)}
        className="rounded-lg bg-night-800 px-3 py-1.5 text-xs text-night-200 transition-colors hover:bg-night-700"
      >
        Offer draw
      </button>
      <button
        onClick={() => setConfirming("abort")}
        className="rounded-lg bg-night-800 px-3 py-1.5 text-xs text-night-400 transition-colors hover:bg-night-700"
      >
        Abandon
      </button>
    </div>
  );
}

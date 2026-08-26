"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import { identifyOpening } from "@aurora/chess";
import LocalGameControls, { type LocalAction } from "../../../components/LocalGameControls";

const ChessBoard = dynamic(() => import("../../../components/ChessBoard"), { ssr: false });

/**
 * Pass and play.
 *
 * Two people, one phone, no accounts. The device sits between them and gets
 * handed across, or lies flat on the table with a player on each side.
 *
 * The board does NOT flip between turns. Flipping it makes the position appear
 * to jump — squares you were just looking at move somewhere else — which is
 * disorienting when you are also trying to see what your opponent played.
 * Instead the PIECES rotate 180 degrees on black's turn, so they read upright
 * to whoever is sitting opposite while every square stays exactly where it was.
 *
 * Nothing is rated or recorded. This is a game between two people in a room.
 */
export default function PassAndPlayPage() {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [ended, setEnded] = useState<string | null>(null);
  /** Off by default: most people hand the phone across rather than lay it flat. */
  const [flatOnTable, setFlatOnTable] = useState(false);

  const turn = chess.turn();
  const opening = useMemo(() => identifyOpening(history), [history]);

  const onMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      try {
        const move = chess.move({ from, to, promotion: promotion ?? "q" });
        if (!move) return false;
      } catch {
        return false;
      }
      setFen(chess.fen());
      setHistory(chess.history());

      if (chess.isGameOver()) {
        setEnded(
          chess.isCheckmate()
            ? `${chess.turn() === "w" ? "Black" : "White"} wins by checkmate`
            : chess.isStalemate()
              ? "Drawn by stalemate"
              : chess.isThreefoldRepetition()
                ? "Drawn by repetition"
                : chess.isInsufficientMaterial()
                  ? "Drawn - insufficient material"
                  : "Drawn by the fifty-move rule"
        );
      }
      return true;
    },
    [chess]
  );

  const handleAction = useCallback((action: LocalAction) => {
    if (action === "resign-white") setEnded("Black wins by resignation");
    else if (action === "resign-black") setEnded("White wins by resignation");
    else if (action === "draw") setEnded("Drawn by agreement");
    else setEnded("Game abandoned");
  }, []);

  const undo = useCallback(() => {
    // Takebacks are fine here. There is no rating to protect and the opponent
    // is sitting right there to object.
    chess.undo();
    setFen(chess.fen());
    setHistory(chess.history());
    setEnded(null);
  }, [chess]);

  return (
    <main className="min-h-screen bg-night-950">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-3 py-4">
        <div className="flex items-center justify-between">
          <Link href="/play" className="text-sm text-night-400 hover:text-white">
            &larr; Back
          </Link>
          <button
            onClick={() => setFlatOnTable((v) => !v)}
            className="rounded-lg bg-night-800 px-3 py-1.5 text-xs text-night-200"
          >
            {flatOnTable ? "Phone held" : "Phone flat on table"}
          </button>
        </div>

        {/* Black's side, rotated when the phone lies between two players. */}
        <div className={`py-3 text-center ${flatOnTable ? "rotate-180" : ""}`}>
          <p
            className={`text-sm ${turn === "b" && !ended ? "font-semibold text-aurora-cyan" : "text-night-400"}`}
          >
            {ended ? "\u00A0" : turn === "b" ? "Black to move" : "Black"}
          </p>
          {flatOnTable && !ended && (
            <div className="mt-2">
              <LocalGameControls turn={turn} onAction={handleAction} rotated />
            </div>
          )}
        </div>

        <div className="flex-1">
          {opening.opening && (
            <p className="mb-1 truncate text-center text-xs text-night-400">
              {opening.opening.name}
            </p>
          )}
          <ChessBoard
            fen={fen}
            orientation="white"
            playerColor={turn === "w" ? "white" : "black"}
            movable={!ended}
            /* Pieces turn, the board does not — see the note at the top. */
            rotatePieces={flatOnTable && turn === "b"}
            onMove={onMove}
          />
        </div>

        {ended ? (
          <div className="mt-3 rounded-lg bg-night-900 p-4 text-center">
            <p className="font-display text-xl">{ended}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Link
                href="/play/pass"
                className="rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
              >
                New game
              </Link>
              <Link
                href="/play"
                className="rounded-lg bg-night-800 px-4 py-2 text-sm ring-1 ring-inset ring-night-700"
              >
                Main menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p
              className={`text-center text-sm ${turn === "w" ? "font-semibold text-aurora-cyan" : "text-night-400"}`}
            >
              {turn === "w" ? "White to move" : "White"}
            </p>
            <LocalGameControls turn={turn} onAction={handleAction} />
            {history.length > 0 && (
              <button
                onClick={undo}
                className="mx-auto block rounded-lg px-3 py-1 text-xs text-night-400 hover:text-white"
              >
                Take back last move
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

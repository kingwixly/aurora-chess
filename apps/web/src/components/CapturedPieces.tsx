"use client";

import { Chess } from "chess.js";
import { useSettingsStore } from "../stores/settings";

interface CapturedPiecesProps {
  fen: string;
  color: "white" | "black";
}

const STARTING_COUNTS: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

const PIECE_SYMBOLS: Record<string, string> = {
  q: "\u265B",
  r: "\u265C",
  b: "\u265D",
  n: "\u265E",
  p: "\u265F",
};

const PIECE_VALUES: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const PIECE_ORDER = ["q", "r", "b", "n", "p"];

function countOnBoard(fen: string, color: "w" | "b"): Record<string, number> {
  const counts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (const row of new Chess(fen).board()) {
    for (const square of row) {
      if (square && square.color === color && counts[square.type] !== undefined) {
        counts[square.type]++;
      }
    }
  }
  return counts;
}

function materialValue(counts: Record<string, number>): number {
  return PIECE_ORDER.reduce((sum, p) => sum + counts[p] * PIECE_VALUES[p], 0);
}

/**
 * Captured material, in whichever convention the player prefers.
 *
 * **board** — the over-the-board habit: every piece you have taken, laid out
 * beside you. Complete, but it makes you do the subtraction.
 *
 * **compact** — the online convention: only the *surplus*. If you are up a
 * knight and two pawns you see a knight and "+2", because the pieces that
 * cancel out carry no information.
 *
 * Both are computed from surviving material rather than from a capture list,
 * which is what keeps them correct after a promotion.
 */
export default function CapturedPieces({ fen, color }: CapturedPiecesProps) {
  const materialStyle = useSettingsStore((s) => s.materialStyle);

  const own = countOnBoard(fen, color === "white" ? "w" : "b");
  const opponent = countOnBoard(fen, color === "white" ? "b" : "w");
  const advantage = materialValue(own) - materialValue(opponent);

  const tone =
    color === "white"
      ? "text-white opacity-80 drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]"
      : "text-night-300 drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]";

  // Reserve the row height so the board does not shift on the first capture.
  const EMPTY = <div className="min-h-[20px] lg:min-h-[24px]" aria-hidden="true" />;

  if (materialStyle === "compact") {
    // Surplus per piece type: what you have that they cannot answer.
    const surplus: string[] = [];
    for (const piece of PIECE_ORDER) {
      for (let i = 0; i < Math.max(0, own[piece] - opponent[piece]); i++) {
        surplus.push(piece);
      }
    }
    if (surplus.length === 0 && advantage <= 0) return EMPTY;

    return (
      <div className="flex min-h-[20px] flex-wrap items-center gap-0.5 text-base lg:min-h-[24px] lg:text-lg">
        {surplus.map((p, i) => (
          <span key={i} className={tone}>
            {PIECE_SYMBOLS[p]}
          </span>
        ))}
        {advantage > 0 && (
          <span
            className="ml-1 font-mono text-sm font-semibold text-emerald-400"
            title={`Ahead by ${advantage} ${advantage === 1 ? "point" : "points"}`}
          >
            +{advantage}
          </span>
        )}
      </div>
    );
  }

  // board style: everything this player has captured.
  const captured: string[] = [];
  for (const piece of PIECE_ORDER) {
    for (let i = 0; i < STARTING_COUNTS[piece] - opponent[piece]; i++) captured.push(piece);
  }
  if (captured.length === 0) return EMPTY;

  return (
    <div className="flex min-h-[20px] flex-wrap items-center gap-0.5 overflow-hidden text-base lg:min-h-[24px] lg:text-lg">
      {captured.map((p, i) => (
        <span key={i} className={tone}>
          {PIECE_SYMBOLS[p]}
        </span>
      ))}
      {advantage > 0 && (
        <span className="ml-1 font-mono text-sm font-semibold text-emerald-400">+{advantage}</span>
      )}
    </div>
  );
}

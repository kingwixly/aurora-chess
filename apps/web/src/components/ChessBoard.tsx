"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Chessground } from "chessground";
import { Chess } from "chess.js";
import type { Api } from "chessground/api";
import type { Key, Color as CgColor } from "chessground/types";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

interface ChessBoardProps {
  fen: string;
  orientation: "white" | "black";
  movable: boolean;
  /**
   * Which colour this person plays. Defaults to `orientation`, which is right
   * for a normal game where the board faces you.
   *
   * Needed separately from `movable` because Chessground decides "move now" vs
   * "premove" by comparing this against whose turn it is. Analysis boards where
   * both sides are movable should leave it undefined.
   */
  playerColor?: "white" | "black" | "both";
  premovable?: boolean;
  /**
   * Rotate the PIECES 180 degrees without rotating the board.
   *
   * For two people sharing one phone laid flat between them. Flipping the whole
   * board each turn makes the position appear to jump - squares you were
   * looking at move somewhere else - which is disorienting when you are also
   * tracking your opponent's last move. Rotating only the pieces keeps every
   * square exactly where it was and still presents them upright to whoever is
   * sitting opposite.
   */
  rotatePieces?: boolean;
  /** Called when a premove is set or cleared, for UI feedback. */
  onPremoveSet?: (from: string | null, to: string | null) => void;
  coordinates?: boolean;
  lastMove?: [string, string];
  check?: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
  highlightedSquares?: { square: string; color: string }[];
  arrows?: { from: string; to: string; color: string }[];
}

const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;
const PIECE_SYMBOLS: Record<string, string> = {
  q: "\u265B",
  r: "\u265C",
  b: "\u265D",
  n: "\u265E",
};
const PIECE_NAMES: Record<string, string> = {
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
};

/**
 * Chessground brushes are NAMED (green, red, blue, yellow, paleBlue...), not
 * colours. Passing a hex string looks reasonable and crashes inside the shape
 * renderer with "Cannot read properties of undefined (reading 'key')", which
 * also leaves dragging in a broken state. Anything unrecognised falls back.
 */
const VALID_BRUSHES = new Set([
  "green",
  "red",
  "blue",
  "yellow",
  "paleBlue",
  "paleGreen",
  "paleRed",
  "paleGrey",
]);

function brush(name: string | undefined): string {
  return name && VALID_BRUSHES.has(name) ? name : "blue";
}

function getLegalDests(fen: string): Map<Key, Key[]> {
  const chess = new Chess(fen);
  const dests = new Map<Key, Key[]>();
  const moves = chess.moves({ verbose: true });
  for (const m of moves) {
    const from = m.from as Key;
    const existing = dests.get(from) || [];
    existing.push(m.to as Key);
    dests.set(from, existing);
  }
  return dests;
}

function getTurnColor(fen: string): CgColor {
  return fen.split(" ")[1] === "w" ? "white" : "black";
}

function isPromotion(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  const piece = chess.get(from as Parameters<typeof chess.get>[0]);
  if (!piece || piece.type !== "p") return false;
  const rank = to[1];
  return (piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1");
}

/**
 * Renders an interactive chessboard using Chessground, with support for legal move
 * highlighting, drag-and-drop, arrows, square highlights, and pawn promotion dialogs.
 *
 * @param props - {@link ChessBoardProps}
 * @returns The chessboard element with an optional promotion overlay.
 */
export default function ChessBoard({
  fen,
  orientation,
  movable,
  rotatePieces,
  playerColor,
  premovable,
  onPremoveSet,
  coordinates: showCoords = true,
  lastMove,
  check,
  onMove,
  highlightedSquares,
  arrows,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const prevOrientation = useRef(orientation);
  const [flipping, setFlipping] = useState(false);
  const [promotion, setPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Brief opacity dip on board flip
  useEffect(() => {
    if (orientation !== prevOrientation.current) {
      prevOrientation.current = orientation;
      setFlipping(true);
      const timer = setTimeout(() => setFlipping(false), 200);
      return () => clearTimeout(timer);
    }
  }, [orientation]);

  const handleMove = useCallback(
    (from: Key, to: Key) => {
      if (isPromotion(fen, from, to)) {
        setPromotion({ from, to });
      } else {
        onMove(from, to);
      }
    },
    [fen, onMove]
  );

  // Initialize chessground
  useEffect(() => {
    if (!boardRef.current) return;
    if (apiRef.current) return;

    const turnColor = getTurnColor(fen);

    apiRef.current = Chessground(boardRef.current, {
      fen,
      orientation,
      turnColor,
      coordinates: showCoords,
      movable: {
        free: false,
        // The PLAYER's colour, not whose turn it is.
        //
        // Chessground works out whether a drag is a move or a premove by
        // comparing movable.color against turnColor. Setting it to turnColor
        // meant the two were always equal, so nothing was ever a premove - and
        // when it was the opponent's turn the prop was false and the colour was
        // undefined, so the board did not know which pieces you could even
        // pick up. Premoves could not be set at all.
        // "both" is a real Chessground value and the right one for an
        // analysis board: with a single colour, only that side's pieces can be
        // dragged, so exploring a line for black was impossible.
        color: premovable ? (playerColor ?? orientation) : movable ? turnColor : undefined,
        dests: movable ? getLegalDests(fen) : new Map(),
        showDests: true,
      },
      lastMove: lastMove as [Key, Key] | undefined,
      check: check || false,
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
      premovable: {
        enabled: !!premovable,
        showDests: true,
        castle: true,
        events: {
          // Surface the premove so callers can show it, and clear it if the
          // game ends before it can be played.
          set: (orig, dest) => onPremoveSet?.(orig as string, dest as string),
          unset: () => onPremoveSet?.(null, null),
        },
      },
      draggable: {
        enabled: movable || !!premovable,
        showGhost: true,
      },
      events: {
        move: handleMove,
      },
      drawable: {
        enabled: true,
        autoShapes: [
          ...(highlightedSquares || []).map((h) => ({
            orig: h.square as Key,
            brush: brush(h.color),
          })),
          ...(arrows || []).map((a) => ({
            orig: a.from as Key,
            dest: a.to as Key,
            brush: brush(a.color),
          })),
        ],
      },
    });

    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  // Update board state when props change
  useEffect(() => {
    if (!apiRef.current) return;

    const turnColor = getTurnColor(fen);

    apiRef.current.set({
      fen,
      orientation,
      turnColor,
      coordinates: showCoords,
      movable: {
        free: false,
        // The PLAYER's colour, not whose turn it is.
        //
        // Chessground works out whether a drag is a move or a premove by
        // comparing movable.color against turnColor. Setting it to turnColor
        // meant the two were always equal, so nothing was ever a premove - and
        // when it was the opponent's turn the prop was false and the colour was
        // undefined, so the board did not know which pieces you could even
        // pick up. Premoves could not be set at all.
        // "both" is a real Chessground value and the right one for an
        // analysis board: with a single colour, only that side's pieces can be
        // dragged, so exploring a line for black was impossible.
        color: premovable ? (playerColor ?? orientation) : movable ? turnColor : undefined,
        dests: movable ? getLegalDests(fen) : new Map(),
        showDests: true,
      },
      lastMove: lastMove as [Key, Key] | undefined,
      check: check || false,
      premovable: {
        enabled: !!premovable,
        showDests: true,
        // Keep the premove drawn after the opponent moves, so it is visible
        // for the instant before it plays.
        castle: true,
      },
      draggable: {
        enabled: movable || !!premovable,
      },
      events: {
        move: handleMove,
      },
      drawable: {
        autoShapes: [
          ...(highlightedSquares || []).map((h) => ({
            orig: h.square as Key,
            brush: brush(h.color),
          })),
          ...(arrows || []).map((a) => ({
            orig: a.from as Key,
            dest: a.to as Key,
            brush: brush(a.color),
          })),
        ],
      },
    });

    // Chessground stores a premove but never plays it on its own. Without this,
    // a premove is drawn on the board, survives the opponent's move, and then
    // silently does nothing - which is worse than having no premove at all.
    if (premovable) {
      // Deferred a tick so the new position is committed before the premove is
      // validated against it.
      const t = setTimeout(() => apiRef.current?.playPremove(), 0);
      return () => clearTimeout(t);
    }
  }, [
    fen,
    orientation,
    movable,
    premovable,
    showCoords,
    lastMove,
    check,
    highlightedSquares,
    arrows,
    handleMove,
    playerColor,
  ]);

  function selectPromotion(piece: string) {
    if (promotion) {
      onMove(promotion.from, promotion.to, piece);
      setPromotion(null);
    }
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
      <div
        ref={boardRef}
        className="w-full h-full transition-opacity duration-200"
        style={{ opacity: flipping ? 0.4 : 1 }}
      />
      {promotion && (
        <div
          role="dialog"
          aria-label="Choose promotion piece"
          className="absolute inset-0 bg-black/60 flex items-center justify-center z-10"
        >
          <div className="bg-night-800 rounded-lg p-4 flex gap-2">
            {PROMOTION_PIECES.map((p) => (
              <button
                key={p}
                onClick={() => selectPromotion(p)}
                aria-label={`Promote to ${PIECE_NAMES[p]}`}
                className="w-14 h-14 bg-night-800 hover:bg-night-700 rounded-lg flex items-center justify-center text-3xl transition-colors"
              >
                {PIECE_SYMBOLS[p]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { AuroraBand } from "@aurora/ui";
import { useAuthStore } from "../../stores/auth";
import api from "../../lib/api";
import ChessBoard from "../../components/ChessBoard";
import BoardThemeStyles from "../../components/BoardThemeStyles";

interface Puzzle {
  id: string;
  fen: string;
  rating: number;
  title: string;
  intro: string;
  themes: string[];
}

interface Note {
  text: string;
  side: "player" | "opponent";
}

/** Theme codes are terse; these are what a human calls them. */
const THEME_LABELS: Record<string, string> = {
  mateIn1: "Mate in 1",
  mateIn2: "Mate in 2",
  mateIn5: "Forced mate",
  backRankMate: "Back rank",
  smotheredMate: "Smothered mate",
  arabianMate: "Arabian mate",
  fork: "Fork",
  knightFork: "Knight fork",
  deflection: "Deflection",
  sacrifice: "Sacrifice",
  kingsideAttack: "Kingside attack",
  endgame: "Endgame",
  rookEndgame: "Rook endgame",
  opening: "Opening",
};

export default function PuzzlesPage() {
  const { user, fetchMe } = useAuthStore();

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState(() => new Chess());
  const [fen, setFen] = useState("");
  const [movesMade, setMovesMade] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [state, setState] = useState<"loading" | "solving" | "solved" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [hinted, setHinted] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  /** Forces the board back to `fen` even when `fen` itself has not changed. */
  const [boardNonce, setBoardNonce] = useState(0);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const load = useCallback(async () => {
    setState("loading");
    setLoadError(null);
    setNotes([]);
    setMovesMade(0);
    setDelta(null);
    setHinted(false);
    setFailedOnce(false);
    try {
      const { data } = await api.get("/api/v1/puzzles/next");
      const p: Puzzle = data.puzzle;
      setPuzzle(p);
      setRating(data.playerRating);
      const c = new Chess(p.fen);
      setChess(c);
      setFen(c.fen());
      setState("solving");
      startedAt.current = Date.now();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setLoadError(
        status === 404
          ? "No puzzles have been loaded yet. Run the puzzle seed on the server."
          : "Could not load a puzzle. The server may be starting up."
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Record the finished attempt. Abandoned puzzles are never scored. */
  const record = useCallback(
    async (solved: boolean, usedHint: boolean) => {
      if (!puzzle || !user) return;
      try {
        const { data } = await api.post("/api/v1/puzzles/attempt", {
          puzzleId: puzzle.id,
          solved,
          hinted: usedHint,
          msSpent: Date.now() - startedAt.current,
        });
        setRating(data.ratingAfter);
        setDelta(data.delta);
      } catch {
        // Rating is secondary; a failed write must not block the UI.
      }
    },
    [puzzle, user]
  );

  const onMove = useCallback(
    async (from: string, to: string, promotion?: string) => {
      if (!puzzle || state !== "solving") return;
      const uci = `${from}${to}${promotion ?? ""}`;

      // Reject anything illegal locally before troubling the server.
      const probe = new Chess(chess.fen());
      try {
        probe.move({ from, to, promotion });
      } catch {
        return;
      }

      const { data } = await api.post("/api/v1/puzzles/move", {
        puzzleId: puzzle.id,
        move: uci,
        movesMade,
      });

      if (data.status === "wrong") {
        setFailedOnce(true);
        setNotes((n) => {
          const text = "Not this one. Look again - what is the opponent's king short of?";
          // Replace rather than append. Repeating the same line for every wrong
          // attempt turned the panel into a wall of identical messages.
          const withoutDuplicate = n.filter((x) => x.text !== text);
          return [...withoutDuplicate, { text, side: "opponent" as const }];
        });
        // Bumping a counter alongside the FEN is what actually resets the
        // board. Setting `fen` to the value it already holds is a no-op to
        // React, so the second wrong move in a row never snapped back - the
        // piece just stayed where it was dropped.
        setFen(chess.fen());
        setBoardNonce((n) => n + 1);
        return;
      }

      const next = new Chess(chess.fen());
      next.move({ from, to, promotion });

      if (data.status === "solved") {
        setChess(next);
        setFen(next.fen());
        setNotes((n) => [...n, { text: data.explanation, side: "player" }]);
        setState("solved");
        record(!failedOnce, hinted);
        return;
      }

      // Play the opponent's forced reply after a beat, so the player sees
      // their own move land before the position changes again.
      setNotes((n) => [...n, { text: data.explanation, side: "player" }]);
      setChess(next);
      setFen(next.fen());

      setTimeout(() => {
        const after = new Chess(next.fen());
        try {
          after.move({
            from: data.reply.slice(0, 2),
            to: data.reply.slice(2, 4),
            promotion: data.reply.slice(4) || undefined,
          });
          setChess(after);
          setFen(after.fen());
          setNotes((n) => [...n, { text: data.replyExplanation, side: "opponent" }]);
          setMovesMade((m) => m + 1);
        } catch {
          setState("solved");
        }
      }, 550);
    },
    [puzzle, state, chess, movesMade, record, failedOnce, hinted]
  );

  if (state === "error" || (state !== "loading" && !puzzle)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night-950 px-6 text-center">
        <h1 className="font-display text-2xl">No puzzle available</h1>
        <p className="max-w-sm text-sm text-night-400">{loadError}</p>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-lg bg-aurora-cyan px-5 py-2.5 font-semibold text-night-950 font-display"
          >
            Try again
          </button>
          <Link
            href="/play"
            className="rounded-lg px-5 py-2.5 font-medium ring-1 ring-inset ring-night-700"
          >
            Back
          </Link>
        </div>
      </main>
    );
  }

  if (state === "loading" || !puzzle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Finding a puzzle...</p>
      </main>
    );
  }

  const sideToMove = puzzle.fen.split(" ")[1] === "w" ? "White" : "Black";

  return (
    <main className="min-h-screen bg-night-950">
      <BoardThemeStyles />
      <AuroraBand />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mx-auto w-full max-w-[560px]">
              <ChessBoard
                // Keyed on the nonce so a repeated wrong move remounts the
                // board and the piece returns to its square.
                key={boardNonce}
                fen={fen}
                orientation={sideToMove === "White" ? "white" : "black"}
                movable={state === "solving"}
                onMove={onMove}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-night-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl tracking-tight">{puzzle.title}</h1>
                  <p className="mt-1 text-sm text-night-400">{puzzle.intro}</p>
                </div>
                <span className="shrink-0 rounded bg-night-800 px-2 py-1 font-mono text-xs text-night-300">
                  {puzzle.rating}
                </span>
              </div>

              <p className="mt-3 font-mono text-xs uppercase tracking-wider text-aurora-cyan">
                {sideToMove} to move
              </p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {puzzle.themes.map((t) => (
                  <li
                    key={t}
                    className="rounded bg-night-800 px-2 py-0.5 text-xs text-night-400 ring-1 ring-inset ring-night-700"
                  >
                    {THEME_LABELS[t] ?? t}
                  </li>
                ))}
              </ul>
            </section>

            {/* Explanations accumulate as they are earned. Showing them all up
                front would give the solution away. */}
            {notes.length > 0 && (
              <section className="space-y-2">
                {notes.map((n, i) => (
                  <p
                    key={i}
                    className={`rounded-xl p-4 text-sm leading-relaxed ring-1 ring-inset ${
                      n.side === "player"
                        ? "bg-aurora-soft text-night-300 ring-aurora-cyan/30"
                        : "bg-night-900 text-night-400 ring-night-700"
                    }`}
                  >
                    {n.text}
                  </p>
                ))}
              </section>
            )}

            {state === "solved" && (
              <section className="rounded-xl bg-night-900 p-5 ring-1 ring-inset ring-emerald-500/40">
                <p className="font-display text-2xl text-emerald-400">Solved</p>
                {delta !== null && (
                  <p className="mt-1 font-mono text-sm text-night-400">
                    Puzzle rating {rating}{" "}
                    <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                      ({delta >= 0 ? "+" : ""}
                      {delta})
                    </span>
                  </p>
                )}
                <button
                  onClick={load}
                  className="mt-4 w-full rounded-lg bg-aurora-cyan py-3 font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] font-display"
                >
                  Next puzzle
                </button>
              </section>
            )}

            {state === "solving" && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setHinted(true);
                    setNotes((n) => [
                      ...n,
                      {
                        text: `Theme: ${puzzle.themes.map((t) => THEME_LABELS[t] ?? t).join(", ")}. A hinted solve does not raise your rating.`,
                        side: "opponent",
                      },
                    ]);
                  }}
                  disabled={hinted}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
                >
                  Hint
                </button>
                <button
                  onClick={() => {
                    record(false, hinted);
                    load();
                  }}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium text-night-400 ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
                >
                  Skip
                </button>
              </div>
            )}

            {rating !== null && state === "solving" && (
              <p className="text-center font-mono text-xs text-night-400">
                Your puzzle rating: {rating}
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { identifyOpening } from "@aurora/chess";
import LocalGameControls, { type LocalAction } from "../../../components/LocalGameControls";
import { useLocalHistory, buildPgn } from "../../../stores/localHistory";

const ChessBoard = dynamic(() => import("../../../components/ChessBoard"), { ssr: false });

/**
 * Play in person.
 *
 * One device, one physical board, two people sitting opposite each other. The
 * phone is the clock and the scoresheet; the chess happens on the wood.
 *
 * Deliberately NOT a normal game:
 *
 * - No account needed, no rating, nothing recorded to a profile. This is a
 *   café game, and treating it as rated would make people afraid to use it.
 * - The board flips to whoever is to move, so each player reads their own
 *   position without picking the phone up and turning it round.
 * - The clock is the point. Everything else is secondary to being able to
 *   tap and pass it across.
 *
 * Works offline once the page has loaded, which matters - the places people
 * play over the board are often the places with no signal.
 */

type Preset = {
  label: string;
  /** null means no clock at all, not a very large number. */
  minutes: number | null;
  increment: number;
};

const PRESETS: Preset[] = [
  { label: "3 + 2", minutes: 3, increment: 2 },
  { label: "5 + 0", minutes: 5, increment: 0 },
  { label: "10 + 0", minutes: 10, increment: 0 },
  { label: "15 + 10", minutes: 15, increment: 10 },
  { label: "30 + 0", minutes: 30, increment: 0 },
];

export default function OverTheBoardPage() {
  const [preset, setPreset] = useState<Preset | null>(null);
  const [started, setStarted] = useState(false);
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState<string[]>([]);

  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const [whiteName, setWhiteName] = useState("");
  const [blackName, setBlackName] = useState("");
  /** Off by default: most people hand the phone across rather than lay it down. */
  const [flatOnTable, setFlatOnTable] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useLocalHistory((st) => st.save);
  const [paused, setPaused] = useState(false);
  const lastTick = useRef<number>(0);

  const turn = chess.turn();
  const opening = useMemo(() => identifyOpening(history), [history]);

  const start = (p: Preset) => {
    setPreset(p);
    setWhiteMs(p.minutes === null ? 0 : p.minutes * 60_000);
    setBlackMs(p.minutes === null ? 0 : p.minutes * 60_000);
    setStarted(true);
    setRunning(false);
    setPaused(false);
  };

  // With no clock there is nothing to run down, so nobody can flag.
  const noClock = preset?.minutes === null;
  const flagged = !noClock && (whiteMs === 0 || blackMs === 0);

  // The clock. Driven by wall time rather than by counting intervals, because
  // a phone that sleeps or throttles timers would otherwise gain time for
  // whoever was on move.
  useEffect(() => {
    if (!running || paused || noClock) return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      if (turn === "w") setWhiteMs((m) => Math.max(0, m - delta));
      else setBlackMs((m) => Math.max(0, m - delta));
    }, 100);
    return () => clearInterval(id);
  }, [running, paused, turn, noClock]);

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

      // Increment goes to the player who just moved, which is the standard
      // Fischer rule and the one people expect.
      if (preset && preset.increment > 0) {
        // The increment goes to whoever just moved. After the move it is the
        // OTHER side to play, so a black turn means white just moved.
        if (chess.turn() === "b") setWhiteMs((m) => m + preset.increment * 1000);
        else setBlackMs((m) => m + preset.increment * 1000);
      }
      if (!running) setRunning(true);
      return true;
    },
    [chess, preset, running]
  );

  const handleAction = useCallback((action: LocalAction) => {
    if (action === "resign-white") setEnded("Black wins by resignation");
    else if (action === "resign-black") setEnded("White wins by resignation");
    else if (action === "draw") setEnded("Drawn by agreement");
    else setEnded("Game abandoned");
    setRunning(false);
  }, []);

  const result =
    ended ??
    (chess.isGameOver()
      ? chess.isCheckmate()
        ? `${chess.turn() === "w" ? "Black" : "White"} wins by checkmate`
        : chess.isStalemate()
          ? "Drawn by stalemate"
          : chess.isThreefoldRepetition()
            ? "Drawn by repetition"
            : chess.isInsufficientMaterial()
              ? "Drawn - insufficient material"
              : "Drawn by the fifty-move rule"
      : flagged
        ? `${whiteMs === 0 ? "Black" : "White"} wins on time`
        : null);

  useEffect(() => {
    if (!result || saved || !preset) return;
    const white = whiteName.trim() || "White";
    const black = blackName.trim() || "Black";
    const outcome = result.startsWith("White")
      ? "1-0"
      : result.startsWith("Black")
        ? "0-1"
        : "1/2-1/2";
    const termination = /checkmate/i.test(result)
      ? "checkmate"
      : /resignation/i.test(result)
        ? "resignation"
        : /time/i.test(result)
          ? "time"
          : /agreement/i.test(result)
            ? "agreement"
            : /stalemate/i.test(result)
              ? "stalemate"
              : /repetition/i.test(result)
                ? "repetition"
                : /abandoned/i.test(result)
                  ? "abandoned"
                  : "adjudication";
    save({
      white,
      black,
      result: outcome,
      termination,
      pgn: buildPgn({
        white,
        black,
        result: outcome,
        termination,
        moves: history,
        timeControl: preset.label,
      }),
      moveCount: history.length,
      mode: "in-person",
      timeControl: preset.label,
    });
    setSaved(true);
  }, [result, saved, preset, history, whiteName, blackName, save]);

  const undo = useCallback(() => {
    // No rating to protect, and the opponent is sitting right there to object.
    chess.undo();
    setFen(chess.fen());
    setHistory(chess.history());
  }, [chess]);

  if (!started) {
    return (
      <main className="min-h-screen bg-night-950">
        <div className="mx-auto max-w-md px-6 py-10">
          <Link href="/play" className="text-sm text-night-400 hover:text-white">
            &larr; Back
          </Link>
          <h1 className="mt-4 font-display text-3xl tracking-tight">Play in person</h1>
          <p className="mt-2 text-sm leading-relaxed text-night-300">
            For a real board with someone sitting opposite you. This device is the clock and the
            scoresheet - move the pieces by hand, then tap your move here to pass the clock across.
          </p>
          <p className="mt-2 text-sm text-night-400">
            Nothing is rated or saved to your profile, and it works without a signal.
          </p>

          <div className="mt-6 space-y-2">
            <input
              value={whiteName}
              onChange={(e) => setWhiteName(e.target.value)}
              placeholder="White's name (optional)"
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-night-200 placeholder:text-night-400 focus:border-aurora-cyan focus:outline-none"
            />
            <input
              value={blackName}
              onChange={(e) => setBlackName(e.target.value)}
              placeholder="Black's name (optional)"
              className="w-full rounded-lg border border-night-700 bg-night-800 px-3 py-2 text-night-200 placeholder:text-night-400 focus:border-aurora-cyan focus:outline-none"
            />
            <p className="text-xs text-night-400">
              Only used to label the game in your history. Leave blank if you would rather not.
            </p>
          </div>

          <h2 className="mt-8 text-sm font-semibold text-night-400">Time control</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => start(p)}
                className="rounded-lg bg-night-800 py-3 font-mono text-lg text-night-200 transition-colors hover:bg-night-700"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => start({ label: "No clock", minutes: null, increment: 0 })}
              className="rounded-lg bg-night-800 py-3 text-sm text-night-200 transition-colors hover:bg-night-700"
            >
              No clock
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    // Capped and centred. The layout is built for a phone held between two
    // people; on a desktop monitor an unconstrained board fills the screen and
    // looks like a zoom bug rather than a design.
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-night-950">
      {/* Black's clock, rotated so it reads correctly from across the table. */}
      {!noClock && (
        <ClockFace
          ms={blackMs}
          active={running && !paused && turn === "b" && !result}
          rotated
          label="Black"
        />
      )}
      {noClock && (
        <div className="rotate-180 py-3 text-center">
          <span
            className={`text-sm uppercase tracking-[0.2em] ${
              turn === "b" && !result ? "text-aurora-cyan" : "text-night-400"
            }`}
          >
            Black{turn === "b" && !result ? " to move" : ""}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center px-3">
        {opening.opening && (
          <p className="mb-1 truncate text-center text-xs text-night-400">{opening.opening.name}</p>
        )}
        <ChessBoard
          fen={fen}
          /* The board stays put; the PIECES turn.
             
             Flipping the board means a1 moves to the opposite corner every
             move, so the position appears to jump and neither player can hold
             a mental picture of it. On a real board nobody rotates the table -
             they sit on opposite sides and read the same fixed squares. */
          orientation="white"
          playerColor={turn === "w" ? "white" : "black"}
          /* Only when the phone is lying between two players. Held and
             handed across, the pieces should stay upright. */
          rotatePieces={flatOnTable && turn === "b"}
          movable={!result}
          onMove={onMove}
        />
        {result && (
          <div className="mt-3 rounded-lg bg-night-900 p-3 text-center">
            <p className="font-display text-lg">{result}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link
                href="/play/otb"
                className="rounded-lg bg-aurora-cyan px-3 py-1.5 text-sm font-semibold text-night-950"
              >
                New game
              </Link>
              <Link
                href="/play/history"
                className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700"
              >
                History
              </Link>
              <Link
                href="/play"
                className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700"
              >
                Main menu
              </Link>
            </div>
          </div>
        )}
        {!result && (
          <div className="mt-2">
            <LocalGameControls turn={turn} onAction={handleAction} />
          </div>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setFlatOnTable((v) => !v)}
            className="rounded-lg bg-night-800 px-3 py-2 text-xs text-night-200"
          >
            {flatOnTable ? "Phone held" : "Phone flat"}
          </button>
          {history.length > 0 && !result && (
            <button
              onClick={undo}
              className="rounded-lg bg-night-800 px-3 py-2 text-xs text-night-200"
            >
              Take back
            </button>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            disabled={!running || !!result}
            className="rounded-lg bg-night-800 px-4 py-2 text-sm text-night-200 disabled:opacity-40"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <Link href="/play" className="rounded-lg bg-night-800 px-4 py-2 text-sm text-night-200">
            Exit
          </Link>
        </div>
      </div>

      {!noClock && (
        <ClockFace
          ms={whiteMs}
          active={running && !paused && turn === "w" && !result}
          label="White"
        />
      )}
      {noClock && (
        <div className="py-3 text-center">
          <span
            className={`text-sm uppercase tracking-[0.2em] ${
              turn === "w" && !result ? "text-aurora-cyan" : "text-night-400"
            }`}
          >
            White{turn === "w" && !result ? " to move" : ""}
          </span>
        </div>
      )}
    </main>
  );
}

function ClockFace({
  ms,
  active,
  rotated,
  label,
}: {
  ms: number;
  active: boolean;
  rotated?: boolean;
  label: string;
}) {
  const total = Math.ceil(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  // Below ten seconds, show tenths - that is when people actually watch it.
  const display =
    ms < 10_000 && ms > 0
      ? `${(ms / 1000).toFixed(1)}`
      : `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className={`flex items-center justify-center py-4 transition-colors ${
        active ? "bg-aurora-cyan text-night-950" : "bg-night-900 text-night-400"
      } ${rotated ? "rotate-180" : ""}`}
    >
      <span className="sr-only">{label}</span>
      <span className={`font-mono tabular-nums ${ms < 10_000 ? "text-5xl font-bold" : "text-4xl"}`}>
        {display}
      </span>
    </div>
  );
}

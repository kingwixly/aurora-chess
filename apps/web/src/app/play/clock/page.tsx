"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocalHistory, buildPgn } from "../../../stores/localHistory";

/**
 * Clock only.
 *
 * No board on screen - you have a real one in front of you. The phone does one
 * job: show whose move it is and how long they have left, legibly, from across
 * a table.
 *
 * The whole screen takes the moving player's colour. On a chess clock the
 * running side is obvious from two metres away, and a small highlight on a
 * phone is not. Filling the screen is the only thing that reads at the same
 * distance.
 *
 * White is rendered as a pale blue-grey rather than pure white, which at full
 * screen brightness in a quiet room is unpleasant to sit opposite.
 */

type Preset = { label: string; minutes: number | null; increment: number };

const PRESETS: Preset[] = [
  { label: "3 + 2", minutes: 3, increment: 2 },
  { label: "5 + 0", minutes: 5, increment: 0 },
  { label: "10 + 0", minutes: 10, increment: 0 },
  { label: "15 + 10", minutes: 15, increment: 10 },
  { label: "30 + 0", minutes: 30, increment: 0 },
  { label: "60 + 0", minutes: 60, increment: 0 },
];

type Ending = { result: "1-0" | "0-1" | "1/2-1/2"; termination: string } | null;

export default function ClockOnlyPage() {
  const [preset, setPreset] = useState<Preset | null>(null);
  const [whiteName, setWhiteName] = useState("");
  const [blackName, setBlackName] = useState("");

  const [turn, setTurn] = useState<"w" | "b">("w");
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ending, setEnding] = useState<Ending>(null);
  const [showEnd, setShowEnd] = useState(false);
  const lastTick = useRef(0);
  const save = useLocalHistory((s) => s.save);

  const start = (p: Preset) => {
    setPreset(p);
    setWhiteMs(p.minutes === null ? 0 : p.minutes * 60_000);
    setBlackMs(p.minutes === null ? 0 : p.minutes * 60_000);
  };

  const noClock = preset?.minutes === null;

  // Wall-time driven: a phone that sleeps or throttles timers would otherwise
  // hand free time to whoever was on move.
  useEffect(() => {
    if (!running || paused || noClock || ending) return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      if (turn === "w") setWhiteMs((m) => Math.max(0, m - delta));
      else setBlackMs((m) => Math.max(0, m - delta));
    }, 100);
    return () => clearInterval(id);
  }, [running, paused, turn, noClock, ending]);

  // Flagging ends the game rather than sitting at zero.
  useEffect(() => {
    if (ending || noClock || !running) return;
    if (whiteMs === 0) setEnding({ result: "0-1", termination: "time" });
    else if (blackMs === 0) setEnding({ result: "1-0", termination: "time" });
  }, [whiteMs, blackMs, ending, noClock, running]);

  const tap = useCallback(() => {
    if (ending || paused) return;
    if (!running) {
      setRunning(true);
      return;
    }
    // The increment lands on the player who just finished their move.
    if (preset && preset.increment > 0) {
      if (turn === "w") setWhiteMs((m) => m + preset.increment * 1000);
      else setBlackMs((m) => m + preset.increment * 1000);
    }
    setTurn((t) => (t === "w" ? "b" : "w"));
  }, [ending, paused, running, preset, turn]);

  const finish = useCallback((result: "1-0" | "0-1" | "1/2-1/2", termination: string) => {
    setEnding({ result, termination });
    setRunning(false);
    setShowEnd(false);
  }, []);

  // Saved once, when the player leaves the result screen - not on every render.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!ending || saved || !preset) return;
    save({
      white: whiteName.trim() || "White",
      black: blackName.trim() || "Black",
      result: ending.result,
      termination: ending.termination,
      // No moves were recorded here; the PGN documents the result only.
      pgn: buildPgn({
        white: whiteName.trim() || "White",
        black: blackName.trim() || "Black",
        result: ending.result,
        termination: ending.termination,
        moves: [],
        timeControl: preset.label,
      }),
      moveCount: 0,
      mode: "in-person",
      timeControl: preset.label,
    });
    setSaved(true);
  }, [ending, saved, preset, whiteName, blackName, save]);

  if (!preset) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-night-950 px-6 py-10">
        <Link href="/play" className="text-sm text-night-400 hover:text-white">
          &larr; Back
        </Link>
        <h1 className="mt-4 font-display text-3xl tracking-tight">Clock only</h1>
        <p className="mt-2 text-sm leading-relaxed text-night-300">
          For a real board and real pieces. This screen is just the clock - tap it to pass the move
          across.
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
            Names are only used to label the game in your history. You can leave them blank.
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
        </div>

        <Link
          href="/play/history"
          className="mt-6 block text-center text-sm text-aurora-cyan hover:underline"
        >
          Past games on this device
        </Link>
      </main>
    );
  }

  const activeIsWhite = turn === "w";
  // Not pure white: a full screen of it is unpleasant to sit opposite.
  const fill = ending
    ? "bg-night-900 text-night-200"
    : activeIsWhite
      ? "bg-[#dfe7f2] text-night-950"
      : "bg-[#0b1220] text-night-200";

  return (
    <main
      className={`flex min-h-screen flex-col transition-colors duration-200 ${fill}`}
      onClick={tap}
    >
      {ending ? (
        <ResultScreen
          ending={ending}
          whiteName={whiteName.trim() || "White"}
          blackName={blackName.trim() || "Black"}
        />
      ) : (
        <>
          <ClockHalf
            ms={blackMs}
            name={blackName.trim() || "Black"}
            active={activeIsWhite === false && running && !paused}
            noClock={noClock}
            rotated
          />

          <div className="flex items-center justify-center gap-2 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPaused((p) => !p);
              }}
              disabled={!running}
              className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-inset ring-current/30 disabled:opacity-40"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEnd(true);
              }}
              className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-inset ring-current/30"
            >
              End game
            </button>
            <Link
              href="/play"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg px-3 py-1.5 text-xs ring-1 ring-inset ring-current/30"
            >
              Exit
            </Link>
          </div>

          <ClockHalf
            ms={whiteMs}
            name={whiteName.trim() || "White"}
            active={activeIsWhite && running && !paused}
            noClock={noClock}
          />

          {!running && <p className="pb-6 text-center text-sm opacity-70">Tap anywhere to start</p>}
        </>
      )}

      {showEnd && (
        <EndGameSheet
          onPick={finish}
          onCancel={() => setShowEnd(false)}
          whiteName={whiteName.trim() || "White"}
          blackName={blackName.trim() || "Black"}
        />
      )}
    </main>
  );
}

function ClockHalf({
  ms,
  name,
  active,
  rotated,
  noClock,
}: {
  ms: number;
  name: string;
  active: boolean;
  rotated?: boolean;
  noClock: boolean;
}) {
  const total = Math.ceil(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const display =
    ms < 10_000 && ms > 0 ? (ms / 1000).toFixed(1) : `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center ${rotated ? "rotate-180" : ""} ${
        active ? "" : "opacity-45"
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.25em]">{name}</span>
      {!noClock && (
        <>
          <span
            className={`font-mono tabular-nums ${ms < 10_000 ? "text-6xl font-bold" : "text-5xl"}`}
          >
            {display}
          </span>
          {/* Fixes which way up the numerals read - rotated, 9:00 and 0:06 are
              otherwise easy to confuse, and reading the wrong clock is worse
              than having no clock. */}
          <span aria-hidden="true" className="mt-1 h-0.5 w-12 rounded-full bg-current opacity-40" />
        </>
      )}
    </div>
  );
}

function ResultScreen({
  ending,
  whiteName,
  blackName,
}: {
  ending: NonNullable<Ending>;
  whiteName: string;
  blackName: string;
}) {
  const headline =
    ending.result === "1/2-1/2"
      ? "Draw"
      : ending.result === "1-0"
        ? `${whiteName} wins`
        : `${blackName} wins`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="font-display text-4xl">{headline}</p>
      <p className="text-sm opacity-70">by {ending.termination}</p>
      <p className="mt-1 font-mono text-sm opacity-50">{ending.result}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/play/clock"
          className="rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950"
        >
          New game
        </Link>
        <Link
          href="/play/history"
          className="rounded-lg px-4 py-2 text-sm ring-1 ring-inset ring-current/30"
        >
          History
        </Link>
        <Link
          href="/play"
          className="rounded-lg px-4 py-2 text-sm ring-1 ring-inset ring-current/30"
        >
          Main menu
        </Link>
      </div>
      <p className="mt-4 text-xs opacity-50">Saved to this device only.</p>
    </div>
  );
}

/**
 * How the game ended.
 *
 * Every legal ending is listed rather than just "white won" and "black won",
 * because the reason is the part worth recording - a game lost on time and a
 * game lost to a mating attack are different games, and the history is more
 * useful for keeping them apart.
 */
function EndGameSheet({
  onPick,
  onCancel,
  whiteName,
  blackName,
}: {
  onPick: (result: "1-0" | "0-1" | "1/2-1/2", termination: string) => void;
  onCancel: () => void;
  whiteName: string;
  blackName: string;
}) {
  const options: { label: string; result: "1-0" | "0-1" | "1/2-1/2"; termination: string }[] = [
    { label: `${whiteName} won by checkmate`, result: "1-0", termination: "checkmate" },
    { label: `${blackName} won by checkmate`, result: "0-1", termination: "checkmate" },
    { label: `${whiteName} won by resignation`, result: "1-0", termination: "resignation" },
    { label: `${blackName} won by resignation`, result: "0-1", termination: "resignation" },
    { label: "Draw by agreement", result: "1/2-1/2", termination: "agreement" },
    { label: "Draw by stalemate", result: "1/2-1/2", termination: "stalemate" },
    { label: "Draw by repetition", result: "1/2-1/2", termination: "repetition" },
    { label: "Draw by the fifty-move rule", result: "1/2-1/2", termination: "fifty-move rule" },
    {
      label: "Draw - insufficient material",
      result: "1/2-1/2",
      termination: "insufficient material",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 p-3"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        className="mx-auto w-full max-w-md rounded-2xl bg-night-900 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-1 pb-2 text-sm font-semibold text-night-200">How did it end?</p>
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {options.map((o) => (
            <li key={o.label}>
              <button
                onClick={() => onPick(o.result, o.termination)}
                className="w-full rounded-lg bg-night-800 px-3 py-2.5 text-left text-sm text-night-200 transition-colors hover:bg-night-700"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={onCancel} className="mt-2 w-full rounded-lg py-2 text-sm text-night-400">
          Cancel
        </button>
      </div>
    </div>
  );
}

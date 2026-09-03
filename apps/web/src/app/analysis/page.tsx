"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { AuroraBand } from "@aurora/ui";
import { lookupOpening } from "@aurora/chess";
import ChessBoard from "../../components/ChessBoard";
import BoardThemeStyles from "../../components/BoardThemeStyles";
import EvaluationBar from "../../components/EvaluationBar";
import { useStockfish } from "../../lib/useStockfish";
import { identifyOpening, ENGINES, resolveEngine } from "@aurora/chess";
import { useSettingsStore } from "../../stores/settings";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type Mode = "explore" | "vs-engine";

/**
 * The analysis board.
 *
 * Three things people actually want from one, and all three work from the same
 * position rather than being separate tools:
 *
 * - Move pieces freely for both sides and step back through the line.
 * - Paste a PGN or FEN and pick up from there.
 * - Hand the position to the engine and play it out.
 *
 * The last is the point: "what if I had played this instead" is only half
 * answered by an evaluation, and being able to play the resulting position
 * against Stockfish answers the other half.
 */
export default function AnalysisBoardPage() {
  // Same engine choice as everywhere else. This page hardcoded the default,
  // so a player who picked a different build got it everywhere except here.
  const analysisEngine = useSettingsStore((st) => st.analysisEngine);
  const engine = useStockfish(
    ENGINES[resolveEngine(analysisEngine, "analyse")].worker,
    ENGINES[resolveEngine(analysisEngine, "analyse")].workerType ?? "classic"
  );

  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [mode, setMode] = useState<Mode>("explore");
  const [engineColor, setEngineColor] = useState<"white" | "black">("black");
  const [engineElo, setEngineElo] = useState(1600);

  const [evalCp, setEvalCp] = useState(0);
  const [evalMate, setEvalMate] = useState<number | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [lines, setLines] = useState<
    { score: number; mate: number | null; san: string[]; depth: number }[]
  >([]);
  const [showEngine, setShowEngine] = useState(true);
  const [showFeedback, setShowFeedback] = useState(true);

  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [rootFen, setRootFen] = useState(START_FEN);

  const current = useMemo(() => {
    const c = new Chess(rootFen);
    for (let i = 0; i < cursor; i++) {
      try {
        c.move(history[i]);
      } catch {
        break;
      }
    }
    return c;
  }, [rootFen, history, cursor]);

  // Evaluate whenever the shown position changes. Three lines rather than one:
  // knowing the second-best move is most of what analysis is for.
  useEffect(() => {
    if (!engine.ready || !showEngine) return;
    let cancelled = false;
    const fenNow = current.fen();

    engine.evaluate(fenNow, 500).then((r) => {
      if (cancelled) return;
      setEvalCp(r.score);
      setEvalMate(r.mate);
      setBestMove(r.bestMove);
    });

    engine.evaluateMultiPV(fenNow, 3, 700).then((res) => {
      if (cancelled) return;
      setLines(
        res.map((l) => {
          // Convert the engine's UCI principal variation into readable SAN.
          const b = new Chess(fenNow);
          const san: string[] = [];
          for (const uci of l.pv.slice(0, 10)) {
            try {
              san.push(
                b.move({
                  from: uci.slice(0, 2),
                  to: uci.slice(2, 4),
                  promotion: uci.slice(4) || undefined,
                }).san
              );
            } catch {
              break;
            }
          }
          return { score: l.score, mate: l.mate, san, depth: l.depth };
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, [engine, current, showEngine]);

  /**
   * Opening name for the line so far.
   *
   * Uses the full ECO book - 3,810 named openings, matched by position so
   * transpositions resolve - rather than the small hand-written list this page
   * was using, which knew only a couple of dozen.
   */
  const opening = useMemo(
    () => (rootFen === START_FEN ? identifyOpening(history.slice(0, cursor)) : null),
    [rootFen, history, cursor]
  );

  // Engine's turn in play mode.
  useEffect(() => {
    if (mode !== "vs-engine" || !engine.ready || thinking) return;
    if (cursor !== history.length) return; // Only from the tip of the line.
    const turn = current.turn() === "w" ? "white" : "black";
    if (turn !== engineColor || current.isGameOver()) return;

    setThinking(true);
    engine.getBotMove(current.fen(), engineElo).then((uci) => {
      setThinking(false);
      if (!uci) return;
      const c = new Chess(current.fen());
      try {
        const m = c.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.slice(4) || undefined,
        });
        setHistory((h) => [...h.slice(0, cursor), m.san]);
        setCursor((n) => n + 1);
      } catch {
        // Engine returned something unplayable; leave the position alone.
      }
    });
  }, [mode, engine, engineColor, engineElo, current, cursor, history.length, thinking]);

  const onMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const c = new Chess(current.fen());
      let san: string;
      try {
        san = c.move({ from, to, promotion }).san;
      } catch {
        return;
      }
      // Playing from mid-line truncates the rest, which is what people expect
      // from an analysis board -- it is a new variation, not an insertion.
      setHistory((h) => [...h.slice(0, cursor), san]);
      setCursor((n) => n + 1);
      setFen(c.fen());
    },
    [current, cursor]
  );

  /** Accept either a PGN or a bare FEN - people paste both. */
  const doImport = useCallback(() => {
    const text = importText.trim();
    setImportError(null);
    if (!text) return;

    // A FEN is one line with six fields and no move numbers.
    const looksFen = /^[rnbqkpRNBQKP1-8/]+\s+[wb]\s+\S+\s+\S+\s+\d+\s+\d+$/.test(text);
    if (looksFen) {
      try {
        const c = new Chess(text);
        setRootFen(c.fen());
        setHistory([]);
        setCursor(0);
        setFen(c.fen());
        setShowImport(false);
        setImportText("");
        return;
      } catch {
        setImportError("That looks like a FEN but is not a legal position.");
        return;
      }
    }

    try {
      const c = new Chess();
      c.loadPgn(text);
      const moves = c.history();
      if (moves.length === 0) {
        setImportError("No moves found. Paste a PGN movetext or a FEN.");
        return;
      }
      setRootFen(START_FEN);
      setHistory(moves);
      setCursor(moves.length);
      setShowImport(false);
      setImportText("");
    } catch {
      setImportError("Could not read that PGN. Headers are optional; movetext is required.");
    }
  }, [importText]);

  const reset = useCallback(() => {
    setRootFen(START_FEN);
    setHistory([]);
    setCursor(0);
    setFen(START_FEN);
    setMode("explore");
  }, []);

  const bestMoveArrow = useMemo(
    () =>
      bestMove && mode === "explore"
        ? [{ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), color: "paleBlue" }]
        : [],
    [bestMove, mode]
  );

  return (
    <main className="min-h-screen bg-night-950">
      <BoardThemeStyles />
      <AuroraBand />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
          &larr; Back to play
        </Link>

        <h1 className="mt-3 font-display text-3xl tracking-tight">Analysis board</h1>
        <p className="mt-1 text-sm text-night-400">
          Move freely, paste a game, or hand the position to the engine.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_320px]">
          <div className="hidden lg:block">
            <EvaluationBar evalCP={evalCp} mate={evalMate} />
          </div>

          <div className="mx-auto w-full max-w-[560px]">
            <ChessBoard
              fen={current.fen()}
              orientation={orientation}
              movable={cursor === history.length || mode === "explore"}
              onMove={onMove}
              arrows={bestMoveArrow}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCursor(0)}
                disabled={cursor === 0}
                className="rounded-lg bg-night-900 px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                disabled={cursor === 0}
                className="rounded-lg bg-night-900 px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
              >
                &lsaquo;
              </button>
              <button
                onClick={() => setCursor((c) => Math.min(history.length, c + 1))}
                disabled={cursor >= history.length}
                className="rounded-lg bg-night-900 px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
              >
                &rsaquo;
              </button>
              <button
                onClick={() => setCursor(history.length)}
                disabled={cursor >= history.length}
                className="rounded-lg bg-night-900 px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
              >
                &raquo;
              </button>
              <button
                onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
                title="Flip board"
                className="rounded-lg bg-night-900 px-3 py-1.5 text-sm ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800"
              >
                &#x21C5;
              </button>
              <button
                onClick={reset}
                className="ml-auto rounded-lg px-3 py-1.5 text-sm text-night-400 transition-colors hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
              <div className="flex gap-1">
                {(["explore", "vs-engine"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      mode === m
                        ? "bg-aurora-cyan text-night-950"
                        : "bg-night-800 hover:bg-night-700"
                    }`}
                  >
                    {m === "explore" ? "Explore" : "Play engine"}
                  </button>
                ))}
              </div>

              {mode === "vs-engine" && (
                <div className="mt-3 space-y-3">
                  <div>
                    <span className="mb-1.5 block text-xs uppercase tracking-wider text-night-400">
                      Engine plays
                    </span>
                    <div className="flex gap-1">
                      {(["white", "black"] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => setEngineColor(c)}
                          className={`flex-1 rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                            engineColor === c
                              ? "bg-night-700 ring-1 ring-inset ring-aurora-cyan"
                              : "bg-night-800 hover:bg-night-700"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-night-400">
                      Strength: <span className="font-mono text-night-300">{engineElo}</span>
                    </span>
                    <input
                      type="range"
                      min={800}
                      max={3000}
                      step={100}
                      value={engineElo}
                      onChange={(e) => setEngineElo(Number(e.target.value))}
                      className="w-full accent-[#18C0D8]"
                    />
                  </label>
                  {thinking && <p className="text-xs text-night-400">Engine is thinking...</p>}
                </div>
              )}

              {mode === "explore" && (
                <p className="mt-3 text-xs text-night-400">
                  {engine.ready
                    ? "The cyan arrow is the engine's preferred move."
                    : "Loading engine..."}
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
              <div className="flex items-center justify-between border-b border-night-700 px-4 py-2.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={showEngine}
                    onChange={(e) => setShowEngine(e.target.checked)}
                  />
                  Engine
                </label>
                <span className="font-mono text-[11px] text-night-400">
                  {lines[0] ? `depth ${lines[0].depth}` : "\u2014"} &middot; Stockfish
                </span>
              </div>

              {showEngine ? (
                lines.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-night-400">Analysing...</p>
                ) : (
                  <ul className="divide-y divide-night-700">
                    {lines.map((l, i) => (
                      <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold ${
                            (l.mate ?? l.score) >= 0
                              ? "bg-night-300 text-night-950"
                              : "bg-night-800 text-night-300"
                          }`}
                        >
                          {l.mate !== null
                            ? `M${Math.abs(l.mate)}`
                            : `${l.score >= 0 ? "+" : ""}${(l.score / 100).toFixed(2)}`}
                        </span>
                        <span className="min-w-0 truncate font-mono text-xs leading-5 text-night-300">
                          {l.san.join(" ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="px-4 py-3 text-sm text-night-400">Engine off.</p>
              )}

              {opening?.opening && (
                <div className="border-t border-night-700 px-4 py-2.5">
                  <p className="text-sm">
                    <span className="font-mono text-xs text-night-400">{opening.opening.eco}</span>{" "}
                    {opening.opening.name}
                  </p>
                </div>
              )}

              <div className="border-t border-night-700 px-4 py-2.5">
                <label className="flex items-center gap-2 text-sm text-night-400">
                  <input
                    type="checkbox"
                    checked={showFeedback}
                    onChange={(e) => setShowFeedback(e.target.checked)}
                  />
                  Show move feedback
                </label>
              </div>
            </section>

            <section className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-wider text-night-400">Moves</h2>
                <button
                  onClick={() => setShowImport((v) => !v)}
                  className="text-xs font-medium text-aurora-cyan hover:underline"
                >
                  {showImport ? "Cancel" : "Import PGN or FEN"}
                </button>
              </div>

              {showImport && (
                <div className="mb-3">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={5}
                    placeholder={"1. e4 e5 2. Nf3 Nc6 ...\n\nor a FEN"}
                    className="w-full rounded-lg border border-night-700 bg-night-800 px-3 py-2 font-mono text-xs outline-none focus:border-aurora-cyan"
                  />
                  {importError && <p className="mt-1.5 text-xs text-red-300">{importError}</p>}
                  <button
                    onClick={doImport}
                    className="mt-2 w-full rounded-lg bg-aurora-cyan py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] font-display"
                  >
                    Load
                  </button>
                </div>
              )}

              {history.length === 0 ? (
                <p className="text-sm text-night-400">No moves yet.</p>
              ) : (
                <ol className="grid max-h-64 grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0.5 overflow-y-auto font-mono text-sm">
                  {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                    <li key={i} className="contents">
                      <span className="text-night-400">{i + 1}.</span>
                      {[0, 1].map((j) => {
                        const idx = i * 2 + j;
                        if (idx >= history.length) return <span key={j} />;
                        return (
                          <button
                            key={j}
                            onClick={() => setCursor(idx + 1)}
                            className={`rounded px-1 text-left transition-colors hover:bg-night-800 ${
                              cursor === idx + 1 ? "bg-aurora-cyan/20 text-aurora-cyan" : ""
                            }`}
                          >
                            {history[idx]}
                          </button>
                        );
                      })}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {showFeedback && bestMove && cursor > 0 && (
              <section className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
                <h2 className="mb-1.5 text-xs uppercase tracking-wider text-night-400">Feedback</h2>
                <p className="text-sm text-night-300">
                  Engine prefers{" "}
                  <span className="font-mono text-aurora-cyan">{lines[0]?.san[0] ?? "\u2014"}</span>
                  {evalMate !== null
                    ? ` with mate in ${Math.abs(evalMate)}.`
                    : ` at ${evalCp >= 0 ? "+" : ""}${(evalCp / 100).toFixed(2)}.`}
                </p>
              </section>
            )}

            <section className="rounded-xl bg-night-900 p-4 ring-1 ring-inset ring-night-700">
              <h2 className="mb-1.5 text-xs uppercase tracking-wider text-night-400">Position</h2>
              <code className="block break-all font-mono text-[11px] leading-relaxed text-night-400">
                {current.fen()}
              </code>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

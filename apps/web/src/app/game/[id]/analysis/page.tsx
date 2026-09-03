"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GameNoteEditor from "../../../../components/GameNoteEditor";
import ExportPGN from "../../../../components/ExportPGN";
import KeyboardShortcutsHelp from "../../../../components/KeyboardShortcutsHelp";
import { useKeyboardShortcuts } from "../../../../lib/useKeyboardShortcuts";
import api from "../../../../lib/api";
import { useAuthStore } from "../../../../stores/auth";
import dynamic from "next/dynamic";
import { BoardSkeleton } from "@aurora/ui";

const ChessBoard = dynamic(() => import("../../../../components/ChessBoard"), {
  loading: () => <BoardSkeleton />,
  ssr: false,
});
const EvaluationBar = dynamic(() => import("../../../../components/EvaluationBar"), {
  ssr: false,
});
const EvalGraph = dynamic(() => import("../../../../components/EvalGraph"), {
  ssr: false,
});
import type { Player } from "@aurora/chess";
import { CLASSIFICATION_COLORS, CLASSIFICATION_SYMBOLS } from "@aurora/chess";
import { Chess } from "chess.js";
import { useClientAnalysis } from "../../../../lib/useClientAnalysis";
import EngineLines from "../../../../components/EngineLines";
import { identifyOpening, ENGINES, resolveEngine } from "@aurora/chess";
import { useSettingsStore } from "../../../../stores/settings";
import type { EngineLine } from "../../../../lib/useStockfish";
import { useOnlineStatus } from "../../../../lib/useOnlineStatus";
import AnalysisProgress from "../../../../components/AnalysisProgress";
import MoveTimeline from "../../../../components/MoveTimeline";

interface FeedbackEntry {
  ply: number;
  san: string;
  uci: string;
  fen: string;
  classification: string;
  bestMove: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  /** Moves to mate, when the position is forced. */
  mateAfter: number | null;
}

interface Analysis {
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  opening: { name: string; eco: string } | null;
  feedback: FeedbackEntry[];
}

export default function AnalysisPage() {
  const params = useParams();
  const gameId = params.id as string;
  const { fetchMe } = useAuthStore();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [white, setWhite] = useState<Player | null>(null);
  const [black, setBlack] = useState<Player | null>(null);
  const [serverProgress, setServerProgress] = useState<{
    currentMove: number;
    totalMoves: number;
  } | null>(null);
  const isOnline = useOnlineStatus();
  const [gameMoves, setGameMoves] = useState<
    { ply: number; san: string; uci: string; fen: string }[]
  >([]);
  // The engine the player picked, falling back if their stored choice cannot
  // analyse - Maia predicts human moves rather than best ones.
  const analysisEngine = useSettingsStore((st) => st.analysisEngine);
  const chosenEngine = resolveEngine(analysisEngine, "analyse");

  const clientAnalysis = useClientAnalysis();
  const [candidateLines, setCandidateLines] = useState<EngineLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [currentPly, setCurrentPly] = useState(0);
  const [startingFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const totalMoves = analysis?.feedback.length || 0;
  useKeyboardShortcuts({
    ArrowLeft: () => setCurrentPly((p) => Math.max(0, p - 1)),
    ArrowRight: () => setCurrentPly((p) => Math.min(totalMoves, p + 1)),
    Home: () => setCurrentPly(0),
    End: () => setCurrentPly(totalMoves),
    Escape: () => setShowShortcuts(false),
    "?": () => setShowShortcuts((s) => !s),
  });

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const loadAnalysis = useCallback(async () => {
    try {
      const [analysisRes, gameRes] = await Promise.all([
        api.get(`/api/v1/games/${gameId}/analysis`),
        api.get(`/api/v1/games/${gameId}`),
      ]);

      setStatus(analysisRes.data.status);
      setAnalysis(analysisRes.data.analysis);
      if (analysisRes.data.progress) {
        setServerProgress(analysisRes.data.progress);
      }
      setWhite(gameRes.data.game.white);
      setBlack(gameRes.data.game.black);
      if (gameRes.data.game.moves) {
        setGameMoves(
          gameRes.data.game.moves.map(
            (m: { ply: number; san: string; uci: string; fen: string }) => ({
              ply: m.ply,
              san: m.san,
              uci: m.uci || "",
              fen: m.fen,
            })
          )
        );
      }
    } catch {
      setStatus("error");
    }
  }, [gameId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  // Poll while the job is anywhere short of finished.
  //
  // "none" is included deliberately: there is a window between enqueueing and
  // the worker picking the job up where no status exists yet. Treating that as
  // terminal is what left the page frozen until a manual refresh.
  useEffect(() => {
    if (status === "done" || status === "error") return;
    const interval = setInterval(loadAnalysis, 2000);
    return () => clearInterval(interval);
  }, [status, loadAnalysis]);

  // Convert client analysis results to Analysis format when complete
  useEffect(() => {
    if (clientAnalysis.accuracy && clientAnalysis.results.length > 0) {
      setAnalysis({
        whiteAccuracy: clientAnalysis.accuracy.white,
        blackAccuracy: clientAnalysis.accuracy.black,
        opening: null,
        feedback: clientAnalysis.results.map((r) => ({
          ply: r.ply,
          san: r.san,
          uci: r.uci,
          fen: r.fen,
          classification: r.classification,
          bestMove: r.bestMove,
          evalBefore: r.evalBefore,
          evalAfter: r.evalAfter,
          mateAfter: r.mateAfter ?? null,
        })),
      });
      setStatus("done");
    }
  }, [clientAnalysis.accuracy, clientAnalysis.results]);

  async function requestAnalysis() {
    try {
      await api.post(`/api/v1/games/${gameId}/analysis`);
      setStatus("queued");
    } catch {
      setStatus("error");
    }
  }

  // Determine current position
  const currentFen =
    currentPly === 0
      ? startingFen
      : analysis?.feedback.find((f) => f.ply === currentPly)?.fen ||
        gameMoves.find((m) => m.ply === currentPly)?.fen ||
        startingFen;

  /**
   * A line played out from the current position.
   *
   * The board was inert - `movable={false}` with a no-op handler - so there was
   * no way to ask "what if". Exploration lives alongside the game rather than
   * replacing it: stepping the move list clears it and puts you back on the
   * real game.
   */
  const [explored, setExplored] = useState<{ fen: string; sans: string[] } | null>(null);

  const exploreMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const base = explored?.fen ?? currentFen;
      const board = new Chess(base);
      try {
        const move = board.move({ from, to, promotion: promotion ?? "q" });
        if (!move) return false;
        setExplored({
          fen: board.fen(),
          sans: [...(explored?.sans ?? []), move.san],
        });
        return true;
      } catch {
        return false;
      }
    },
    [explored, currentFen]
  );

  // Candidate lines share ONE Stockfish worker with the bulk analysis run.
  //
  // Requesting them while that run is in progress makes the two contend for the
  // same engine: the bulk pass stalls, never completes, and the board stays
  // disabled waiting for it. So this waits until the run is finished, which is
  // also when someone is actually stepping through looking for alternatives.
  useEffect(() => {
    if (!clientAnalysis.engineReady || !currentFen) return;
    if (clientAnalysis.analysing) return;
    let cancelled = false;
    setLinesLoading(true);
    clientAnalysis
      .evaluateMultiPV(explored?.fen ?? currentFen, 3, 1200)
      .then((r) => {
        // The board may have moved on while the engine was thinking.
        if (!cancelled) setCandidateLines(r);
      })
      .catch(() => {
        if (!cancelled) setCandidateLines([]);
      })
      .finally(() => {
        if (!cancelled) setLinesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentFen, explored, clientAnalysis.engineReady, clientAnalysis.analysing]);

  // Current eval
  const currentFeedback = analysis?.feedback.find((f) => f.ply === currentPly);
  const currentEval = currentFeedback?.evalAfter ?? 0;
  // Passed through rather than hardcoded to null, which is why every forced
  // mate displayed as "+1000.0".
  const currentMate = currentFeedback?.mateAfter ?? null;

  useEffect(() => {
    // Moving through the real game abandons any side line, which is what
    // clicking a move plainly means.
    setExplored(null);
  }, [currentPly]);

  // Last move
  // Opening name for the position currently shown, so it updates as you step
  // through rather than only naming the game as a whole.
  const openingHere = identifyOpening(
    gameMoves.filter((m) => m.ply <= currentPly).map((m) => m.san)
  );

  const lastMoveFeedback =
    analysis?.feedback.find((f) => f.ply === currentPly) ??
    gameMoves.find((m) => m.ply === currentPly);
  const lastMove = lastMoveFeedback?.uci
    ? ([lastMoveFeedback.uci.slice(0, 2), lastMoveFeedback.uci.slice(2, 4)] as [string, string])
    : undefined;

  // Best move arrow for bad moves
  const showBestArrow =
    currentFeedback &&
    currentFeedback.bestMove &&
    ["INACCURACY", "MISTAKE", "BLUNDER"].includes(currentFeedback.classification);
  const bestMoveArrow =
    showBestArrow && currentFeedback?.bestMove
      ? [
          {
            from: currentFeedback.bestMove.slice(0, 2),
            to: currentFeedback.bestMove.slice(2, 4),
            color: "green",
          },
        ]
      : undefined;

  // Eval graph points
  const evalPoints =
    analysis?.feedback.map((f) => ({
      ply: f.ply,
      eval: f.evalAfter ?? 0,
      mate: null as number | null,
    })) || [];

  // Classification counts
  function countClassifications(side: "white" | "black") {
    if (!analysis) return {};
    const counts: Record<string, number> = {};
    analysis.feedback.forEach((f) => {
      const isWhite = f.ply % 2 === 1;
      if ((side === "white" && isWhite) || (side === "black" && !isWhite)) {
        counts[f.classification] = (counts[f.classification] || 0) + 1;
      }
    });
    return counts;
  }

  if (status === "loading") {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  /**
   * No analysis has been run yet.
   *
   * Rendered as a banner over the normal page rather than instead of it. The
   * previous version returned early with just a prompt, so the board and move
   * list were absent entirely and the page looked broken rather than idle.
   */
  const notAnalysed = status === "none";

  if (status === "client-analysing") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-lg w-full">
          <h1 className="text-xl font-bold text-center mb-4 font-display">Analysing in Browser</h1>
          <AnalysisProgress
            currentPly={clientAnalysis.currentPly}
            totalMoves={clientAnalysis.totalMoves}
            progress={clientAnalysis.progress}
            evalPoints={clientAnalysis.evalPoints}
            onCancel={() => {
              clientAnalysis.cancel();
              setStatus("none");
            }}
          />
        </div>
      </main>
    );
  }

  if (status === "queued" || status === "processing") {
    const serverCurrentMove = serverProgress?.currentMove ?? 0;
    const serverTotalMoves = (serverProgress?.totalMoves ?? gameMoves.length) || 1;
    const serverPct = serverTotalMoves > 0 ? (serverCurrentMove / serverTotalMoves) * 100 : 0;

    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-lg w-full">
          <h1 className="text-xl font-bold text-center mb-4 font-display">
            Server Analysis (Depth 18)
          </h1>
          <AnalysisProgress
            currentPly={serverCurrentMove}
            totalMoves={serverTotalMoves}
            progress={serverPct}
            evalPoints={[]}
            onCancel={() => setStatus("none")}
          />
          {status === "queued" && (
            <p className="text-night-400 text-sm text-center mt-2">Waiting in queue...</p>
          )}
        </div>
      </main>
    );
  }

  if (status === "error" || !analysis) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">Analysis failed.</p>
          <button
            onClick={() => setStatus("none")}
            className="px-4 py-2 bg-aurora-cyan hover:bg-[#3ad2e8] rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const whiteCounts = countClassifications("white");
  const blackCounts = countClassifications("black");

  // Group moves into pairs for the move list
  const pairs: { num: number; white?: FeedbackEntry; black?: FeedbackEntry }[] = [];
  for (const f of analysis.feedback) {
    const num = Math.ceil(f.ply / 2);
    if (f.ply % 2 === 1) {
      pairs.push({ num, white: f });
    } else {
      if (pairs.length > 0 && pairs[pairs.length - 1].num === num) {
        pairs[pairs.length - 1].black = f;
      } else {
        pairs.push({ num, black: f });
      }
    }
  }

  /**
   * The moves to display.
   *
   * Falls back to the game's own moves when no analysis has been run. Every
   * part of this page read `analysis.feedback`, so before analysing the board
   * showed the starting position and the move list was empty - the game looked
   * like it had failed to load rather than simply not being analysed yet.
   */
  const displayMoves =
    analysis?.feedback && analysis.feedback.length > 0
      ? analysis.feedback.map((f) => ({ ply: f.ply, san: f.san }))
      : gameMoves.map((m) => ({ ply: m.ply, san: m.san }));

  const timelineMoves = displayMoves;

  return (
    <main className="flex flex-col h-[100dvh] lg:h-auto lg:min-h-screen overflow-hidden lg:overflow-auto p-1 lg:p-4">
      <div className="max-w-6xl mx-auto flex flex-col flex-1 min-h-0 lg:block w-full">
        <div className="flex flex-col lg:flex-row gap-1 lg:gap-6 items-start flex-1 min-h-0">
          {notAnalysed && (
            <div className="mb-2 w-full rounded-lg bg-aurora-cyan/10 px-4 py-3 ring-1 ring-inset ring-aurora-cyan/30 lg:absolute lg:top-2">
              <p className="text-sm text-night-200">
                This game has not been analysed yet. You can step through it now, or run the engine
                over every move.
              </p>
              <button
                onClick={() => {
                  if (isOnline) {
                    requestAnalysis();
                  } else if (gameMoves.length > 0 && clientAnalysis.ready) {
                    setStatus("client-analysing");
                    clientAnalysis.analyse(gameMoves);
                  }
                }}
                disabled={!isOnline && (!clientAnalysis.ready || gameMoves.length === 0)}
                className="mt-2 rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-semibold text-night-950 disabled:opacity-50"
              >
                Analyse this game
              </button>
            </div>
          )}

          {/* ── LEFT: Board area ── */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full justify-center lg:justify-start">
            {openingHere.opening && (
              <div className="mb-1 flex items-baseline gap-2 px-1">
                <span className="rounded bg-night-800 px-1.5 py-0.5 font-mono text-[10px] text-night-400">
                  {openingHere.opening.eco}
                </span>
                <span className="truncate text-sm text-night-300">{openingHere.opening.name}</span>
              </div>
            )}

            {/* Accuracy summary (compact on mobile) */}
            <div className="flex items-center justify-between px-1 py-0.5 text-xs">
              <span className="text-night-400">
                {white?.username || "White"}:{" "}
                <strong>{analysis.whiteAccuracy?.toFixed(1) ?? "-"}%</strong>
              </span>
              <span className="text-night-400">
                {black?.username || "Black"}:{" "}
                <strong>{analysis.blackAccuracy?.toFixed(1) ?? "-"}%</strong>
              </span>
            </div>

            {/* Mobile: horizontal eval bar */}
            <div className="lg:hidden h-3 w-full">
              <EvaluationBar evalCP={currentEval} mate={currentMate} />
            </div>

            {/* Eval bar + board (desktop: side by side) */}
            <div className="flex gap-2 items-stretch">
              <div className="hidden lg:flex">
                <EvaluationBar evalCP={currentEval} mate={currentMate} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="relative w-full lg:max-w-[480px]">
                  <ChessBoard
                    fen={explored?.fen ?? currentFen}
                    orientation="white"
                    movable={true}
                    /* Both sides. An analysis board where you can only move
                       white is not an analysis board - exploring any line for
                       black was impossible. */
                    playerColor="both"
                    premovable
                    lastMove={lastMove}
                    check={false}
                    onMove={exploreMove}
                    arrows={bestMoveArrow}
                  />
                </div>
              </div>
            </div>

            {/* Mobile: eval graph (compact) */}
            <div className="lg:hidden h-16">
              <EvalGraph points={evalPoints} currentPly={currentPly} onClickPly={setCurrentPly} />
            </div>

            {/* Mobile: move timeline with nav */}
            <div className="lg:hidden">
              <MoveTimeline
                moves={timelineMoves}
                currentPly={currentPly}
                totalMoves={analysis.feedback.length}
                onGoToPly={setCurrentPly}
              />
            </div>

            {/* Mobile: current move classification */}
            {currentFeedback && (
              <div className="lg:hidden text-center py-0.5">
                <span
                  className={`text-sm font-bold ${CLASSIFICATION_COLORS[currentFeedback.classification] || ""}`}
                >
                  {CLASSIFICATION_SYMBOLS[currentFeedback.classification] || ""}{" "}
                  {currentFeedback.classification}
                </span>
              </div>
            )}

            {/* Mobile: compact actions */}
            <div className="lg:hidden flex gap-1.5 justify-center px-1 py-0.5">
              <Link
                href={`/game/${gameId}`}
                className="px-2 py-1 bg-night-800 hover:bg-night-700 rounded text-xs"
              >
                {"\u2190"} Game
              </Link>
              <ExportPGN gameId={gameId} compact />
            </div>
          </div>

          {/* ── RIGHT: Desktop panel ── */}
          <div className="hidden lg:block flex-1 space-y-4 min-w-0">
            {/* Tracks the position on the board rather than naming the game
                once, so stepping back through the opening renames as you go. */}
            {(openingHere.opening ?? analysis.opening) && (
              <div className="rounded-lg bg-night-900 px-4 py-2">
                <span className="text-xs text-night-400">
                  {(openingHere.opening ?? analysis.opening)!.eco}
                </span>{" "}
                <span className="text-sm font-medium">
                  {(openingHere.opening ?? analysis.opening)!.name}
                </span>
                {openingHere.bookDepth > 0 && currentPly > openingHere.bookDepth && (
                  <span className="ml-2 text-xs text-night-400">
                    out of book after {Math.ceil(openingHere.bookDepth / 2)}
                  </span>
                )}
              </div>
            )}

            <EvalGraph points={evalPoints} currentPly={currentPly} onClickPly={setCurrentPly} />

            {explored && (
              <div className="flex items-center justify-between rounded-lg bg-aurora-cyan/10 px-3 py-2 text-sm ring-1 ring-inset ring-aurora-cyan/30">
                <span className="truncate text-night-200">
                  Exploring: {explored.sans.join(" ")}
                </span>
                <button
                  onClick={() => setExplored(null)}
                  className="shrink-0 text-xs text-aurora-cyan hover:underline"
                >
                  Back to game
                </button>
              </div>
            )}

            <section className="rounded-lg bg-night-900 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Engine lines</h2>
                {linesLoading && <span className="text-xs text-night-400">thinking...</span>}
              </div>
              <EngineLines
                fen={explored?.fen ?? currentFen}
                lines={candidateLines}
                loading={linesLoading}
              />
            </section>

            <div className="bg-night-900 rounded-lg p-3 overflow-y-auto max-h-72">
              <div className="space-y-0.5">
                {pairs.map((pair) => (
                  <div key={pair.num} className="flex items-center text-sm">
                    <span className="w-8 text-night-400 text-right mr-2 shrink-0">{pair.num}.</span>
                    {pair.white && (
                      <button
                        onClick={() => setCurrentPly(pair.white!.ply)}
                        className={`px-2 py-0.5 rounded mr-1 min-w-[5rem] text-left font-mono transition-colors ${pair.white.ply === currentPly ? "bg-aurora-cyan text-night-950" : "hover:bg-night-800 text-night-300"}`}
                      >
                        {pair.white.san}{" "}
                        <span
                          className={`text-xs ${CLASSIFICATION_COLORS[pair.white.classification] || ""}`}
                        >
                          {CLASSIFICATION_SYMBOLS[pair.white.classification] || ""}
                        </span>
                      </button>
                    )}
                    {pair.black && (
                      <button
                        onClick={() => setCurrentPly(pair.black!.ply)}
                        className={`px-2 py-0.5 rounded min-w-[5rem] text-left font-mono transition-colors ${pair.black.ply === currentPly ? "bg-aurora-cyan text-night-950" : "hover:bg-night-800 text-night-300"}`}
                      >
                        {pair.black.san}{" "}
                        <span
                          className={`text-xs ${CLASSIFICATION_COLORS[pair.black.classification] || ""}`}
                        >
                          {CLASSIFICATION_SYMBOLS[pair.black.classification] || ""}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setCurrentPly(0)}
                className="px-3 py-1.5 bg-night-800 hover:bg-night-700 rounded text-sm"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCurrentPly(Math.max(0, currentPly - 1))}
                className="px-3 py-1.5 bg-night-800 hover:bg-night-700 rounded text-sm"
              >
                &lsaquo;
              </button>
              <button
                onClick={() => setCurrentPly(Math.min(analysis.feedback.length, currentPly + 1))}
                className="px-3 py-1.5 bg-night-800 hover:bg-night-700 rounded text-sm"
              >
                &rsaquo;
              </button>
              <button
                onClick={() => setCurrentPly(analysis.feedback.length)}
                className="px-3 py-1.5 bg-night-800 hover:bg-night-700 rounded text-sm"
              >
                &raquo;
              </button>
            </div>

            <div className="bg-night-900 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-night-400 mb-3">Accuracy</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-night-400 mb-1">{white?.username || "White"}</p>
                  <p className="text-2xl font-bold font-display">
                    {analysis.whiteAccuracy?.toFixed(1) ?? "-"}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-night-400 mb-1">{black?.username || "Black"}</p>
                  <p className="text-2xl font-bold font-display">
                    {analysis.blackAccuracy?.toFixed(1) ?? "-"}%
                  </p>
                </div>
              </div>
              <h2 className="text-sm font-semibold text-night-400 mb-2">Move Classifications</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {[
                  "BRILLIANT",
                  "GREAT",
                  "BEST",
                  "EXCELLENT",
                  "GOOD",
                  "INACCURACY",
                  "MISTAKE",
                  "BLUNDER",
                ].map((cls) => (
                  <div key={cls} className="flex justify-between">
                    <span className={CLASSIFICATION_COLORS[cls]}>
                      {CLASSIFICATION_SYMBOLS[cls]} {cls.charAt(0) + cls.slice(1).toLowerCase()}
                    </span>
                    <span className="text-night-400">
                      {whiteCounts[cls] || 0} / {blackCounts[cls] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <ExportPGN gameId={gameId} />
            <GameNoteEditor gameId={gameId} />
            <div className="text-center">
              <Link href={`/game/${gameId}`} className="text-night-400 hover:text-white text-sm">
                &larr; Back to game
              </Link>
            </div>
          </div>
        </div>
      </div>

      <KeyboardShortcutsHelp
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={[
          { key: "←/→", description: "Previous/next move" },
          { key: "Home/End", description: "First/last move" },
          { key: "Esc", description: "Close modal" },
          { key: "?", description: "This help" },
        ]}
      />
    </main>
  );
}

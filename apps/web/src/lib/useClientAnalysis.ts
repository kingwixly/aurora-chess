"use client";

import { useState, useCallback, useRef } from "react";
import { useStockfish, type EngineLine } from "./useStockfish";
import {
  classifyMove,
  computeAccuracy,
  type ClassifiedMove,
  ENGINES,
  resolveEngine,
} from "@aurora/chess";
import { useSettingsStore } from "../stores/settings";

export interface AnalysisMoveResult {
  ply: number;
  san: string;
  uci: string;
  fen: string;
  classification: string;
  bestMove: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  /**
   * Moves to mate after this move, when the position is forced.
   *
   * Carried alongside the centipawn score rather than folded into it: a mate is
   * not a large advantage, it is a finished game. Clamping it to +/-1000 is what
   * made the analysis board display "+1000.0" instead of "M3".
   */
  mateAfter: number | null;
  cpLoss: number;
}

export interface EvalPoint {
  ply: number;
  eval: number;
  mate: number | null;
}

export interface ClientAnalysisState {
  /** Candidate lines from the shared engine, for the position on the board. */
  evaluateMultiPV: (fen: string, numLines?: number, movetimeMs?: number) => Promise<EngineLine[]>;
  /** Whether that engine has finished loading. */
  engineReady: boolean;
  /** Non-null when analysis aborted; shown to the user rather than hanging. */
  error: string | null;
  analyse: (
    moves: { ply: number; san: string; uci: string; fen: string }[],
    startFen?: string
  ) => void;
  cancel: () => void;
  analysing: boolean;
  progress: number;
  currentPly: number;
  totalMoves: number;
  results: AnalysisMoveResult[];
  accuracy: { white: number; black: number } | null;
  evalPoints: EvalPoint[];
  ready: boolean;
}

const ANALYSIS_DEPTH = 14;
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Hook that performs client-side game analysis using Stockfish WASM.
 * Analyses each move sequentially with real-time progress tracking.
 */
export function useClientAnalysis(): ClientAnalysisState {
  // Whichever engine the player picked for analysis. Falls back if their
  // stored choice is not usable for it.
  const analysisEngine = useSettingsStore((st) => st.analysisEngine);
  const stockfish = useStockfish(
    ENGINES[resolveEngine(analysisEngine, "analyse")].worker,
    ENGINES[resolveEngine(analysisEngine, "analyse")].workerType ?? "classic"
  );
  const [analysing, setAnalysing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPly, setCurrentPly] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [results, setResults] = useState<AnalysisMoveResult[]>([]);
  const [accuracy, setAccuracy] = useState<{ white: number; black: number } | null>(null);
  const [evalPoints, setEvalPoints] = useState<EvalPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const analyse = useCallback(
    async (
      moves: { ply: number; san: string; uci: string; fen: string }[],
      startFen: string = START_FEN
    ) => {
      if (!stockfish.ready || analysing) return;

      cancelledRef.current = false;
      setAnalysing(true);
      setTotalMoves(moves.length);
      setCurrentPly(0);
      setProgress(0);
      setResults([]);
      setAccuracy(null);
      setEvalPoints([]);
      setError(null);

      try {
        const moveResults: AnalysisMoveResult[] = [];
        const points: EvalPoint[] = [];
        const whiteCpLosses: number[] = [];
        const blackCpLosses: number[] = [];

        // Evaluate starting position
        let prevEval = await stockfish.evaluate(startFen);
        points.push({ ply: 0, eval: prevEval.score, mate: prevEval.mate });
        setEvalPoints([...points]);

        for (let i = 0; i < moves.length; i++) {
          if (cancelledRef.current) break;

          const move = moves[i];
          const fenBefore = i === 0 ? startFen : moves[i - 1].fen;

          // Evaluate position after this move
          const evalAfterResult = await stockfish.evaluate(move.fen);
          if (cancelledRef.current) break;

          // Get multi-PV for the position before the move (for brilliant detection)
          let nextBestEval: number | null = null;
          const multiPV = await stockfish.evaluateMultiPV(fenBefore, 2);
          if (multiPV.length >= 2) {
            nextBestEval = multiPV[1].score;
          }
          if (cancelledRef.current) break;

          const bestMoveUCI = prevEval.bestMove || move.uci;
          const classified: ClassifiedMove = classifyMove(
            fenBefore,
            move.uci,
            prevEval.score,
            evalAfterResult.score,
            bestMoveUCI,
            nextBestEval
          );

          const result: AnalysisMoveResult = {
            ply: move.ply,
            san: move.san,
            uci: move.uci,
            fen: move.fen,
            classification: classified.classification,
            bestMove: classified.bestMove,
            evalBefore: classified.evalBefore,
            evalAfter: classified.evalAfter,
            mateAfter: evalAfterResult.mate ?? null,
            cpLoss: classified.cpLoss,
          };

          moveResults.push(result);
          points.push({
            ply: move.ply,
            eval: evalAfterResult.score,
            mate: evalAfterResult.mate,
          });

          // Track CP losses per player
          if (move.ply % 2 === 1) {
            whiteCpLosses.push(classified.cpLoss);
          } else {
            blackCpLosses.push(classified.cpLoss);
          }

          prevEval = evalAfterResult;
          setResults([...moveResults]);
          setEvalPoints([...points]);
          setCurrentPly(i + 1);
          setProgress(Math.round(((i + 1) / moves.length) * 100));
        }

        if (!cancelledRef.current) {
          setAccuracy({
            white: computeAccuracy(whiteCpLosses),
            black: computeAccuracy(blackCpLosses),
          });
        }
      } catch (err) {
        // Partial results are kept: an engine failure at move 30 should not
        // discard the 29 moves already analysed.
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setAnalysing(false);
      }
    },
    [stockfish, analysing]
  );

  return {
    // Exposed so the page can request candidate lines from the SAME engine.
    // A second Stockfish would mean a second multi-megabyte download.
    evaluateMultiPV: stockfish.evaluateMultiPV,
    engineReady: stockfish.ready,
    analyse,
    cancel,
    analysing,
    progress,
    currentPly,
    totalMoves,
    results,
    accuracy,
    error,
    evalPoints,
    ready: stockfish.ready,
  };
}

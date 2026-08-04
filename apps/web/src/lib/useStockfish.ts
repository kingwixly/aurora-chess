"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface EngineLine {
  score: number;
  mate: number | null;
  pv: string[];
  depth: number;
}

interface StockfishHook {
  ready: boolean;
  getBotMove: (fen: string, elo: number) => Promise<string | null>;
  evaluate: (fen: string) => Promise<{ score: number; bestMove: string | null }>;
  evaluateMultiPV: (fen: string, numLines?: number) => Promise<EngineLine[]>;
}

/**
 * Hook that initializes a Stockfish Web Worker and provides methods
 * to get bot moves (with Elo-limited strength) and evaluate positions.
 *
 * Loads stockfish.js directly as a Web Worker — it auto-initializes in
 * worker context and communicates via raw UCI string messages.
 *
 * @returns An object with `ready` state, `getBotMove`, and `evaluate` functions.
 */
export function useStockfish(): StockfishHook {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const resolverRef = useRef<{
    resolve: (lines: string[]) => void;
    lines: string[];
    waitFor: string;
  } | null>(null);

  useEffect(() => {
    // stockfish.js auto-detects worker context and sets up its own onmessage/postMessage
    // It communicates with raw UCI strings, not structured objects
    const worker = new Worker("/stockfish/stockfish.js");
    workerRef.current = worker;

    let initialized = false;

    worker.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);

      // Stockfish outputs "uciok" after receiving "uci" — that means it's ready
      if (!initialized && line.includes("uciok")) {
        initialized = true;
        worker.postMessage("isready");
      }
      if (!initialized && line.includes("readyok")) {
        // fallback: some builds send readyok without uci first
        initialized = true;
        setReady(true);
        return;
      }
      if (initialized && line.includes("readyok") && !ready) {
        setReady(true);
      }

      // Feed lines to the active resolver
      if (resolverRef.current) {
        resolverRef.current.lines.push(line);
        if (line.includes(resolverRef.current.waitFor)) {
          const r = resolverRef.current;
          resolverRef.current = null;
          r.resolve(r.lines);
        }
      }
    };

    // Send initial UCI handshake
    worker.postMessage("uci");

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const sendCommand = useCallback(
    (cmd: string, waitFor: string, timeoutMs: number = 15000): Promise<string[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error("Worker not ready"));
          return;
        }
        resolverRef.current = { resolve, lines: [], waitFor };
        workerRef.current.postMessage(cmd);

        setTimeout(() => {
          if (resolverRef.current?.resolve === resolve) {
            resolverRef.current = null;
            reject(new Error("Stockfish timeout"));
          }
        }, timeoutMs);
      });
    },
    []
  );

  const sendRaw = useCallback((cmd: string) => {
    workerRef.current?.postMessage(cmd);
  }, []);

  const getBotMove = useCallback(
    async (fen: string, elo: number): Promise<string | null> => {
      if (!ready) return null;

      const clampedElo = Math.max(200, Math.min(3200, elo));

      // Set strength
      sendRaw("setoption name UCI_LimitStrength value true");
      sendRaw(`setoption name UCI_Elo value ${clampedElo}`);
      await sendCommand("isready", "readyok");

      sendRaw("ucinewgame");
      sendRaw(`position fen ${fen}`);
      await sendCommand("isready", "readyok");

      // Think time scales with elo
      const thinkTime = Math.max(200, Math.floor(clampedElo / 3));
      const lines = await sendCommand(`go movetime ${thinkTime}`, "bestmove");

      for (const line of lines) {
        if (line.startsWith("bestmove")) {
          const move = line.split(" ")[1];
          return move && move !== "(none)" ? move : null;
        }
      }
      return null;
    },
    [ready, sendCommand, sendRaw]
  );

  const evaluate = useCallback(
    async (fen: string): Promise<{ score: number; bestMove: string | null }> => {
      if (!ready) return { score: 0, bestMove: null };

      // Disable elo limiting for eval
      sendRaw("setoption name UCI_LimitStrength value false");
      await sendCommand("isready", "readyok");

      sendRaw("ucinewgame");
      sendRaw(`position fen ${fen}`);
      await sendCommand("isready", "readyok");

      const lines = await sendCommand("go depth 12", "bestmove");

      let score = 0;
      let bestMove: string | null = null;
      const isBlack = fen.split(" ")[1] === "b";

      for (const line of lines) {
        if (line.startsWith("bestmove")) {
          const m = line.split(" ")[1];
          if (m && m !== "(none)") bestMove = m;
        }
        if (line.includes("score cp")) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            score = parseInt(match[1]);
            if (isBlack) score = -score;
          }
        }
        if (line.includes("score mate")) {
          const match = line.match(/score mate (-?\d+)/);
          if (match) {
            const mate = parseInt(match[1]);
            score = mate > 0 ? 100000 : -100000;
            if (isBlack) score = -score;
          }
        }
      }

      return { score, bestMove };
    },
    [ready, sendCommand, sendRaw]
  );

  const evaluateMultiPV = useCallback(
    async (fen: string, numLines: number = 3): Promise<EngineLine[]> => {
      if (!ready) return [];

      sendRaw("setoption name UCI_LimitStrength value false");
      sendRaw(`setoption name MultiPV value ${numLines}`);
      await sendCommand("isready", "readyok");

      sendRaw("ucinewgame");
      sendRaw(`position fen ${fen}`);
      await sendCommand("isready", "readyok");

      const lines = await sendCommand("go depth 16", "bestmove");

      const isBlack = fen.split(" ")[1] === "b";
      const results = new Map<number, EngineLine>();

      for (const line of lines) {
        if (!line.includes("info depth") || !line.includes("multipv")) continue;

        const depthMatch = line.match(/depth (\d+)/);
        const pvIdxMatch = line.match(/multipv (\d+)/);
        const pvMovesMatch = line.match(/ pv (.+)/);
        if (!depthMatch || !pvIdxMatch || !pvMovesMatch) continue;

        const depth = parseInt(depthMatch[1]);
        const pvIdx = parseInt(pvIdxMatch[1]);
        const pvMoves = pvMovesMatch[1].trim().split(/\s+/);

        let score = 0;
        let mate: number | null = null;
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
          mate = parseInt(mateMatch[1]);
          score = mate > 0 ? 100000 : -100000;
        } else if (cpMatch) {
          score = parseInt(cpMatch[1]);
        }
        if (isBlack) {
          score = -score;
          if (mate !== null) mate = -mate;
        }

        const prev = results.get(pvIdx);
        if (!prev || depth > prev.depth) {
          results.set(pvIdx, { score, mate, pv: pvMoves, depth });
        }
      }

      // Reset MultiPV
      sendRaw("setoption name MultiPV value 1");

      // Return sorted by pvIdx (1, 2, 3)
      return Array.from(results.entries())
        .sort(([a], [b]) => a - b)
        .map(([, v]) => v);
    },
    [ready, sendCommand, sendRaw]
  );

  return { ready, getBotMove, evaluate, evaluateMultiPV };
}

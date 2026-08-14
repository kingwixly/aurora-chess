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
  evaluate: (
    fen: string,
    movetimeMs?: number
  ) => Promise<{ score: number; mate: number | null; bestMove: string | null }>;
  evaluateMultiPV: (fen: string, numLines?: number, movetimeMs?: number) => Promise<EngineLine[]>;
}

interface PendingCommand {
  cmd: string;
  waitFor: string;
  timeoutMs: number;
  resolve: (lines: string[]) => void;
  reject: (err: Error) => void;
  lines: string[];
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Default search time per position.
 *
 * Time-bounded rather than depth-bounded on purpose. `go depth N` has no upper
 * bound on wall-clock time -- on single-threaded WASM a depth-16 MultiPV search
 * can run for a minute on a sharp middlegame position. That is what previously
 * blew the command timeout and killed analysis a couple of moves in.
 */
const DEFAULT_MOVETIME_MS = 600;

/**
 * Hook that runs Stockfish in a Web Worker.
 *
 * Commands are strictly serialised through a queue. The engine speaks a single
 * line-oriented protocol with no request IDs, so two searches in flight at once
 * would interleave their `info` lines with no way to tell them apart.
 */
export function useStockfish(): StockfishHook {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  const queueRef = useRef<PendingCommand[]>([]);
  const activeRef = useRef<PendingCommand | null>(null);

  const finish = useCallback((err?: Error) => {
    const active = activeRef.current;
    activeRef.current = null;
    if (active) {
      if (active.timer) clearTimeout(active.timer);
      if (err) active.reject(err);
      else active.resolve(active.lines);
    }
    // Drain the next command on a fresh tick so a synchronous reject handler
    // cannot re-enter this function mid-drain.
    queueMicrotask(() => {
      if (activeRef.current || queueRef.current.length === 0) return;
      const next = queueRef.current.shift()!;
      activeRef.current = next;
      next.timer = setTimeout(() => {
        if (activeRef.current === next) finish(new Error(`Stockfish timeout: ${next.cmd}`));
      }, next.timeoutMs);
      workerRef.current?.postMessage(next.cmd);
    });
  }, []);

  useEffect(() => {
    // stockfish.js detects worker context and speaks raw UCI strings.
    const worker = new Worker("/stockfish/stockfish.js");
    workerRef.current = worker;

    let sawUciOk = false;

    worker.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);

      if (!sawUciOk && line.includes("uciok")) {
        sawUciOk = true;
        worker.postMessage("isready");
        return;
      }
      // The handshake `readyok` arrives before any queued command exists, so it
      // must be consumed here rather than fed to a resolver.
      if (!readyRef.current && line.includes("readyok") && !activeRef.current) {
        readyRef.current = true;
        setReady(true);
        return;
      }

      const active = activeRef.current;
      if (!active) return;

      active.lines.push(line);
      if (line.includes(active.waitFor)) finish();
    };

    worker.onerror = () => finish(new Error("Stockfish worker error"));

    worker.postMessage("uci");

    return () => {
      worker.terminate();
      workerRef.current = null;
      activeRef.current = null;
      queueRef.current = [];
      readyRef.current = false;
    };
  }, [finish]);

  const send = useCallback(
    (cmd: string, waitFor: string, timeoutMs = 30000): Promise<string[]> =>
      new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error("Stockfish worker not started"));
          return;
        }
        const pending: PendingCommand = { cmd, waitFor, timeoutMs, resolve, reject, lines: [] };
        queueRef.current.push(pending);
        if (!activeRef.current) finish();
      }),
    [finish]
  );

  /** Fire-and-forget UCI option. Options are applied in order by the engine. */
  const setOption = useCallback((cmd: string) => {
    workerRef.current?.postMessage(cmd);
  }, []);

  const getBotMove = useCallback(
    async (fen: string, elo: number): Promise<string | null> => {
      if (!readyRef.current) return null;
      const clampedElo = Math.max(200, Math.min(3200, elo));

      setOption("setoption name UCI_LimitStrength value true");
      setOption(`setoption name UCI_Elo value ${clampedElo}`);
      setOption("ucinewgame");
      setOption(`position fen ${fen}`);

      const thinkTime = Math.max(200, Math.floor(clampedElo / 3));
      const lines = await send(`go movetime ${thinkTime}`, "bestmove", thinkTime + 20000);

      for (const line of lines) {
        if (line.startsWith("bestmove")) {
          const move = line.split(" ")[1];
          return move && move !== "(none)" ? move : null;
        }
      }
      return null;
    },
    [send, setOption]
  );

  const evaluate = useCallback(
    async (
      fen: string,
      movetimeMs: number = DEFAULT_MOVETIME_MS
    ): Promise<{ score: number; mate: number | null; bestMove: string | null }> => {
      if (!readyRef.current) return { score: 0, mate: null, bestMove: null };

      setOption("setoption name UCI_LimitStrength value false");
      setOption("setoption name MultiPV value 1");
      setOption("ucinewgame");
      setOption(`position fen ${fen}`);

      const lines = await send(`go movetime ${movetimeMs}`, "bestmove", movetimeMs + 20000);

      let score = 0;
      // Mate distance must survive as its own value. Collapsing it into a
      // centipawn score is what made the bar read "+1000.0" instead of "M3" --
      // the information was destroyed here, not in the display.
      let mate: number | null = null;
      let bestMove: string | null = null;
      const isBlack = fen.split(" ")[1] === "b";

      for (const line of lines) {
        if (line.startsWith("bestmove")) {
          const m = line.split(" ")[1];
          if (m && m !== "(none)") bestMove = m;
        }
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
          mate = parseInt(mateMatch[1]);
          if (isBlack) mate = -mate;
          // Keep a centipawn stand-in for callers that only plot a number,
          // scaled by distance so a mate in 1 outranks a mate in 8.
          score = mate > 0 ? 100000 - mate * 100 : -100000 - mate * 100;
          continue;
        }
        const cpMatch = line.match(/score cp (-?\d+)/);
        if (cpMatch) {
          score = parseInt(cpMatch[1]);
          if (isBlack) score = -score;
          // A later cp line supersedes an earlier mate claim at lower depth.
          mate = null;
        }
      }

      return { score, mate, bestMove };
    },
    [send, setOption]
  );

  const evaluateMultiPV = useCallback(
    async (
      fen: string,
      numLines: number = 3,
      movetimeMs: number = DEFAULT_MOVETIME_MS
    ): Promise<EngineLine[]> => {
      if (!readyRef.current) return [];

      setOption("setoption name UCI_LimitStrength value false");
      setOption(`setoption name MultiPV value ${numLines}`);
      setOption("ucinewgame");
      setOption(`position fen ${fen}`);

      const lines = await send(`go movetime ${movetimeMs}`, "bestmove", movetimeMs + 20000);
      setOption("setoption name MultiPV value 1");

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
        if (!prev || depth > prev.depth) results.set(pvIdx, { score, mate, pv: pvMoves, depth });
      }

      return Array.from(results.entries())
        .sort(([a], [b]) => a - b)
        .map(([, v]) => v);
    },
    [send, setOption]
  );

  return { ready, getBotMove, evaluate, evaluateMultiPV };
}

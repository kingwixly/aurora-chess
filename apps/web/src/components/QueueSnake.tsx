"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GRID = 16;
const TICK_MS = 130;

type Point = { x: number; y: number };

/**
 * Snake, played while the matchmaker looks for an opponent.
 *
 * Deliberately self-contained and pausable: the queue is the point, this is
 * something to do with your hands. It never captures keys that the queue UI
 * needs, and it stops cleanly when unmounted so a found match is never delayed
 * by a running interval.
 */
export default function QueueSnake() {
  const [snake, setSnake] = useState<Point[]>([{ x: 8, y: 8 }]);
  const [food, setFood] = useState<Point>({ x: 12, y: 8 });
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [started, setStarted] = useState(false);

  // Direction lives in a ref as well as state: the tick reads the latest value
  // without the interval needing to be torn down and rebuilt on every turn.
  const dir = useRef<Point>({ x: 1, y: 0 });
  const queued = useRef<Point | null>(null);

  const reset = useCallback(() => {
    setSnake([{ x: 8, y: 8 }]);
    setFood({ x: 12, y: 8 });
    dir.current = { x: 1, y: 0 };
    queued.current = null;
    setScore(0);
    setDead(false);
    setStarted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      if (!started) {
        reset();
        return;
      }
      // Reversing straight into yourself is always a mistake, never an intent.
      const cur = dir.current;
      if (next.x === -cur.x && next.y === -cur.y) return;
      queued.current = next;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, reset]);

  useEffect(() => {
    if (!started || dead) return;
    const id = setInterval(() => {
      if (queued.current) {
        dir.current = queued.current;
        queued.current = null;
      }
      setSnake((prev) => {
        const head = prev[0];
        const next = { x: head.x + dir.current.x, y: head.y + dir.current.y };

        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= GRID ||
          next.y >= GRID ||
          prev.some((p) => p.x === next.x && p.y === next.y)
        ) {
          setDead(true);
          setBest((b) => Math.max(b, prev.length - 1));
          return prev;
        }

        const grew = next.x === food.x && next.y === food.y;
        if (grew) {
          setScore((s) => s + 1);
          let spot: Point;
          do {
            spot = {
              x: Math.floor(Math.random() * GRID),
              y: Math.floor(Math.random() * GRID),
            };
          } while ([next, ...prev].some((p) => p.x === spot.x && p.y === spot.y));
          setFood(spot);
        }

        return grew ? [next, ...prev] : [next, ...prev.slice(0, -1)];
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [started, dead, food]);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-mono text-night-600">
          Score <span className="text-white">{score}</span>
          {best > 0 && <span className="ml-3 text-night-600">Best {best}</span>}
        </span>
        <span className="text-night-600">Arrow keys or WASD</span>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            gridTemplateRows: `repeat(${GRID}, 1fr)`,
          }}
        >
          {Array.from({ length: GRID * GRID }).map((_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const isHead = snake[0]?.x === x && snake[0]?.y === y;
            const isBody = !isHead && snake.some((p) => p.x === x && p.y === y);
            const isFood = food.x === x && food.y === y;
            return (
              <div
                key={i}
                className={
                  isHead
                    ? "bg-aurora-cyan"
                    : isBody
                      ? "bg-aurora-cyan/50"
                      : isFood
                        ? "bg-aurora-violet"
                        : ""
                }
              />
            );
          })}
        </div>

        {(!started || dead) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-night-950/85 text-center">
            <p className="font-display text-xl">
              {dead ? `You made ${score}` : "Something to do while you wait"}
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-aurora-cyan px-5 py-2 font-semibold text-night-950"
            >
              {dead ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

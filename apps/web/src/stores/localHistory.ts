"use client";

import { create } from "zustand";

/**
 * History for games played on this device.
 *
 * In-person and pass-and-play games have no accounts behind them, so there is
 * nowhere on the server to put them and no rating they could affect. They live
 * in localStorage instead: visible only to whoever holds the phone, which is
 * exactly the right audience for a game two people played in a room.
 *
 * Stored as PGN so it can be pasted into any analysis board, here or
 * elsewhere. A history you cannot export is a history you cannot use.
 */

export interface LocalGame {
  id: string;
  /** ISO timestamp. */
  playedAt: string;
  white: string;
  black: string;
  /** "1-0", "0-1" or "1/2-1/2". */
  result: string;
  /** How it finished, in words: "checkmate", "resignation", "time". */
  termination: string;
  /** Full PGN, including the seven tag roster so other tools accept it. */
  pgn: string;
  moveCount: number;
  /** Which mode produced it, for the history list. */
  mode: "in-person" | "pass-and-play";
  timeControl: string;
}

const KEY = "aurora-local-games";
/** Enough to be useful, few enough not to fill storage on a shared phone. */
const MAX_STORED = 100;

interface LocalHistoryState {
  games: LocalGame[];
  load: () => void;
  save: (game: Omit<LocalGame, "id" | "playedAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
}

function read(): LocalGame[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or unavailable storage should not break the page.
    return [];
  }
}

function write(games: LocalGame[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(games.slice(0, MAX_STORED)));
  } catch {
    // Quota exceeded or private browsing. The game still finished; only the
    // record is lost, and losing it silently is better than an error dialog
    // over a finished board.
  }
}

export const useLocalHistory = create<LocalHistoryState>((set, get) => ({
  games: [],

  load: () => set({ games: read() }),

  save: (game) => {
    const entry: LocalGame = {
      ...game,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playedAt: new Date().toISOString(),
    };
    const games = [entry, ...get().games].slice(0, MAX_STORED);
    write(games);
    set({ games });
  },

  remove: (id) => {
    const games = get().games.filter((g) => g.id !== id);
    write(games);
    set({ games });
  },

  clear: () => {
    write([]);
    set({ games: [] });
  },
}));

/**
 * Build a PGN with the seven tag roster.
 *
 * The roster is what makes a PGN portable - tools reject or mangle files
 * without it, so a history that skipped it would export records nothing else
 * could read.
 */
export function buildPgn(opts: {
  white: string;
  black: string;
  result: string;
  termination: string;
  moves: string[];
  timeControl: string;
  date?: Date;
}): string {
  const d = opts.date ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateTag = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

  const tags = [
    `[Event "Local game"]`,
    `[Site "Aurora Chess"]`,
    `[Date "${dateTag}"]`,
    `[Round "-"]`,
    `[White "${escapeTag(opts.white)}"]`,
    `[Black "${escapeTag(opts.black)}"]`,
    `[Result "${opts.result}"]`,
    `[TimeControl "${escapeTag(opts.timeControl)}"]`,
    `[Termination "${escapeTag(opts.termination)}"]`,
  ].join("\n");

  // Move text, numbered in pairs and wrapped at a sensible width.
  const body: string[] = [];
  for (let i = 0; i < opts.moves.length; i += 2) {
    body.push(`${i / 2 + 1}. ${opts.moves[i]}${opts.moves[i + 1] ? ` ${opts.moves[i + 1]}` : ""}`);
  }

  const lines: string[] = [];
  let current = "";
  for (const chunk of body) {
    if ((current + " " + chunk).trim().length > 78) {
      lines.push(current.trim());
      current = chunk;
    } else {
      current = `${current} ${chunk}`;
    }
  }
  if (current.trim()) lines.push(current.trim());

  return `${tags}\n\n${lines.join("\n")} ${opts.result}\n`;
}

/** Quotes and backslashes are the two characters that break a PGN tag. */
function escapeTag(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

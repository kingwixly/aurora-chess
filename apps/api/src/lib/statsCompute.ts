import type { GameResult } from "@eyeonchess/chess";
import { didPlayerWin, didPlayerLose, isDrawResult, lookupOpening } from "@eyeonchess/chess";

/** A completed game row with the fields needed for stats computation. */
type GameRow = {
  id: string;
  result: string | null;
  whiteId: string | null;
  blackId: string | null;
  isVsBot: boolean;
  createdAt: Date;
  white: { rating: number } | null;
  black: { rating: number } | null;
  moves: { san: string }[];
};

/**
 * Compute the win/loss/draw record split by opponent type.
 * @returns overall record plus vsHuman and vsBot breakdowns
 */
export function computeRecord(
  games: GameRow[],
  userId: string
): {
  wins: number;
  losses: number;
  draws: number;
  vsHuman: { wins: number; losses: number; draws: number };
  vsBot: { wins: number; losses: number; draws: number };
} {
  const record = { wins: 0, losses: 0, draws: 0 };
  const vsHuman = { wins: 0, losses: 0, draws: 0 };
  const vsBot = { wins: 0, losses: 0, draws: 0 };

  for (const g of games) {
    const isWhite = g.whiteId === userId;
    const result = g.result as GameResult;
    const won = didPlayerWin(isWhite, result);
    const lost = didPlayerLose(isWhite, result);
    const drew = isDrawResult(result);
    const target = g.isVsBot ? vsBot : vsHuman;

    if (won) {
      record.wins++;
      target.wins++;
    } else if (lost) {
      record.losses++;
      target.losses++;
    } else if (drew) {
      record.draws++;
      target.draws++;
    }
  }

  return { ...record, vsHuman, vsBot };
}

/**
 * Replay Elo history forward from 1200 using human games only.
 * @returns an array of date/rating pairs suitable for charting
 */
export function computeRatingHistory(
  games: GameRow[],
  userId: string
): { date: string; rating: number }[] {
  const K = 32;
  let rating = 1200;
  const ratingHistory: { date: string; rating: number }[] = [
    {
      date:
        games[0]?.createdAt.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
      rating: 1200,
    },
  ];

  for (const g of games) {
    if (g.isVsBot) continue; // Bot games don't affect rating
    const isWhite = g.whiteId === userId;
    const opponentRating = isWhite ? g.black?.rating || 1200 : g.white?.rating || 1200;
    const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
    const actual = didPlayerWin(isWhite, g.result as GameResult)
      ? 1
      : isDrawResult(g.result as GameResult)
        ? 0.5
        : 0;
    rating = Math.round(rating + K * (actual - expected));
    ratingHistory.push({
      date: g.createdAt.toISOString().split("T")[0],
      rating,
    });
  }

  return ratingHistory;
}

/**
 * Tally openings by ECO code and return the top 5 most played.
 * @returns array of opening stats sorted by frequency (descending), max 5
 */
export function computeOpeningStats(
  games: GameRow[],
  userId: string
): { name: string; eco: string; wins: number; losses: number; draws: number; count: number }[] {
  const openingCounts: Record<
    string,
    { name: string; eco: string; wins: number; losses: number; draws: number }
  > = {};

  for (const g of games) {
    const sans = g.moves.map((m) => m.san);
    const opening = lookupOpening(sans);
    if (!opening) continue;
    const key = opening.eco;
    if (!openingCounts[key]) {
      openingCounts[key] = { name: opening.name, eco: opening.eco, wins: 0, losses: 0, draws: 0 };
    }
    const isWhite = g.whiteId === userId;
    const won = didPlayerWin(isWhite, g.result as GameResult);
    const lost = didPlayerLose(isWhite, g.result as GameResult);
    if (won) openingCounts[key].wins++;
    else if (lost) openingCounts[key].losses++;
    else openingCounts[key].draws++;
  }

  return Object.values(openingCounts)
    .map((o) => ({ ...o, count: o.wins + o.losses + o.draws }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Compute the current streak (from most recent game backward) and the best
 * all-time win streak.
 * @returns current streak info and best win streak count
 */
export function computeStreaks(
  games: GameRow[],
  userId: string
): {
  current: { type: "win" | "loss" | "none"; count: number };
  bestWin: number;
} {
  const currentStreak = { type: "none" as "win" | "loss" | "none", count: 0 };
  let bestWinStreak = 0;
  let tempWinStreak = 0;

  for (let i = games.length - 1; i >= 0; i--) {
    const g = games[i];
    const isWhite = g.whiteId === userId;
    const won = didPlayerWin(isWhite, g.result as GameResult);
    const lost = didPlayerLose(isWhite, g.result as GameResult);

    if (i === games.length - 1) {
      currentStreak.type = won ? "win" : lost ? "loss" : "none";
      currentStreak.count = 1;
    } else if ((won && currentStreak.type === "win") || (lost && currentStreak.type === "loss")) {
      currentStreak.count++;
    } else {
      break;
    }
  }

  // Best win streak (forward scan)
  for (const g of games) {
    const isWhite = g.whiteId === userId;
    const won = didPlayerWin(isWhite, g.result as GameResult);
    if (won) {
      tempWinStreak++;
      bestWinStreak = Math.max(bestWinStreak, tempWinStreak);
    } else {
      tempWinStreak = 0;
    }
  }

  return { current: currentStreak, bestWin: bestWinStreak };
}

/**
 * Build a 30-day activity summary (number of games per day).
 * @returns array of date/count pairs sorted chronologically
 */
export function computeActivity(games: GameRow[]): { date: string; count: number }[] {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activityMap: Record<string, number> = {};
  for (const g of games) {
    if (g.createdAt < thirtyDaysAgo) continue;
    const day = g.createdAt.toISOString().split("T")[0];
    activityMap[day] = (activityMap[day] || 0) + 1;
  }
  return Object.entries(activityMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

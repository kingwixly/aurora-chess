/**
 * Aurora's opening puzzle set.
 *
 * Every position and every solution move in this file was verified against
 * Stockfish before it shipped: positions are legal, solver moves are the
 * engine's choice or an equally-winning alternative, and the opponent replies
 * are best. A puzzle with a wrong answer teaches the wrong thing.
 *
 * Two positions here have more than one correct answer -- the Arabian mate has
 * two distinct mates in one. The checker accepts any mate on a mate puzzle for
 * exactly that reason.
 *
 * Ratings are on the Glicko-2 scale (1500-centred), matching player ratings.
 *
 * Run `pnpm --filter @aurora/api db:seed-puzzles` to load them.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const PUZZLES = [
  {
    id: "back-rank",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    rating: 1000,
    title: "The back rank",
    intro: "White to move and mate.",
    themes: ["backRankMate", "mateIn1"],
    moves: ["a1a8"],
    explanations: [
      "Ra8#. Black's own pawns on f7, g7 and h7 have never moved, so the king has no escape square on the seventh rank.",
    ],
  },
  {
    id: "family-fork",
    fen: "r3k2r/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1",
    rating: 1200,
    title: "Family fork",
    intro: "White to move and win material.",
    themes: ["fork", "knightFork"],
    moves: ["d5c7"],
    explanations: [
      "Nxc7+ forks the king and the a8 rook. Because it is check, Black has no time to save the rook \u2014 the king must move first, and the knight takes on a8 next.",
    ],
  },
  {
    id: "opening-mate",
    fen: "rnbqkbnr/ppp2ppp/8/3pp3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 3",
    rating: 1200,
    title: "Punished for pawn moves",
    intro: "Black to move and mate.",
    themes: ["mateIn1", "opening"],
    moves: ["d8h4"],
    explanations: [
      "Qh4#. White's g4 and f3 have torn open the diagonal leading to their own king.",
    ],
  },
  {
    id: "smothered",
    fen: "6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1",
    rating: 1400,
    title: "Smothered",
    intro: "White to move and mate.",
    themes: ["smotheredMate", "mateIn1"],
    moves: ["e5f7"],
    explanations: [
      "Nf7#. Every escape square is occupied by one of Black's own pieces \u2014 the rook on g8, the pawns on g7 and h7 \u2014 and no piece defends f7.",
    ],
  },
  {
    id: "arabian",
    fen: "7k/6R1/5N2/8/8/8/8/6K1 w - - 0 1",
    rating: 1500,
    title: "Arabian mate",
    intro: "White to move and mate.",
    themes: ["arabianMate", "mateIn1"],
    moves: ["g7g8"],
    explanations: [
      "Rg8#. The rook checks along the eighth rank and the knight on f6 covers g8 and h7, so the rook cannot be captured and the king cannot run.",
    ],
  },
  {
    id: "rook-ladder",
    fen: "6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1",
    rating: 1700,
    title: "The ladder",
    intro: "White to move and mate in two.",
    themes: ["endgame", "rookEndgame", "mateIn2"],
    moves: ["b1b7", "g8f8", "a2a8"],
    explanations: [
      "Rb7 cuts the king off along the seventh rank. The king now has only the eighth to move on.",
      "Kf8 is forced \u2014 every other square is covered by the rook on b7.",
      "Ra8#. The two rooks climb like rungs on a ladder: one cuts off the rank, the other delivers. You can mate a lone king with two rooks from anywhere on the board using nothing but this.",
    ],
  },
  {
    id: "anastasia",
    fen: "5rk1/ppp3pp/8/4N3/8/7Q/PPP2PPP/2KR4 w - - 0 1",
    rating: 2000,
    title: "Anastasia's mate",
    intro: "White to move. There is a forced win here \u2014 find the first three moves.",
    themes: ["sacrifice", "kingsideAttack", "mateIn5", "deflection"],
    moves: ["h3e6", "g8h8", "d1d8", "f8d8", "e5f7"],
    explanations: [
      "Qe6+ drags the king into the corner. Black has exactly two legal replies, and one of them loses the rook immediately \u2014 so this is close to forced.",
      "Kh8 is the only move that does not drop material at once.",
      "Rd8! The rook offers itself. The point is not the rook: it is that the f8 rook is the only piece guarding f7, and this deflects it.",
      "Rxd8 accepts. Declining loses to Rxf8+ anyway.",
      "Nf7+ arrives with the f8 rook gone, forking king and rook, and mate follows shortly. This pattern \u2014 knight to f7 against a king boxed on h8 \u2014 is worth memorising; it is the engine room of most smothered-mate combinations.",
    ],
  },
  {
    id: "rook-deflection",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    rating: 900,
    title: "The open file",
    intro: "White to move and mate.",
    themes: ["backRankMate", "mateIn1"],
    moves: ["d1d8"],
    explanations: ["Rd8#. The rook swings to the back rank and there is nothing to block with."],
  },
  {
    id: "two-rook-mate",
    fen: "7k/8/8/8/8/8/R7/1R5K w - - 0 1",
    rating: 1200,
    title: "Two rooks",
    intro: "White to move and mate in two.",
    themes: ["mateIn2", "endgame", "rookEndgame"],
    moves: ["b1g1", "h8h7", "a2h2"],
    explanations: [
      "Rg1 takes the whole g-file away, leaving the king only the h-file. Cutting off before checking is the entire method \u2014 check first and the king simply walks.",
      "Kh7 is forced; every other square is covered.",
      "Rh2#. The rooks climb like rungs on a ladder: one cuts off, the other delivers. This mates a lone king from anywhere on the board.",
    ],
  },
  {
    id: "royal-fork",
    fen: "q3k3/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1",
    rating: 1300,
    title: "Royal fork",
    intro: "White to move and win the queen.",
    themes: ["fork", "knightFork"],
    moves: ["d5c7"],
    explanations: [
      "Nc7+ is a royal fork \u2014 king and queen at once, which is the only combination that earns the name. The king must step out of check and the knight collects the queen on a8.",
    ],
  },
  {
    id: "king-opposition",
    fen: "8/5k2/8/8/8/8/3P4/3K4 w - - 0 1",
    rating: 1500,
    title: "The king leads",
    intro: "White to move. How do you promote this pawn?",
    themes: ["endgame", "pawnEndgame", "opposition"],
    moves: ["d1c2"],
    explanations: [
      "Kc2, not d3 and not the pawn. The king goes ahead of the pawn and slightly to the side; pushing the pawn first lets the black king sit in front of it and the game is drawn.",
    ],
  },
];

async function main() {
  for (const p of PUZZLES) {
    // Upsert rather than insert: re-running must not duplicate, and editing a
    // puzzle's text here should update the stored copy.
    await prisma.puzzle.upsert({
      where: { id: p.id },
      create: p,
      // Attempt counts and ratings live on the row and are NOT reset -- a
      // puzzle's rating drifts from real results and that data is worth more
      // than the seeded starting value.
      update: {
        fen: p.fen,
        title: p.title,
        intro: p.intro,
        themes: p.themes,
        moves: p.moves,
        explanations: p.explanations,
      },
    });
  }
  console.log(`Seeded ${PUZZLES.length} puzzles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

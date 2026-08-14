# Puzzles and the profile rebuild

## Puzzles — 7 in the first set

Every position and every solution move was **verified against Stockfish** before
shipping. That was not ceremony: it caught three bad puzzles I would otherwise
have shipped.

- My "smothered mate" position lost a piece — Ng6 was simply bad, engine
  preferred Nd6. Replaced with a real smothered position (Nf7#).
- A rook-trade puzzle I had written as "trades into a pawn endgame" was
  **actually mate in one**. My own explanation was wrong.
- A Greek gift sacrifice was not objectively best — the engine preferred
  castling first, and flip-flopped between depths. Cut, and replaced with
  Anastasia's mate, which is a verified forced mate.

| Puzzle | Rating | Line | Theme |
|---|---|---|---|
| The back rank | 700 | Ra8# | Back-rank mate |
| Royal fork | 900 | Nxc7+ | Knight fork |
| Punished for pawn moves | 900 | Qh4# | Fool's mate |
| Smothered | 1100 | Nf7# | Smothered mate |
| Arabian mate | 1200 | Rg8# | Rook + knight |
| The ladder | 1400 | Rb7 Kf8 Ra8# | Two-move, rook endgame |
| Anastasia's mate | 1700 | Qe6+ Kh8 Rd8! Rxd8 Nf7+ | Multi-move, deflection sacrifice |

Every move has its own explanation, revealed as it is earned — including the
opponent's replies, which is where the "why is this forced" reasoning lives.

## The design decision that matters

**Puzzles are not validated by exact move match.** The Arabian position has two
distinct mates in one, and Anastasia has two winning first moves. Stockfish
flagged both as disagreeing with my stored line — and both alternatives were
correct.

Telling a solver their mate is wrong because a string does not match is the
fastest way to make a trainer feel broken. So mate puzzles accept **any** move
that delivers mate; non-mate puzzles fall back to the stored line, because
without a mate to check against there is no way to tell a good alternative from
a blunder.

## Anti-cheat

The solution never leaves the server until the puzzle is over. Sending the line
with the position would put the answer in the network tab and make the rating
meaningless. Moves are checked one at a time, and the server replays the line
from the stored FEN rather than trusting a client-supplied board.

## Rating

Standard Elo, K=32, floored at 400. **Hinted solves change nothing** — a player
shown the idea has proved nothing, but should not be punished for looking.
Failing after a wrong move counts as a loss.

## Profile page

Rebuilt around everything that was built but never wired:

- Full identity in the header: FIDE mark, mod shield, title, name, flair
- **Ratings by time control** — the pooled figure alone hid that a player can be
  a very different strength at bullet and classical
- **Badge shelf**, pinned first
- **FIDE panel**, when staff have enabled it

The API now returns badges and the FIDE panel from `GET /users/:username`.

## To run

Nothing. The `migrate` container seeds puzzles automatically on every start,
alongside site settings and bots. See `DEPLOY_CHECKLIST.md`.

The seed upserts, so re-running is safe. It updates puzzle text but **never
resets attempt counts or ratings** — a puzzle rating drifts from real results
and that data is worth more than the seeded starting value.

## Verified

Migration replayed clean through all 20 against real Postgres 16, including
array columns and cascade deletes. 209 shared tests (14 new for puzzles), 245
web tests, every package and app typechecked except `apps/api`.

## Still not wired

The **admin UI** for FIDE fields and badge granting. Endpoints exist; forms do
not.

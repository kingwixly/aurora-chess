# Bots: openings, dialogue, WorstFish

## Why strong bots played the Scandinavian

`preferredOpenings` was stored in the database, validated by the schema, and
**never read by anything**. The engine took a FEN and an Elo, nothing more. So
every bot played whatever Stockfish felt like at a capped rating, which at 2600
means "technically fine, characterless, occasionally 1...d5".

The book is now consulted before the engine, for the first eight plies only.
After that the engine takes over — this shapes the opening, it does not play the
game.

**A second bug the tests caught.** Black lines were stored as bare replies
(`"e5 Nf3 Nc6"` meaning "answer 1.e4 with e5"). That cannot be validated from
the starting position, and more importantly index 0 of the line did not
correspond to ply 0 of the game — so **no black line could ever have matched**,
even once the book was wired up. Lines are now complete sequences from move one,
including the opponent's moves.

Repertoires are assigned by strength: beginners play natural developing moves,
club bots play mainline ideas, 2000+ play real theory — Najdorf, King's Indian,
Closed Ruy Lopez.

## Dialogue

From **2 lines per event to roughly 8**, across 31 bots — 2,659 lines total.

Each bot's existing lines are kept first, since that is its individual voice,
and padded with tier-appropriate lines so nothing runs dry inside a single game.
The three voices are deliberately different: beginners are warm and hapless,
club bots are chatty, and the strong ones get terser and colder as they climb.
That makes strength feel like a personality rather than a number.

## WorstFish

Rated 200, and **not** a weak engine — an inverted one.

A low `UCI_Elo` plays badly at random. WorstFish evaluates every legal move and
picks the one that leaves it in the worst position, taking immediate self-mate
when available. Shallow search per move, because hanging a queen is obvious at
depth 1 and the joke does not improve with accuracy.

It has no repertoire, and its dialogue treats every blunder as a triumph.

## Tests

`apps/api/src/lib/botRoster.test.ts` — 6 tests over the roster as data:

- every bot has a repertoire
- **every line is legal**, replayed move by move from the start
- strong bots answer 1.e4 with something principled
- every bot has at least 5 lines per event
- WorstFish exists

Roster data fails silently. A typo in one line does not crash anything, it just
disables that bot's book — which is precisely how this went unnoticed.

## Verified

340 API, 279 shared, 251 web tests. Schema and route checks clean.

## Still outstanding from your list

Not started, and each needs real design work rather than a quick pass:

- **Odds** (queen, move, time) with the 500-point suggestion and approval flow
- **Challenge UI** — queue-after-current vs concurrent games, 5 for untitled and
  unlimited for titled, bot games shown as a real game rather than "vs ?"
- **Engine selection** — Lc0, Weiss, RubyChess and friends, with a cancellable
  download instead of a forced Stockfish fetch
- **Events tab**

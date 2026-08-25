# Opening book, coach mode, DrawFish

## The book

3,810 named openings from the Lichess ECO database, MIT licensed.

Keyed by **position**, not move sequence. That matters more than it sounds:
transpositions are the normal case in openings, and a sequence-keyed book fails
to recognise the Sicilian if you reach it via 1.Nf3. Verified — both orders
resolve to the same entry.

Positions are stored as a 32-bit hash rather than full FENs, which took the
payload from 476KB to 248KB with zero collisions across the whole set.

## Book moves are labelled, not scored

`BOOK` is now a classification, checked before evaluation.

Judging opening moves by centipawns is misleading: the engine calls 1.e4
"great" and 1.d4 "best", implying a difference that does not exist and teaching
a learner nothing. "Book" says the true thing — this is established theory and
the question does not arise yet.

**One gate worth naming.** The book contains the Bongcloud and the Grob. A move
that drops a piece should not be excused because a database holds it, so `BOOK`
only applies when the move is not a disaster (under 100cp). Theory-and-fine gets
BOOK; theory-and-losing gets judged on its merits. Your Grob screenshot is
exactly the case that made this worth thinking about.

## Opening names, live

The name updates as the line develops, in the move list during play and on the
analysis board as you step through. Recomputed from the moves rather than
passed in, so it stays correct as the game grows. The analysis sidebar also
reports where the game left book.

## Engine lines

The analysis board now lists three candidate lines with evaluations, rather
than a single "the engine prefers X". One move with one number tells you what
to play; several lines tell you what the position is about — whether the choice
is forced, whether second-best is close, whether everything loses.

Uses the engine already loaded for analysis. A second instance would mean a
second multi-megabyte download.

## Coach mode

Live feedback at a strength **you choose**, 600 to 3200.

The dial is the point. A 3200 engine tells a 900-rated player their move gave
up 0.4 pawns — true, and useless, because at that level games turn on hanging
pieces. So the noise floor scales: 150cp at beginner level, 25cp at master. A
coach that comments on every move becomes noise, and noise gets switched off.
**Returning nothing is a valid result**, and the tests assert it.

Search depth scales too, so a weak coach genuinely misses what a player at that
level misses rather than being a strong engine kept quiet. Its advice should be
reachable, not oracular.

Three personas — Wren (encouraging), Halden (blunt), Sable (detailed) — phrasing
the same verdict differently. 12 tests.

## DrawFish

Rated 201. Picks whichever legal move leaves the evaluation closest to 0.00.

Your two-move rule falls out of that rather than needing a special case: a draw
available in two moves usually requires _gaining_ an advantage first, and an
advantage is further from zero than not having one — so DrawFish declines it. A
draw available in **one** move evaluates to exactly 0 and cannot be beaten, so
it is taken without consulting the engine at all.

If you build a winning position it will pick whichever losing move loses by the
smallest margin, sliding toward the abyss as slowly as arithmetic allows.

WorstFish is untouched, same event.

## The analysis reload bug

Real cause: the worker wrote `processing` and `done`, but **nothing ever wrote
`queued`**. Between enqueueing and the worker picking the job up, the API
returned `"none"`, which the client treated as terminal and stopped polling.
Only a manual refresh recovered. The status is now set on enqueue, and the
client polls until `done` or `error` rather than matching two specific strings.

## Verified

340 shared, 340 API, 251 web tests. Schema, routes and contrast clean.

## Not built

- Bot CRUD, image uploads, authorised alts, draw offers, daily games
- Text-glyph piece theme, board grid options, full light-theme inversion
- More multi-move puzzles
- Google sign-in

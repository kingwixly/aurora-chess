# Bug fixes

## Stockfish analysis stopping after two moves

`useStockfish` held a **single resolver slot** and a hard 15s timeout, while
`evaluateMultiPV` ran `go depth 16`. Depth-bounded search has no wall-clock
bound — on single-threaded WASM a depth-16 MultiPV search on a sharp position
routinely exceeds 15 seconds. The timeout rejected, the rejection propagated
into `analyze()`, which had no `try/catch`, so the loop died and `analyzing`
stayed `true` forever. Two or three moves in, silently. Exactly the symptom.

Three fixes:

- **Proper command queue.** The engine speaks one line-oriented protocol with no
  request IDs, so overlapping searches interleave their `info` lines with no way
  to tell them apart. Commands are now strictly serialised.
- **Time-bounded search.** `go movetime 600` instead of `go depth 12/16`, with
  the command timeout derived from the movetime rather than a fixed 15s.
- **`try/catch/finally` in `analyze`.** An engine failure at move 30 now keeps
  the 29 moves already analysed, surfaces an `error` string, and always clears
  `analyzing`. Wire `error` into the analysis UI — the hook exposes it now.

Also fixed a stale-closure bug: `ready` was captured from first render inside
`worker.onmessage`, which has `[]` deps. It now reads a ref.

## Material difference

`CapturedPieces` rendered a raw row of piece glyphs and made you subtract in
your head. It now computes and shows a numeric advantage, and only for the
leading side, matching the convention players already know.

Computed from **surviving material**, not from the captured list — counting
captures alone misreports after a promotion.

The row also reserves its height when empty, so the board no longer shifts on
the first capture.

## Flip-board button

`&updownarrow;` is not a defined HTML entity, so it rendered as literal text.
Replaced with `&#x21C5;` plus a title and `aria-label`.

## Email exposure

Removed from the play dashboard. As you said — a streamer sharing their screen
should not leak it.

## Board formatting

- **Coordinates over pieces.** Chessground renders them flush to the square edge
  with no contrast backing, so on an occupied edge square the letter sat under
  the piece. Now inset slightly with a text shadow.
- **Corners not rounding.** Chessground positions the board absolutely inside
  its wrapper, so a radius on an ancestor does not clip it. The radius and
  `overflow: hidden` now sit on `.cg-wrap` and `cg-board` directly.
- **Player names against the board edge.** `.board-player-row` adds block
  padding. Apply that class to the name rows in the game page.

## Verified

`packages/chess` 185 tests passing; `packages/ui` typechecks. `apps/web` was not
typechecked — that needs a generated Prisma client, which this sandbox cannot
produce. Run `pnpm -r typecheck` after `prisma generate`.

## Not done

Being direct rather than implying more than I built:

- **The full frontend redesign.** Homepage, signup/login, the play dashboard
  layout — still the single-column button stack.
- **Admin rating editing**, **titles in game views**, **flairs and profile
  badge display** — the data model exists, the UI does not.
- **The rematch/retry button** — I could not reproduce the error page from the
  code alone. What does the URL look like when it fails?

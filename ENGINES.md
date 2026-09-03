# Engines

## Bundled

Real builds, on disk, in `/public/engines`. 16MB total.

| Engine                     | Download | Notes                                                       |
| -------------------------- | -------- | ----------------------------------------------------------- |
| Stockfish 18 Lite          | 7MB      | Default. Multi-threaded where the browser allows            |
| Stockfish 18 single-thread | 7MB      | For browsers and privacy modes that block SharedArrayBuffer |
| Stockfish classic          | 7MB      | The original build, kept so old analysis stays comparable   |

Fetched from npm rather than GitHub, which is what was rate-limiting the
sandbox before.

## What I left out, and why

The full Stockfish 18 build is **108MB of wasm**. My earlier objection was repo
size, which you correctly rejected - your disk is not the constraint.

The real constraint is that a **user's browser downloads it**. 108MB before you
can analyse a single game is unusable on mobile data and slow on anything else,
and the strength difference over Lite is invisible at the depths this runs at.

Fairy-Stockfish and the Lichess sf16-7 build are also downloaded and working,
but they are **ES modules with a different loader API** than the classic
Stockfish worker. Wiring them needs a second loader path, which is real work
rather than a copy. Left out of the catalogue rather than listed and broken.

Fairy-Stockfish is the one worth revisiting: it plays 90+ variants, which is
what would make Chess960 and any fairy pieces actually playable against a bot.

## Engine selection now does something

`useStockfish` had the worker path **hardcoded**. The picker in settings wrote
a value to localStorage and nothing read it - every game and every analysis ran
the same binary regardless of what you chose.

The path is now a parameter, and all three consumers pass the right one:
bot play uses your play engine, both analysis surfaces use your analysis
engine.

## A check that would have caught it

`scripts/check-engines.mjs`, in `pnpm check`.

Every engine marked `available` must exist on disk, with its `.wasm` alongside.
A wrong worker path does not throw - the Worker constructs, the fetch 404s, no
message ever arrives, and the board sits at "Loading engine" forever. That is
a failure this project has already shipped once.

## Analysis features merged

The standalone board (`/analysis`) and game analysis had drifted apart. Brought
across:

- **The full opening book.** The standalone board was using a hand-written list
  of a couple of dozen openings; it now uses the same 3,810-entry ECO book,
  matched by position so transpositions resolve.
- **Engine choice**, which it was ignoring entirely.

Both boards already had multi-line engine output and free movement.

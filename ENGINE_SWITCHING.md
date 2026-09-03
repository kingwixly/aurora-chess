# Engine switching

## Five engines, all bundled

| Engine                     | Download | Notes                                                       |
| -------------------------- | -------- | ----------------------------------------------------------- |
| Stockfish 18 Lite          | 7MB      | Default. Multi-threaded where the browser allows            |
| Stockfish 18 single-thread | 7MB      | For browsers and privacy modes that block SharedArrayBuffer |
| Stockfish classic          | 7MB      | The original build, kept so old analysis stays comparable   |
| **Stockfish 16.7**         | **1MB**  | Lichess build. Loads almost instantly, fine on old phones   |
| **Fairy-Stockfish 14**     | **1MB**  | The only one that plays variants                            |

The last two were already downloaded but unusable, because they are ES modules
speaking a different protocol from the classic Stockfish worker.

## The adapter

Aurora's engine code speaks the classic protocol: `postMessage("go depth 12")`
in, UCI text out. The lila-stockfish-web builds want you to instantiate a
factory, call `.uci(cmd)`, and read replies from a `listen` callback.

Rather than branch the engine hook on which protocol each engine speaks,
`/engines/lila-adapter.js` runs inside the worker and translates. Everything
upstream is unchanged, and adding another engine of that family later means
adding a query parameter rather than another code path.

Two details in there worth keeping:

**The build name is allow-listed, not interpolated.** A query string is
attacker-controllable in principle, and an unchecked value would be an
arbitrary-script import inside a worker.

**Commands that arrive before the module finishes loading are queued** and
replayed in order, because the caller has no way to know when the import
resolved.

## workerType

An ES-module build loaded without `{ type: "module" }` fails **silently**: the
Worker constructs, the import throws inside it, and no message ever arrives.
The board then waits forever for a ready that never comes. Passing
`type: "module"` to a plain script is equally fatal in the other direction.

So it is a field on the engine spec rather than a guess, and all three
consumers - bot play, game review, the standalone analysis board - pass it.

## The picker

A dropdown of names and sizes does not help anyone choose. The difference that
matters is not "7MB versus 1MB", it is "this one loads instantly on an old
phone" and "this one is the only one that plays Chess960".

So each option states what it is for, with its size, strength and variant
count. Only bundled engines appear - an engine we do not ship would download
nothing, fall back silently, and leave the player believing they had chosen
something.

## Checks

`check-engines.mjs` now understands adapter paths: it strips the query string,
then verifies the build the adapter names is also on disk with its wasm. Before
this, an adapter pointing at a missing engine would have passed - the adapter
itself exists, and the failure only appears at import time in the browser.

Five new tests: module builds are marked as such, classic builds are not,
module builds route through the adapter, and exactly one engine claims variant
support. That last one matters because if a second ever does, the code that
picks an engine for a variant game has to choose between them rather than
taking the first match.

## Verified

364 shared, 342 API, 259 web tests. All six checks clean.

## Next

Fairy-Stockfish is catalogued and loadable, but nothing yet **uses** its variant
support - Chess960 games still run on Stockfish with `UCI_Chess960`, which works.
Wiring variant selection to it is what would unlock Crazyhouse, Atomic and the
rest.

# What I can actually verify — and now do

I had been telling you "run `pnpm -r typecheck` after `prisma generate`" as if
nothing here could be checked. That was wrong, and it is why the `ev.mate` error
reached your build. **Only `apps/api` needs the Prisma client.** Everything else
compiles and tests here.

From now on, every handoff passes all of this first:

| Check | Result |
|---|---|
| `packages/chess` tests | 185 passed |
| `packages/chess` typecheck | clean |
| `packages/ui` typecheck | clean |
| `packages/api-client` typecheck | clean |
| **`apps/web` typecheck** | clean |
| **`apps/web` tests** | 245 passed, 6 skipped |
| `apps/admin` typecheck | clean |

`apps/api` remains unverifiable here — that one genuinely needs the generated
client.

## The build failure

`useStockfish`'s `StockfishHook` interface still declared the old `evaluate`
return type. My edit matched a single-line signature, but Prettier had already
reflowed it across four lines, so the replacement silently missed while the
implementation was updated. The two disagreed, and `ev.mate` did not exist on
the declared type.

Fixed, and the interface and implementation are now checked against each other
by the typecheck above.

## Also hardened

The game-over modal was comparing `gameOver.result` against `"WHITE_WIN"`
exactly. The test fixture used `"1-0"`, and a stored game might too — a mismatch
there tells a winner they lost. It now normalises both notations and lowercase
terminations.

## Test suite realigned

37 files, 245 tests. Nine were failing against the rebuilt UI; rather than
deleting them I rewrote the assertions to describe the new behaviour, so they
still carry meaning:

- Captured pieces now pin the material style explicitly instead of depending on
  the default, and assert on visible content rather than empty markup — the
  component deliberately renders a fixed-height spacer so the board does not
  jump on the first capture.
- The game-over tests assert the viewer's outcome and that a spectator sees the
  neutral result, which is behaviour worth protecting.
- The piece-set store test is gone with the feature.

# Stability pass

The build was verified by running `next build` for both apps, not just `tsc`.
That mattered - three failures only appear at build time, and `tsc` passed all
three.

## Maia was removed

`onnxruntime-web` ships a Node-targeted `ort.node.min.mjs` whose `import.meta`
usage the Next compiler cannot parse. It fails the entire web build.
`serverExternalPackages` did not help.

There is probably a webpack configuration that works, but finding it is
experimentation, and experimenting with the bundler the night before a push to
a site that has been down is the wrong trade. **Maia, `maia3-js` and
`onnxruntime-web` are all removed**, along with the four Maia bots.

The approach is still sound and the package still works in a browser. It wants
a session where a broken build costs nothing.

## Two real bugs found by building

**`useStockfish.ts` had `"use client"` demoted to an expression.** I prepended
the fallback constant above the directive, which makes it a plain string
statement rather than a directive - so the entire module would have been
treated as a server component. `tsc` sees nothing wrong with this.

**`/play/bot` failed to prerender.** `useSearchParams` opts a page out of
static generation unless it sits inside a Suspense boundary, and the export
step fails outright. Added the boundary.

## Bugs found by auditing rather than testing

**The forum index had no way out.** Every other page has a back link; the forum
was reachable only from the nav you had just left. Blog had the same problem.

**Pip and WorstFish are both rated 200**, and the server dispatched novelty
behaviour on rating - so playing Pip silently got you WorstFish's inverted
search from the second move. Games now store `botId` and dispatch on identity.

I checked whether `game.botId` is actually loaded before the move handler reads
it: that query uses `include`, so it returns every column. The list query at
line 405 uses `select` without it, but nothing downstream reads it there.

## What was verified, and how

- `next build` on **web** and **admin**: both compile and export
- 391 shared, 342 API, 259 web tests
- All six checks: schema fields, Prisma selects, routes, contrast, emoji, engines
- 33 migrations replay clean from an empty database
- The lockfile resolves - no `frozen-lockfile` surprise in Docker

## What I could not verify from here

**Fonts.** `next/font/google` cannot fetch in this sandbox, so the build only
completes with fonts stubbed. They are restored in the shipped source and your
Docker build has network access, so this is a sandbox limit rather than a
defect - but it is the one thing in the build I have not seen succeed
end to end.

**Anything requiring a running database.** `adminAccess.test.ts` needs
`prisma generate`, which needs an engine download this sandbox blocks. It is a
pre-existing condition, not a regression - the other 342 API tests pass.

**Actual gameplay.** No browser here. The engine fallback, the variant rules
and the bot identity fix are covered by tests and by reading, not by playing a
game.

---

# Second pass

Ran again after you asked me to double-check. Found four more bugs, three of
which would have shown up in normal use.

## The Suspense restructure silently dropped a feature

Wrapping `/play/bot` in a Suspense boundary meant rewriting the component
shell, and **the deep-link effect did not survive it**. `useSearchParams` was
still imported and still called, and its result was never read - so the events
page links (`?bot=worstfish`) went back to doing nothing, and I had added a
Suspense boundary for a feature that was no longer there.

Restored, and it now sets the **rating** as well as the bot. Selecting a bot
anywhere else sets both together; setting only one would have sent WorstFish's
identity with whatever rating was in the box.

## Two crashes in code that runs on live boards

`hillWinner` indexed `rows[8 - rank]` without checking the FEN had eight rows,
throwing `row is not iterable`. `applyAtomicMove` constructed its `Chess`
**before** the try block, so a malformed FEN threw instead of returning null -
ending the game rather than rejecting the move.

Both take FENs from somewhere else: the server, a stored game, an engine. They
have to survive input they did not construct.

## Two more of the same kind

`countCheck` runs after every move in Three-check and `antichessMoves` builds
the legal move list on every Antichess turn. Both threw on a malformed FEN.
An exception in the second one leaves the player unable to move at all.

All four now return a sensible empty result instead. Two permanent test files
cover them, feeding deliberately hostile input - empty strings, nonsense,
kingless positions.

## Checks that came back clean

- No effect anywhere has an object, array or arrow literal in its dependency
  array - the pattern behind both previous outages
- The engine fallback cannot loop: `triedFallback` guards it and the reset
  effect depends only on stable props
- `finish` has empty deps, so the worker is not recreated every render
- `game.botId` is loaded before it is read - that query uses `include`
- Switching to a custom rating clears the selected bot, so no stale identity
  is sent

## Final state

- `next build` succeeds for **web** and **admin**
- 399 shared, 342 API, 259 web tests
- Six checks clean
- 33 migrations replay from empty

---

# Third pass: why bots never spoke

You were right, and the dialogue was never the problem. All 2,791 lines are in
the roster, the seed writes them, the schema stores them, the API returns them,
the client caches them, the hook picks from them and the bubble renders them.

**The break was that `bot` was null.**

Its identity came only from a `botGameConfig` written to sessionStorage by the
selection page - and **read once, then deleted**. So:

- Start a game from the picker: works, briefly
- Reload the page: config gone, `bot` null, silence
- Open the game from a link or from your games list: never had a config, silence

A null bot has no `messages`, and the chat hook returns on its first line. Every
trigger fired correctly into nothing.

The identity is now also resolved from the **game record**, which carries
`botElo` and `botId` and survives anything. The sessionStorage path still runs
first; this is the fallback that should always have existed.

Worth noting this only became fully fixable once games stored `botId` - before
that, rating was the only identity available, and Pip and WorstFish share one.

## Verified again after the change

- `next build` succeeds
- 399 shared, 259 web tests
- Five checks clean

# This batch

## The bot page text, definitively

Four rounds of fixing this by eye, three of them wrong. The reason it kept
surviving:

```
bg-aurora-cyan/20 text-night-950
```

That reads as dark-on-light. It renders as dark-on-**dark**, because `/20` makes
it a faint cyan tint over a near-black page. **1.36:1.** No amount of looking at
the class name reveals that; it takes arithmetic.

Worse, my previous "fix" appended a text colour to branches that already had
one, leaving two per branch — and Tailwind resolves duplicates by stylesheet
order, not source order, so which one won was effectively arbitrary.

Now measured rather than judged. `scripts/check-contrast.mjs` computes WCAG
contrast for every text/background pair in the app and fails the build below
4.5:1. It found **92 failures app-wide**, including `night-500`, which the
palette comment optimistically calls "dimmest readable text" at 3.28:1, and
`text-white` on cyan at 2.19:1.

All 92 fixed. It runs as part of `pnpm check`, so this cannot come back.

The two genuine exceptions — text whose background comes from a parent element
the checker cannot see — are marked `contrast-ok` inline, at the point they
apply, rather than hidden in a config list.

## Also fixed

**Mate showed as +1000.0.** `MoveFeedback` had no column for it, so the worker
computed mate and threw it away, and every call site passed `mate={null}`.
A forced mate is not a large advantage, it is a finished game. Added
`mateAfter`, plumbed through the worker, the API and both analysis paths.

**Settings toggles escaped their track.** The knob had no `left`, so it fell
back to its static position — which shifts with any padding the button inherits
— and the transform then carried it past the edge. Anchored with `left-0.5`,
travel set to exactly 20px, and the track clips anything that still escapes.

**Search is its own page now**, at `/search`, linked from both navs. Not a
panel on the friends page. Filtering people you know and searching everyone are
different jobs; identical inputs on one screen made them read as one broken
control. The friends filter is untouched.

**Main menu button** on the bot result screen. Every route out of it led back
into bot play — there was no way to reach the rest of the site without the
browser back button.

**Puzzle rating** now shows at the top of the page rather than only as a
footnote after a solve. The Glicko-2 update was already correct and already
persisting; it was the display that was missing.

**Standing page logo** is the real Aurora mark.

**Login** tells you when there is no account, with the signup link in the
message rather than as a hint underneath.

## Verified

340 API, 317 shared, 251 web tests. Schema, routes and contrast all clean.

## Not done

Large, and each wants its own session:

- Daily/correspondence games
- Bot CRUD from the bot page
- Image uploads for avatars, plus the CSAM scanner
- Authorised alts with an account switcher
- Draw offers reusing the challenge popup
- Text-glyph piece theme, board grid options
- Full light-theme colour inversion
- More multi-move tactical puzzles
- Google sign-in

## The forgotten bot feature — best guesses

Ranked by how likely they are to be the thing, and by how much they would
matter:

1. **Bot rating adjusts to your results.** A bot that tracks you, so the ladder
   stays challenging without you picking a number. This is the one I would bet
   on — it is the feature most chess sites have, and the most missed when absent.
2. **Bots explaining their moves.** Given the coaching data already exists, a
   bot saying "I played that to stop your knight" would be distinctive and fits
   the site's teaching angle.
3. **Named opening challenges** — "beat Aurora in the Sicilian" — now that the
   repertoire system actually works.
4. **Bot personalities affecting time use**, so a fast bot moves fast and a
   thoughtful one pauses. Small, atmospheric.
5. **A bot that plays like you**, trained on your own games. Ambitious, and
   Maia is already in the engine catalogue for exactly this shape of thing.

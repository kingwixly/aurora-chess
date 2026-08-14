# Theming sweep

You were right to be annoyed. I had been fixing pages one at a time, which was
never going to converge. The actual scale of it:

**587 legacy colour classes across 60 files.** Now zero — the audit
(`grep -ro "gray-[0-9]00\|blue-[0-9]00" apps/web/src`) returns nothing.

## What changed

The palette had no readable text ramp, which is why every page invented its own
grey. It now has one:

| Token | Hex | Use |
|---|---|---|
| `night-950` | `#05070E` | page background |
| `night-900` | `#0A0F1C` | panels — the logo's piece colour |
| `night-800` | `#111a2e` | raised surfaces |
| `night-700` | `#1b2740` | borders, dividers |
| `night-600` | `#2a3a5c` | borders on raised surfaces |
| `night-500` | `#4d6289` | dimmest readable text |
| `night-400` | `#8296b8` | secondary text — the workhorse |
| `night-300` | `#b6c4da` | emphasised secondary |

Primary actions are `bg-aurora-cyan` with `text-night-950`. The sweep also
stripped `text-white` from anything that became cyan — white on `#18C0D8` is
unreadable, and a naive find-and-replace would have left it there.

Headings across 15 more files now carry the display face. Ratings, clocks and
move numbers use the mono face.

## Piece sets: cut

Removed from settings and from `BoardThemeStyles`. The comment in that file
records why, so nobody re-adds a filter and calls it a piece set. Easy to bring
back when you have real assets — the store type is still there.

## Captured material: your choice

New setting with two modes, both computed from surviving material so promotions
stay correct:

- **Difference only** (default) — `♞ +2`, the online convention. Pieces that
  cancel out carry no information, so they are not shown.
- **Everything captured** — the over-the-board layout you have now.

Stored locally rather than server-side: it is a display preference, and the
server has no column for it.

## Settings page

Rebuilt: account block with your title and a log-out, board colours with live
swatches that actually render the theme, captured-material choice with samples,
and preference toggles. Reachable from a gear beside your account details in the
dashboard header.

## Bot descriptions

The card still shows two lines, but selecting an opponent now opens a **detail
panel** below the list — portrait at 72px, full description, and the band they
belong to with its one-line character. The descriptions were the one thing
making opponents feel like people rather than difficulty settings, and clipping
them to four words threw that away.

## Verified

185 tests, `packages/chess` and `packages/ui` typecheck clean, palette audit
clean, everything formatted. `apps/web` still needs `prisma generate` before
`pnpm -r typecheck` will run.

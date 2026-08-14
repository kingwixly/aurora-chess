# The full update

## Bot roster — done and rendering

All 31 portraits cropped from your sheet to 256×256 and dropped in
`apps/web/public/bots/`. `bots.yml` rewritten: new names, descriptions, and
dialogue, with `avatar` now a file path instead of an emoji.

`BotAvatar` falls back to the character's initial when a file is missing, and
still renders an emoji if it finds one — so an un-migrated database degrades
instead of breaking.

**Run `make seed-bots` with `FORCE_RESEED=1`** to replace the old bots in your
database. Without the force flag the seeder skips existing rows to preserve
admin edits, and you would keep Amir and the emojis.

Descriptions now wrap to two lines in the selector rather than truncating —
that was why they never fit.

## Dialogue

Already wired to board events upstream (`onCapture`, `onBeingChecked`,
`onGivingCheck`, `onBlunder`, `onPlayerBlunder`, `onWinning`, `onLosing`,
`onCheckmate`, `onCheckmated`, `onDraw`). What I changed is the writing: voice
now shifts by band. Hearthside talks *to* you, Weather talks *at* you, Deep sky
barely acknowledges you exist. Beat a Deep sky bot and you get "...Remarkable."

## Matchmaking

`apps/api/src/lib/matchmaking.ts` — real-time random pairing over the existing
socket. Pairs on **closest rating**, with a window that opens 25 points per
second from a 200-point start, capped at 1200. Either side's window qualifying
is enough, so a newcomer cannot gate a match for someone who has waited
minutes. Colour is a coin flip.

Held in process memory, deliberately. If you ever run more than one API
instance this must move to Redis — two players on different instances would
otherwise never find each other. Comment in the file says so.

`/play/queue` is the page. **Snake while you wait**, and the wait is stated
honestly: elapsed seconds plus a note that the rating window widens, so a
strong player on a quiet server understands why they are still queuing.

## Session and navigation

- **Logout goes to `/`**, and clears local state even if the server call fails.
  A network error must not leave someone apparently logged in.
- **The homepage no longer redirects signed-in users.** It renders a
  returning-user variant instead — account details in the corner, Play as the
  primary CTA, Quick play deliberately quieter beside it. That redirect is what
  produced your blank screen: it sent you to a page that then failed, with no
  way back.
- `/signup` redirects to `/register`.

## Game over screen

Rebuilt. Leads with **"You won" / "You lost"** from the viewer's side rather
than `WHITE_WIN`, with the rating delta large and adjacent, and a coloured band
at the top so the outcome registers before you read anything. Actions ordered by
what people actually do: play again, analyse, leave. Spectators see the neutral
result rather than being told they lost a game they were watching.

## Theming

`/play/bot` and `/play/friend` swept onto the design system — no more grey
Tailwind defaults fighting the navy. Both use the display face for headings and
the aurora cyan for primary actions.

## Random opponent vs bots

"Surprise me" on the bot page rolls a bot **and** a time control **and** a
colour. Weighted to ±400 of your rating rather than uniform across the ladder —
a uniform roll throws a 1200 player at Aurora one time in seven, which teaches
nothing.

## Verified

185 tests, `packages/chess` and `packages/ui` typecheck clean, everything
formatted. `apps/web` and `apps/api` still cannot be typechecked here (no Prisma
client). **Run `pnpm -r typecheck` after `prisma generate`.**

## Known gaps

- Google sign-in not built.
- The drawing-board minigame is not built; Snake only.
- Profile badge shelf still not wired into the profile page.
- Six API routes still need `PUBLIC_USER_SELECT` so titles show everywhere.

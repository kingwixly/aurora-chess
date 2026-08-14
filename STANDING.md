# Phases 1–4: punishments, standing, appeals, fair play

Both open decisions taken as recommended: **always forward, never auto-ban**,
and the standing pages are a **route group** in the existing web app rather than
a fourth deployable.

## The punishment ladder

`packages/chess/src/moderation/punishments.ts` holds every rule about what an
action blocks, when it becomes history, and whether it can be contested. One
place, because moderation rules implemented in five places become five slightly
different rules.

| | Public play | Friends | Bots | Puzzles | Chat | Browse | Standing |
|---|---|---|---|---|---|---|---|
| Warning | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Restriction | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Suspension | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Deactivation | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Ban | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** |

Capabilities are only ever *removed*, so overlapping punishments combine to the
most restrictive rather than the most recent — otherwise a warning issued after
a suspension would quietly unsuspend someone. There is a test for that.

Bots and puzzles survive a suspension deliberately: the punishment is about the
offence, not about withholding chess.

## Standing is reachable while banned

The architectural point from the roadmap, now real. Authentication is
unconditional; **capabilities** are checked per route. `/standing` and
`/standing/appeal` check none.

If the ban check had stayed in the auth middleware, every ban would have been
permanent in practice regardless of intent, because a banned user could not sign
in to contest it.

## Strikes

Twelve-month window, as agreed, for both escalation and the automatic title
block. Records stay visible to staff forever; only their weight expires.

An overturned punishment never counts — a successful appeal means it should not
have happened, so it must not keep having effects.

Bans never become strikes. They stay on the record as bans.

## Appeals

Any punishment on your account is appealable, **including an expired warning** —
it still counts toward escalation and still blocks automatic titles, so removing
it is a real stake.

Blocked only for: nothing on record, a ban under 72 hours, appeals disabled by a
moderator, one already open, three consecutive denials, or an appeal ban. Each
reason is shown on the standing page rather than left to be discovered.

**One open appeal per punishment is enforced by a partial unique index**, not
just by the route — a double-submit cannot create two.

The public Discord lane is opt-in, recorded in `source`, and **withdrawing the
public post touches nothing else**: same row, same queue position, no status
change. Verified in the route.

## Screening never punishes

`screenGame` runs after every rated game and can only open a `CheatReport` for a
human. There is deliberately no code path from screening to a ban.

**Honest gap:** accuracy is currently computed client-side during analysis and
never persisted, so `assessGame` has nothing meaningful to read. The hook and
the shape are in place; the inputs are not. Rather than invent numbers I left it
inert with a comment saying so. Persisting per-game accuracy is the next piece.

## Fair play page

`/fair-play`, public. States that no ban is automatic, that titled players are
exempt, that you will always be told why, that standing survives a ban, how both
appeal routes work, and that records expire after twelve months.

## Migration

Existing `Ban` rows are **carried across** into `Punishment` as `type = BAN`
before the old table is dropped — a ban issued yesterday still applies. Verified
on seeded data.

Every `prisma.ban` call site was migrated; the leaderboard filter now excludes
only banned accounts rather than anyone with any punishment, since a suspension
is temporary and does not erase what someone achieved.

## Verified

- 29 new tests on the punishment ladder; 252 shared tests total
- 244 web tests, 11 anticheat tests
- Schema check clean across 28 models
- Migration replays clean, legacy ban carried across, duplicate open appeal
  rejected by the database

## Next

- Persist per-game accuracy so screening has real inputs
- Report submission UI (profile and message)
- Admin: issue the new punishment types, review appeals, record decisions
- Friends strip, profile identity, live game chat, coaching bands

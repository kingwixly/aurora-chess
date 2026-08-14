# FIDE verification and profiles

Two separate features, deliberately kept apart.

## 1. The verification mark

`User.fideVerified` — a boolean staff toggle meaning site verification is
complete *and* a registered FIDE account has been confirmed.

Renders **before the mod shield and before the title**, because it qualifies
*who someone is* rather than how well they play. It rides in `TITLE_SELECT`, so
it appears everywhere a name appears rather than only on profiles.

**The uploaded lockup could not be used inline.** At 16px the wordmark is
illegible. So there are two assets: the check in a navy roundel for inline use,
and the full lockup for the profile panel. The lockup's navy was also recoloured
to light blue — the original disappears against a dark panel.

## 2. The profile panel

`FideProfile`, a separate table. Staff-maintained, **disabled by default**,
shown only on a player's profile.

Carries FIDE's own Standard / Rapid / Blitz ratings, arena and official titles,
federation, FIDE ID, and an optional profile link.

Three decisions worth knowing:

**Arena titles never appear beside a username.** AGM/AIM/AFM/ACM are earned on
FIDE Online Arena, not over the board. An AGM shown next to a real GM would
misrepresent both. There is a test asserting they stay out of the title system.

**An enabled but empty panel is withheld.** `shouldShowFideProfile` requires the
switch *and* at least one populated field — an empty panel implies missing data
rather than unentered data.

**The profile URL is restricted to fide.com over https.** It is staff-entered
and rendered as an outbound link on a public page, which is exactly where a
mistyped or hostile URL ends up. Lookalikes like `fide.com.evil.example` are
rejected; there are tests for that.

Unrated pools render an em dash, not `0` — unrated and zero are different facts.

## API

`PATCH /api/v1/admin/users/:id/fide` — staff only, audit-logged as
`user.fide.update`. Every field optional; `null` clears.

```jsonc
{ "fideVerified": true, "fideId": "1503014" }
{ "enabled": true, "standard": 2543, "rapid": 2501, "blitz": 2488 }
{ "arenaTitles": ["AGM", "IA"] }
{ "profileUrl": "https://ratings.fide.com/profile/1503014", "federation": "ENG" }
```

## Verified

Migration replayed clean against real Postgres 16, including the array column,
the unique constraint, and cascade delete. 195 shared tests (10 new for FIDE),
245 web tests, every package and app typechecked except `apps/api`.

## Not yet wired

The **admin UI** for these fields does not exist — the endpoint works, the form
does not. Same for the **profile page**, which still does not render
`FideProfilePanel` or the badge shelf. Both are waiting on the profile page
rebuild, which is the next piece of work.

# Registration is open

The invite gate is off. Anyone can create an account.

## Gated, not deleted

The invite system is intact and switched off by a setting — `inviteOnly` on
`SiteSettings`, default `false`. If open signup ever attracts the wrong traffic,
you flip it from the admin panel with no deployment.

Deleting it would have meant rebuilding it under pressure at exactly the moment
you needed it.

## Existing codes still work

A code supplied when none is required is **still honoured and consumed**.
Otherwise every invite you had already sent out would have silently stopped
meaning anything the moment the gate came down, and whoever sent them would look
unreliable.

A code that is already spent is now **ignored** rather than refused — there is
no reason to block an otherwise valid signup over it.

## The form

The invite field moved to the bottom and collapsed behind "Have an invite
code?". Signing up should not begin with a hurdle, but someone holding a code
should not have to wonder where it goes.

## Worth knowing

Open registration means **anyone banned can make a new account**. The moderation
work covers this better than most sites — device fingerprints and IP bans
survive a fresh signup — but it is no longer a wall, it is a speed bump.

`REQUIRE_EMAIL_VERIFICATION` already exists in `.env` and is `false`. Turning it
on is the obvious next lever if automated signups become a problem; it needs
mail sending wired up first.

## Verified

- 4 new tests: signup with no code, a valid code still consumed, a spent code
  ignored, and **invite-only mode still enforcing** when switched back on
- 259 shared, 309 api, 250 web tests
- 28 migrations replay clean
- Schema and route checks clean, all packages typecheck

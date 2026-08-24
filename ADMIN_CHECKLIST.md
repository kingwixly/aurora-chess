# Admin panel: every link in the chain

Nine things must all hold for the Admin button to work. I traced each one.
Where I could test it, there is a test; where I could not, the check is written
down so you can run it in thirty seconds on the server.

## The chain

| #   | Requirement                                        | Status                                                 |
| --- | -------------------------------------------------- | ------------------------------------------------------ |
| 1   | `/auth/me` returns `role`                          | **tested**                                             |
| 2   | Login returns `role`                               | **tested**                                             |
| 3   | Web `User` type has `role`                         | verified in source                                     |
| 4   | Button renders when `role === "ADMIN"`             | verified in source                                     |
| 5   | `NEXT_PUBLIC_ADMIN_URL` baked at build time        | verified — build arg + `ARG`/`ENV` in Dockerfile       |
| 6   | Refresh cookie scoped to `.aurorachess.org`        | verified — `cookieOptions` applies `getCookieDomain()` |
| 7   | nginx routes `admin.*` to the admin container      | verified in `nginx.http.conf`                          |
| 8   | Admin app can get a token on its own origin        | fixed — refreshes before `/auth/me`                    |
| 9   | Account is actually `role = ADMIN` in the database | **this is what broke last time**                       |

## What broke before, and why each is now guarded

**The seed left the account as USER.** `prisma.user.upsert` had `update: {}`, so
an account created by registering — before the seed ever ran — never got the
role. Now `update: { role: "ADMIN", verified: true }`. The password is
deliberately not reset.

**The panel could not authenticate on its own subdomain.** It starts with no
access token in memory, because a different origin is a different JS context.
It relied on a 401 to trigger a refresh; if that call failed for any reason
other than a genuine 401 — CORS, a network blip — the retry never fired and it
bounced to `/login`, which saw a live session and sent you to `/play`. It now
calls refresh explicitly first.

**CORS did not list the admin origin under some configurations.** `ADMIN_URL`
falls back to `siteUrl.replace("://", "://admin.")`, which is correct, and
`ADMIN_URL` is now documented in `.env.example`.

## Diagnose it in one request

The panel no longer redirects on failure — it renders the reason. If you are
signed in as a non-admin it says so, and names the role it found.

There is also a diagnostic endpoint. Open this in the browser while logged in:

    https://aurorachess.org/api/v1/auth/whoami

It reports whether the refresh cookie arrived, whether it is valid, your role,
whether that counts as admin, and what the API believes its own host, cookie
domain and admin URL to be. That covers every cause of the loop in one call.

Then the same on the admin host, which is the comparison that matters:

    https://admin.aurorachess.org/api/v1/auth/whoami

If `refreshCookiePresent` is true on the main site and false on the admin one,
the cookie is not scoped to the parent domain. If it is true on both and
`isAdmin` is false, the account is not an admin.

## Verify on the server in thirty seconds

Run these after deploying, before assuming it works.

```sh
cd ~/aurora
A='docker compose --env-file .env -f deployment/docker-compose.yml'

# 9. The account is an admin. This is the one that bit you.
$A exec postgres psql -U postgres -d aurorachess \
  -c "SELECT username, role, \"staffRank\" FROM \"User\" WHERE username='dani';"

# 5. The button has somewhere to point.
grep NEXT_PUBLIC_ADMIN_URL .env

# 6/7. The admin host answers at all.
curl -sI https://admin.aurorachess.org | head -3
```

If step 9 shows `USER`, fix it directly — this does not need a rebuild:

```sh
$A exec postgres psql -U postgres -d aurorachess \
  -c "UPDATE \"User\" SET role='ADMIN', \"staffRank\"='Admin' WHERE username='dani';"
```

Then **sign out and back in.** The role is read into the store at login, so an
existing session still carries the old value.

## An honest limitation

`src/routes/admin.test.ts`, `src/middleware/admin.test.ts`, `src/lib/gameClock.test.ts`
and the new `adminAccess.test.ts` **cannot run without a generated Prisma
client**, and this sandbox cannot reach `binaries.prisma.sh` to generate one.

That is the same failure you hit locally before running `prisma generate`. The
other 317 tests pass here. To run the admin ones:

```powershell
pnpm --filter @aurora/api exec prisma generate
pnpm --filter @aurora/api test
```

I would rather say that plainly than tell you they are verified when I could
not execute them.

**This bit me immediately.** The first version of `adminAccess.test.ts`
registered only `adminRoutes`, so the `/auth/me` assertion hit a route that was
not mounted and returned 404. I could not see that here; it failed on the first
real run. The file now registers both route sets, which is what the admin path
actually crosses.

## Worth adding

`prisma generate` belongs in a `postinstall` script so a fresh clone can run its
own tests. Not done here to avoid touching the build on a release you are about
to deploy.

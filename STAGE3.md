# Aurora Chess - stage 3

## Changes

**NM and WNM are back**, as a `NATIONAL_TITLES` group distinct from FIDE. They
are federation credentials, so `isOfficialTitle()` covers both sets while
`isFideTitle()` stays narrow. The migration no longer clears them.

**HrM is now TdM**, labelled Traditional Master. Note the label changed with the
abbreviation — TdM reads as Traditional, not Heritage. One-line fix in
`packages/chess/src/player/titles.ts` if you want Heritage back.

**Automatic titles can now actually be earned during play.** Previously the
recompute only read `peakRating`, so BM, TdM, PM, EM and TM could never fire.
`updatePeakAndAutoTitle` now reads the per-time-control pools, puzzle stats,
endgame record and tournament count. A new `updatePoolRating` writes the pool
*before* the recompute reads it, so a player crossing 2200 in blitz gets BM on
that game rather than their next one.

**PM cutoff computation.** `recomputePuzzleCutoff()` takes the 95th percentile
across solvers with 200+ puzzles, and refuses to produce a non-zero cutoff below
20 eligible solvers. Schedule it weekly (see DEPLOY.md); until then PM stays
disabled, which is correct on a small site.

**Badge serialization drops `evidence`.** It can hold a FIDE ID or federation
reference, so it is staff-visible only and never reaches the wire.

**Cloudflare Tunnel deployment.** `deployment/docker-compose.cloudflared.yml`
adds `cloudflared`, **removes nginx's published ports**, and disables certbot.
`./bootstrap.sh --domain yourdomain.com --tunnel` wires it up and refuses to
start without a `TUNNEL_TOKEN`.

## Verified

Against real Postgres 16: all migrations replay clean from empty and against
seeded data. `natl` keeps NM through the migration; `dani` at 2500 recomputes
IM/UM; `strong` at 2300 moves UM to AM under the new thresholds. Enums land as
`GM,WGM,IM,WIM,FM,WFM,CM,WCM,NM,WNM,HM,RM,OM` and `UM,AM,BM,TdM,PM,EM,TM`.

`packages/chess`: 185 tests, typecheck clean. `packages/ui`: typecheck clean.
Both compose files parse. `bootstrap.sh` passes `sh -n` and is pure ASCII.

**Not verified:** anything importing `@prisma/client` — the sandbox cannot reach
`binaries.prisma.sh`. `bootstrap.ps1` runs `prisma generate` first, so schema
errors surface there. `bootstrap.ps1` itself has never been parsed by a real
PowerShell.

## Still missing

Being straight about this rather than implying a finished product:

- **Puzzles and tournaments do not exist.** PM and TM are wired but unearnable
  until they do.
- **Endgame tracking is not wired.** `endgameWins`/`endgameGames` exist and are
  read, but nothing increments them, so EM cannot be earned yet.
- **The frontend is still EyeOnChess's, renamed.** No homepage, no redesign, no
  badge display or pinning UI, no challenge system. Title badges render only on
  the profile and in search.
- **Admin UI does not cover badges** — the API model is there, the screen is not.
- **The small-size logo mark** is still unreadable below 48px.

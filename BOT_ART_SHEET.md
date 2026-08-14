# Bot art sheet — generation brief

31 characters, one 512×512 square each, transparent or dark background.

## House style (put this in every prompt)

> Semi-realistic painterly portrait bust, head and shoulders, facing slightly
> off-centre. Dark navy background (#0A0F1C) with a faint cyan-to-violet aurora
> glow behind the subject. Cool northern palette: teal, cyan, violet, deep blue,
> with warm light only where the character's own light source justifies it.
> Square crop, subject centred, no text, no border, no chessboard unless
> specified.

Consistency matters more than any single image. Generate a full band in one
batch so the lighting matches within it.

## Warmth gradient

Warm light drops as rating climbs — that is the whole visual arc, so hold it:

| Band | Lighting |
|---|---|
| Hearthside | Warm interior light dominant, aurora only in a window |
| Trailhead | Cold daylight, aurora faint on the horizon |
| Weather | No warm light at all, grey and white, aurora obscured by cloud |
| Aurora | The character IS lit by the aurora, cyan and violet on skin |
| Deep sky | No atmosphere. Starlight only. Black background, high contrast |

## Characters

| # | Name | Elo | Band | Visual brief |
|---|---|---|---|---|
| 1 | **Pip** | 200 | Hearthside | Small child in an oversized knitted jumper, mug of cocoa, wooden board, warm lamplight |
| 2 | **Nan** | 300 | Hearthside | Elderly woman, cardigan and reading glasses, knitting basket beside her, fireside |
| 3 | **Bramble** | 400 | Hearthside | Shaggy border collie sitting at a board, paw on a pawn, snow on the windowsill |
| 4 | **Rusk** | 500 | Hearthside | Broad man dusted in flour, apron, board balanced on a barrel, dawn light |
| 5 | **Wick** | 600 | Hearthside | Lean figure with a lighting pole and lantern, dusk, breath fogging |
| 6 | **Marta** | 700 | Hearthside | Innkeeper leaning on a bar, tankard, board between two stools, candlelight |
| 7 | **Tobin** | 800 | Hearthside | Teenager, patched coat, cocky grin, one foot on a chair |
| 8 | **Sable** | 900 | Trailhead | Fur-hooded figure with snowshoes, pine forest, low grey sky |
| 9 | **Ivar** | 1000 | Trailhead | Weathered boatman with an oar, river ice, rope coiled |
| 10 | **Cairn** | 1100 | Trailhead | Climber with rope and ice axe beside a stone waymarker, ridge at altitude |
| 11 | **Juniper** | 1200 | Trailhead | Woman with a satchel of cuttings, hedgerow, early frost |
| 12 | **Flurry** | 1300 | Weather | Swirl of snow half-forming a face, scarf whipping, no solid body |
| 13 | **Hail** | 1400 | Weather | Storm figure of ice shards, dark cloud shoulders, sharp light |
| 14 | **Thaw** | 1500 | Weather | Melting ice sculpture of a person, water running, weak sun |
| 15 | **Squall** | 1600 | Weather | Figure of wind and sleet over open water, sails torn behind |
| 16 | **Rime** | 1700 | Weather | Frost-covered humanoid, crystals growing outward, still air |
| 17 | **Gale** | 1800 | Weather | Tall bent figure of driven air, trees flattened behind, grey |
| 18 | **Tempest** | 1900 | Weather | Massive storm figure, lightning in the chest, arctic sea below |
| 19 | **Corona** | 2000 | Aurora | Luminous crowned figure, cyan and violet ribbons, night sky |
| 20 | **Vela** | 2100 | Aurora | Sail-like ribbon of green-cyan light, slender figure inside |
| 21 | **Sunder** | 2200 | Aurora | Aurora curtain torn cleanly down the middle, figure at the tear |
| 22 | **Halcyon** | 2300 | Aurora | Serene figure, still water reflecting aurora, kingfisher |
| 23 | **Zenith** | 2400 | Aurora | Figure viewed from below at the sky's apex, radiating cyan/violet |
| 24 | **Solstice** | 2500 | Aurora | Dark-robed figure, sun barely at the horizon, long shadow |
| 25 | **Lyra** | 2600 | Deep sky | Constellation figure strung with light like a harp |
| 26 | **Vega** | 2700 | Deep sky | Blazing blue-white star given a humanoid silhouette |
| 27 | **Aldebaran** | 2800 | Deep sky | Deep orange giant star, watchful eye motif, Hyades cluster |
| 28 | **Polaris** | 2900 | Deep sky | Single unmoving star, all other stars streaked in a long exposure |
| 29 | **Umbra** | 3000 | Deep sky | Total-eclipse silhouette, corona ring, oppressive black |
| 30 | **Ecliptic** | 3100 | Deep sky | Vast arc across the sky with planets threaded on it, faceless |
| 31 | **Aurora** | 3200 | Deep sky | The full aurora rendered as a crowned queen, cyan to violet, absolute |

## Filenames

Save each as `apps/web/public/bots/<id>.png`, lowercase, matching the `id`
column in `deployment/config/bots.yml`:


```
pip.png  nan.png  bramble.png  rusk.png  wick.png  marta.png  tobin.png  sable.png  ivar.png  cairn.png  juniper.png  flurry.png  hail.png  thaw.png  squall.png  rime.png  gale.png  tempest.png  corona.png  vela.png  sunder.png  halcyon.png  zenith.png  solstice.png  lyra.png  vega.png  aldebaran.png  polaris.png  umbra.png  ecliptic.png  aurora.png
```

The UI falls back to initials when a file is missing, so you can drop art in one
band at a time without breaking anything.

## If you generate a contact sheet instead

Ask for a 4×8 grid at 2048×4096, one character per cell in roster order, then
crop to 512×512. Grids drift in style across rows — if the bottom rows come out
inconsistent with the top, generate band by band instead.
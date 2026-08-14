# The Fae border and the /play/bot theming

## The black border was my resize, not the crop

I had been attacking the wrong thing for two rounds. Cropping was only half of
it — the dark fringe came from **resizing RGBA with LANCZOS**, which blends the
RGB of fully transparent pixels into the edges. Transparent pixels have RGB
`(0,0,0)`, so every piece picked up a black halo on the way down to 128px.

Fixed by resizing in **premultiplied alpha** and unpremultiplying afterwards,
which is the correct way to resample an image with transparency. This affected
every set, not just Fae — Vista and Fatty had it too, and I could not see it
because I kept inspecting the crop.

## The speck was a geometry problem, so I stopped using geometry

The Fae sheet stacks a light piece above a dark one **with overlapping bounding
boxes**. Any geometric split — grid, gap detection, anything — pulls in a sliver
of the neighbour, and connectivity filtering cannot help because the sliver
touches the piece.

The two pieces occupy disjoint tone ranges, so the set is now separated by
**tone across the full column** instead. Each dark piece's own pale outline is
recovered by dilating its body and taking adjacent pale pixels that are not part
of the white piece.

Verified visually on all 36 files, and by pixel count.

## /play/bot theming — what was actually wrong

I had been regex-patching the page and never looked at its **child components**,
which is where the inconsistency lived. `BotSelector`, `TimeControlPicker` and
`BotDetail` render most of what you see on that screen.

Four concrete faults, now fixed across all bot-play surfaces:

- **Two radius scales.** `rounded` and `rounded-lg` mixed within the same
  screen. Now one step for controls, `rounded-xl` for cards.
- **`font-bold` where everything else uses the display face.** A bare bold
  sans-serif next to Fraunces reads as a different site.
- **Dead hovers.** `bg-night-800 hover:bg-night-800` — a hover state that
  changes nothing. Now steps to the next surface.
- **`text-white` on `bg-aurora-cyan`.** White on `#18C0D8` fails contrast; those
  buttons now use `text-night-950` like every other primary action.

Also: the bot's rating is now set in the mono face, like every other rating on
the site, and tier chips are label-sized rather than heading-sized.

## Verified

Schema check clean. 223 shared, 244 web, 11 anticheat tests. Every package and
app typechecks.

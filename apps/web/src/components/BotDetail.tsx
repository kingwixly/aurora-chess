"use client";

import type { BotPersonality } from "@aurora/chess";
import BotAvatar from "./BotAvatar";

/** Rating bands, matching the roster's altitude structure. */
function bandFor(elo: number): { name: string; blurb: string } {
  if (elo <= 800) return { name: "Hearthside", blurb: "A village that barely looks up." };
  if (elo <= 1200) return { name: "Trailhead", blurb: "Outdoors, practical, weather-hardened." };
  if (elo <= 1900) return { name: "Weather", blurb: "Elemental. No longer quite people." };
  if (elo <= 2500) return { name: "Aurora", blurb: "The lights themselves." };
  return { name: "Deep sky", blurb: "Cosmic, and not interested in you." };
}

/**
 * The selected opponent, at full size.
 *
 * The list gives you a name and a rating; this is where the character actually
 * lands. Descriptions were being clipped to a few words in the card, which
 * wasted the one thing that makes an opponent feel like someone rather than a
 * difficulty setting.
 */
export default function BotDetail({ bot }: { bot: BotPersonality | null }) {
  if (!bot) {
    return (
      <div className="rounded-xl bg-night-900 p-6 text-center ring-1 ring-inset ring-night-700">
        <p className="text-sm text-night-400">Pick an opponent to see who you are up against.</p>
      </div>
    );
  }

  const band = bandFor(bot.elo);

  return (
    <div className="overflow-hidden rounded-xl bg-night-900 ring-1 ring-inset ring-night-700">
      <div className="flex items-center gap-4 p-5">
        <BotAvatar name={bot.name} avatar={bot.avatar} size={72} />
        <div className="min-w-0">
          <h3 className="font-display text-2xl tracking-tight">{bot.name}</h3>
          <p className="font-mono text-sm text-night-400">{bot.elo}</p>
        </div>
      </div>

      <div className="border-t border-night-700 px-5 py-4">
        <p className="text-sm leading-relaxed text-night-300">{bot.description}</p>
      </div>

      <div className="border-t border-night-700 px-5 py-3">
        <p className="text-xs uppercase tracking-wider text-night-500">{band.name}</p>
        <p className="mt-0.5 text-sm text-night-400">{band.blurb}</p>
      </div>
    </div>
  );
}

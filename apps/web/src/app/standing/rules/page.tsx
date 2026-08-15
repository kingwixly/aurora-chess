import type { Metadata } from "next";
import { PUNISHMENT_EFFECTS, STRIKE_WINDOW_MONTHS } from "@aurora/chess";

export const metadata: Metadata = { title: "Rules" };

const RULES = [
  {
    title: "Play your own moves",
    body: "No engine assistance, no opening books mid-game, no help from another person. Analysis after a game is unlimited and encouraged \u2014 the restriction is on live play only.",
  },
  {
    title: "Do not throw games or manipulate ratings",
    body: "Losing on purpose, arranging results, or feeding rating to another account. This includes creating a second account to lose to your first.",
  },
  {
    title: "One account each",
    body: "A second account is fine if staff know about it. Using one to get around a punishment is treated as the punishment continuing.",
  },
  {
    title: "Chat is for chess",
    body: "No abuse, harassment, slurs, or sexual content. Disagreeing with someone is fine; going after them is not. This applies in game chat, direct messages, and usernames.",
  },
  {
    title: "Do not stall",
    body: "Letting the clock run down in a lost position rather than resigning, or repeatedly abandoning games mid-play. Taking your time over a real decision is not stalling.",
  },
  {
    title: "Usernames represent you, not someone else",
    body: "No impersonating other players or staff, and nothing offensive. Names you have previously held stay searchable, so a change cannot be used to shed a reputation.",
  },
  {
    title: "You must be 13 or older",
    body: "The minimum age for an account, and not negotiable.",
  },
];

/**
 * The rules, in plain language.
 *
 * Written as what is expected rather than as a list of offences: the point is
 * that someone can read this and know where the lines are, not that we can
 * point at a clause afterwards.
 */
export default function RulesPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl tracking-tight">Rules</h1>
      <p className="mt-2 text-sm text-[#5a6478]">
        Short, and all of it enforced by a person rather than a script.
      </p>

      <ol className="mt-8 space-y-5">
        {RULES.map((r, i) => (
          <li key={r.title} className="flex gap-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef1f7] font-mono text-sm font-bold text-[#5a6478]">
              {i + 1}
            </span>
            <div>
              <h2 className="font-display text-lg">{r.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#3c4658]">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-2xl">What happens if you break one</h2>
      <p className="mt-2 text-sm text-[#5a6478]">
        Five levels. Which one applies depends on what happened and what is already on your record.
      </p>

      <dl className="mt-4 divide-y divide-[#dde1ea] overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-[#dde1ea]">
        {(["WARNING", "RESTRICTION", "SUSPENSION", "DEACTIVATION", "BAN"] as const).map((type) => (
          <div key={type} className="px-5 py-3">
            <dt className="font-display text-base capitalize">{type.toLowerCase()}</dt>
            <dd className="mt-0.5 text-sm text-[#3c4658]">{PUNISHMENT_EFFECTS[type]}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-12 font-display text-2xl">Records expire</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#3c4658]">
        An action that ends becomes a strike. Strikes stop counting toward further action, and stop
        pausing automatic titles, after {STRIKE_WINDOW_MONTHS} months. Staff can still see them, but
        they stop having effects. A mistake should not follow you forever.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#3c4658]">
        A ban is the exception: it stays on the record as a ban and never becomes a strike.
      </p>
    </div>
  );
}

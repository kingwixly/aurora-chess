import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How moderation works" };

/**
 * How moderation actually works here.
 *
 * The most common complaint about large chess sites is being actioned with no
 * explanation and no meaningful appeal. Saying plainly what we do — including
 * the one thing we hold back and why — is most of what makes a small site feel
 * fair, and it costs nothing.
 */
export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl tracking-tight">How moderation works</h1>
      <p className="mt-2 text-sm text-[#5a6478]">
        In full. If anything below turns out not to be true, that is a bug and we want to hear about
        it.
      </p>

      <section className="mt-9">
        <h2 className="font-display text-2xl">No action is automatic</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4658]">
          Software flags games it finds unusual. It cannot action anyone. Every warning, every
          restriction, every ban is issued by a person who looked at the games first.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#3c4658]">
          This is slower, and we will miss some cheating because of it. We think that is the right
          trade. Accuracy statistics cannot tell a cheat from a strong player having a good game,
          and a system that acts on them alone will punish people who are simply improving.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-2xl">Titled players are not flagged for playing well</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4658]">
          Verified federation titles are exempt from automated review. Engine-like accuracy is the
          thing a title certifies; treating it as evidence of cheating would be absurd. Staff can
          grant the same exemption to anyone after a review.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-2xl">You will always be told why</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4658]">
          Every action carries a reason, and it is on your{" "}
          <Link href="/standing" className="text-[#0A5C86] underline-offset-2 hover:underline">
            overview
          </Link>
          . Where an action followed an automated flag, we say which signals fired in plain
          language.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#3c4658]">
          We do not publish the thresholds. That is the one thing we hold back, and only because a
          published threshold is a manual for staying just under it.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-2xl">This page survives a ban</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4658]">
          A ban removes access to Aurora. It does not remove access to this site. You can always
          sign in here to see what happened and contest it — which is why standing lives on its own
          address.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-2xl">Two ways to appeal</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4658]">
          The form on this site is private and always open. A moderator reads it and records a
          decision with their reasoning.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#3c4658]">
          You can also post publicly in our appeals forum, where volunteers read cases and flag
          genuine ones for a moderator. That is usually faster. It is entirely optional, it does not
          change your place in the queue, and you can delete the public post at any time with no
          effect on the appeal itself.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#3c4658]">
          Some actions cannot be appealed: bans shorter than three days end before a review
          realistically would, and appeals close after three unsuccessful attempts on the same
          action. Both are stated on your overview rather than left for you to discover.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-2xl">What we look at</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#3c4658]">
          <li>
            <strong>Your games</strong> — move quality compared against your own history, not
            against an absolute bar. What counts as unusual at 1200 is ordinary at 2200.
          </li>
          <li>
            <strong>Timing</strong> — how long you spend on each move. Humans think longer in
            complex positions; a machine tends not to.
          </li>
          <li>
            <strong>Reports</strong> from other players, which are read but never acted on alone.
            Most reports filed immediately after a loss are about losing.
          </li>
        </ul>
      </section>

      <p className="mt-12 text-center text-sm">
        <Link href="/standing/appeal" className="text-[#0A5C86] underline-offset-2 hover:underline">
          Appeal an action
        </Link>
      </p>
    </div>
  );
}

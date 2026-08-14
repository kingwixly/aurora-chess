import type { Metadata } from "next";
import Link from "next/link";
import { AuroraBand } from "@aurora/ui";

export const metadata: Metadata = {
  title: "Fair play",
  description: "How moderation and cheat detection work on Aurora Chess.",
};

/**
 * The fair play page.
 *
 * Public and deliberately specific. The most common complaint about large chess
 * sites is being banned with no explanation and no meaningful appeal; saying
 * plainly what we do and do not do is most of what makes a small site feel
 * fair, and it costs nothing.
 */
export default function FairPlayPage() {
  return (
    <main className="min-h-screen bg-night-950">
      <AuroraBand />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-4xl tracking-tight">Fair play</h1>
        <p className="mt-2 text-night-400">
          How moderation works here, in full. If anything below turns out not to be true, that is a
          bug and we want to hear about it.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-2xl">No ban is automatic</h2>
          <p className="text-night-300">
            Software flags games it finds unusual. It cannot ban anyone. Every action on every
            account is issued by a person who looked at the games first.
          </p>
          <p className="text-night-300">
            This is a deliberate choice with a cost: it is slower, and we will miss some cheating.
            We think that is the right trade. Accuracy statistics cannot tell a cheat from a strong
            player having a good game, and a system that bans on them will ban people who are simply
            improving.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-2xl">Titled players are not flagged for playing well</h2>
          <p className="text-night-300">
            Verified federation titles are exempt from automated review. Engine-like accuracy is
            what a title certifies; treating it as evidence of cheating would be absurd. Staff can
            grant the same exemption to anyone after review.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-2xl">You will always be told why</h2>
          <p className="text-night-300">
            Every action carries a reason, and you can read it on your{" "}
            <Link href="/standing" className="text-aurora-cyan hover:underline">
              standing page
            </Link>
            . Where an action followed an automated flag, we tell you which signals fired in plain
            language.
          </p>
          <p className="text-night-300">
            We do not publish the thresholds. That is the one thing we hold back, and only because a
            published threshold is a manual for staying under it.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-2xl">Your standing is always reachable</h2>
          <p className="text-night-300">
            A ban removes access to the site. It does not remove access to your standing page or to
            appealing — you can always sign in to see what happened and contest it.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-2xl">Appeals</h2>
          <p className="text-night-300">
            Submit one from your standing page. It is private, and a moderator records a decision
            with their reasoning.
          </p>
          <p className="text-night-300">
            You can also post publicly in our appeals forum, where volunteers read cases and flag
            genuine ones for a moderator. That is usually faster. It is entirely optional, does not
            change your place in the queue, and you can delete the public post at any time with no
            effect on your appeal.
          </p>
          <p className="text-night-300">
            Some actions cannot be appealed: bans shorter than three days end before a review would,
            and appeals close after three unsuccessful attempts on the same action. Both are stated
            on your standing page rather than left for you to discover.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-2xl">Records expire</h2>
          <p className="text-night-300">
            An action that ends becomes a strike. Strikes stop counting toward further action, and
            stop pausing automatic titles, after twelve months. Staff can still see them, but they
            stop having effects. A mistake should not follow you forever.
          </p>
          <p className="text-night-300">
            An appeal that succeeds removes the effects immediately. The record shows that something
            was raised and withdrawn, which is the honest version.
          </p>
        </section>

        <p className="mt-12 text-center text-sm text-night-500">
          <Link href="/standing" className="text-aurora-cyan hover:underline">
            Your standing
          </Link>
        </p>
      </div>
    </main>
  );
}

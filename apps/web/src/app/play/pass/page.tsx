import { redirect } from "next/navigation";

/**
 * Pass and play was a duplicate.
 *
 * It did the same job as `/play/otb` - two people, one device, one board - but
 * without a clock, which made it strictly worse than the mode it copied. The
 * only real bug in `otb` was that "no clock" set 999 minutes instead of
 * removing the timer.
 *
 * Kept as a redirect rather than deleted outright so anyone who bookmarked it
 * lands somewhere sensible.
 */
export default function PassAndPlayRedirect() {
  redirect("/play/otb");
}

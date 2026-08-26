/**
 * Authorised alternate accounts.
 *
 * A second account is normally the clearest signal of ban evasion there is, so
 * this is not a feature anyone gets by default. Staff grant it per user, and
 * the link between the accounts is recorded rather than hidden — an authorised
 * alt should be MORE visible to moderation than an unauthorised one, not less.
 *
 * The legitimate uses are narrow and real: a titled player who streams and
 * wants an account that is not instantly recognised, someone testing bots
 * without polluting their rating, a coach demonstrating without their title
 * showing.
 */

export const MAX_ALTS = 3;

export interface AltEligibility {
  allowed: boolean;
  reason?: "not-enabled" | "not-titled" | "at-limit" | "is-an-alt";
}

/**
 * May this account create another alt?
 *
 * Four gates, and each exists for its own reason:
 *
 * - staff must have granted it, because self-service alts are ban evasion
 * - the account must be titled, which is the population this is meant for and
 *   is externally verifiable
 * - a cap, because "a second identity" and "an account farm" differ by degree
 * - an alt cannot spawn alts, or the tree becomes impossible to reason about
 */
export function canCreateAlt(opts: {
  altsEnabled: boolean;
  title?: string | null;
  isAlt: boolean;
  currentAltCount: number;
}): AltEligibility {
  if (opts.isAlt) return { allowed: false, reason: "is-an-alt" };
  if (!opts.altsEnabled) return { allowed: false, reason: "not-enabled" };
  if (!opts.title) return { allowed: false, reason: "not-titled" };
  if (opts.currentAltCount >= MAX_ALTS) return { allowed: false, reason: "at-limit" };
  return { allowed: true };
}

/** Why the option is unavailable, in words a player can act on. */
export function altDenialText(reason: AltEligibility["reason"]): string {
  switch (reason) {
    case "is-an-alt":
      return "This is already an alternate account. Alts are created from your main account.";
    case "not-enabled":
      return "Alternate accounts are enabled by staff. Open a support ticket if you need one.";
    case "not-titled":
      return "Alternate accounts are available to titled players.";
    case "at-limit":
      return `You already have ${MAX_ALTS} alternate accounts, which is the limit.`;
    default:
      return "";
  }
}

/**
 * Settings an alt keeps separate from its owner.
 *
 * Everything else — punishments, standing, the moderation record — is shared
 * deliberately. An alt is a different name, not a fresh start, and a ban on
 * one applies to all of them. Making that explicit here means nobody has to
 * infer it from behaviour.
 */
export const ALT_INDEPENDENT_SETTINGS = [
  "displayTitle",
  "displayFideInfo",
  "displayCountry",
  "displayFlair",
  "bio",
  "avatarUrl",
] as const;

export type AltIndependentSetting = (typeof ALT_INDEPENDENT_SETTINGS)[number];

/** Whether a given setting is per-account or inherited from the owner. */
export function isPerAccount(setting: string): boolean {
  return (ALT_INDEPENDENT_SETTINGS as readonly string[]).includes(setting);
}

/**
 * Whether a punishment on one account applies to another.
 *
 * Always true within an alt family. The alternative — punishing one name while
 * the others keep playing — turns an authorised alt into exactly the evasion
 * tool the authorisation was meant to prevent.
 */
export function punishmentApplies(opts: {
  punishedUserId: string;
  targetUserId: string;
  targetAltOf: string | null;
  punishedAltOf: string | null;
}): boolean {
  const familyOf = (id: string, altOf: string | null) => altOf ?? id;
  return (
    familyOf(opts.punishedUserId, opts.punishedAltOf) ===
    familyOf(opts.targetUserId, opts.targetAltOf)
  );
}

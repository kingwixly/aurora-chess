/**
 * The punishment ladder.
 *
 * Every rule about what an action blocks, when it becomes history, and whether
 * it can be contested lives here rather than being scattered across routes.
 * Moderation rules that are implemented in five places drift into five slightly
 * different rules.
 */

export type PunishmentType = "WARNING" | "RESTRICTION" | "SUSPENSION" | "DEACTIVATION" | "BAN";

/** What a signed-in session is allowed to do. */
export interface Capabilities {
  /** Rated and casual games against other people. */
  playPublic: boolean;
  /** Games against friends. */
  playFriends: boolean;
  playBots: boolean;
  puzzles: boolean;
  chat: boolean;
  /** Profiles, forums, history — anything read-only. */
  browse: boolean;
  /** The standing pages. Never removed by a punishment. */
  standing: true;
}

const FULL: Capabilities = {
  playPublic: true,
  playFriends: true,
  playBots: true,
  puzzles: true,
  chat: true,
  browse: true,
  standing: true,
};

/**
 * What each punishment removes.
 *
 * Bots are deliberately left alone by restrictions and suspensions: someone
 * serving a suspension for chat abuse can still practise, which keeps the
 * punishment about the offence rather than about withholding chess.
 */
const REMOVES: Record<PunishmentType, Partial<Capabilities>> = {
  WARNING: {},
  RESTRICTION: { playPublic: false },
  SUSPENSION: { playPublic: false, playFriends: false },
  DEACTIVATION: {
    playPublic: false,
    playFriends: false,
    playBots: false,
    puzzles: false,
    chat: false,
  },
  BAN: {
    playPublic: false,
    playFriends: false,
    playBots: false,
    puzzles: false,
    chat: false,
    browse: false,
  },
};

export interface PunishmentRecord {
  id: string;
  type: PunishmentType;
  reason: string;
  expiresAt?: Date | string | null;
  liftedAt?: Date | string | null;
  overturnedAt?: Date | string | null;
  becameStrikeAt?: Date | string | null;
  appealsDisabled?: boolean;
  createdAt: Date | string;
}

const asDate = (v: Date | string | null | undefined): Date | null =>
  v == null ? null : v instanceof Date ? v : new Date(v);

/** Currently constraining: not lifted, not overturned, not expired. */
export function isActive(p: PunishmentRecord, now = new Date()): boolean {
  if (p.liftedAt || p.overturnedAt) return false;
  const expires = asDate(p.expiresAt ?? null);
  return expires === null || expires > now;
}

/**
 * What this account may do right now.
 *
 * Capabilities are removed, never granted, so overlapping punishments combine
 * to the most restrictive rather than the most recent — otherwise a warning
 * issued after a suspension would quietly unsuspend someone.
 */
export function capabilitiesFor(
  punishments: readonly PunishmentRecord[],
  now = new Date()
): Capabilities {
  const caps: Capabilities = { ...FULL };
  for (const p of punishments) {
    if (!isActive(p, now)) continue;
    for (const [k, v] of Object.entries(REMOVES[p.type])) {
      // Only ever removes. Overlapping punishments therefore combine to the
      // most restrictive rather than the most recent.
      if (v === false) (caps as unknown as Record<string, boolean>)[k] = false;
    }
  }
  return caps;
}

/** How long a strike counts toward escalation and the automatic title block. */
export const STRIKE_WINDOW_MONTHS = 12;

function withinStrikeWindow(p: PunishmentRecord, now: Date): boolean {
  const since = asDate(p.becameStrikeAt ?? null) ?? asDate(p.expiresAt ?? null);
  if (!since) return false;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STRIKE_WINDOW_MONTHS);
  return since > cutoff;
}

/**
 * Strikes that still count.
 *
 * Records remain visible to staff forever; only their weight expires. A mistake
 * at fourteen should not still be deciding things at twenty.
 *
 * Overturned punishments never count — a successful appeal means it should not
 * have happened, so it must not keep having effects.
 */
export function countingStrikes(
  punishments: readonly PunishmentRecord[],
  now = new Date()
): PunishmentRecord[] {
  return punishments.filter((p) => {
    if (p.overturnedAt) return false;
    // A ban is a ban forever, but it is not a strike — it never converts.
    if (p.type === "BAN") return false;
    if (isActive(p, now)) return true;
    return withinStrikeWindow(p, now);
  });
}

/**
 * Whether automatic titles are blocked.
 *
 * Any counting strike blocks them. Manual titles are unaffected — those are
 * staff discretion, and a GM does not stop being a GM over a warning.
 */
export function blocksAutomaticTitles(
  punishments: readonly PunishmentRecord[],
  now = new Date()
): boolean {
  return countingStrikes(punishments, now).length > 0;
}

/** When the block lifts, so the standing page can say so. */
export function titleBlockExpiresAt(
  punishments: readonly PunishmentRecord[],
  now = new Date()
): Date | null {
  const strikes = countingStrikes(punishments, now);
  if (strikes.length === 0) return null;

  let latest: Date | null = null;
  for (const p of strikes) {
    // An active punishment has no expiry yet in this sense; it blocks until it
    // ends and then for the strike window after that.
    const base = asDate(p.becameStrikeAt ?? null) ?? asDate(p.expiresAt ?? null) ?? null;
    if (!base) return null; // Permanent and active: no known end.
    const end = new Date(base);
    end.setMonth(end.getMonth() + STRIKE_WINDOW_MONTHS);
    if (!latest || end > latest) latest = end;
  }
  return latest;
}

/** Escalation thresholds, surfaced to staff rather than acted on automatically. */
export const ESCALATION_REVIEW = 3;
export const ESCALATION_SUSPEND = 5;

export type AppealBlockReason =
  | "no-record"
  | "too-short"
  | "appeals-disabled"
  | "already-open"
  | "three-denials"
  | "appeal-banned";

export interface AppealEligibility {
  allowed: boolean;
  reason?: AppealBlockReason;
}

/** Bans shorter than this cannot be appealed — they expire before review would. */
export const MIN_APPEALABLE_BAN_HOURS = 72;

/**
 * Whether this punishment can be contested.
 *
 * Expired records are appealable. A warning from a year ago still counts toward
 * escalation and still blocks automatic titles, so removing it is a real stake
 * rather than a formality.
 */
export function canAppeal(
  p: PunishmentRecord,
  opts: {
    appealBanned?: boolean;
    openAppealExists?: boolean;
    consecutiveDenials?: number;
  } = {}
): AppealEligibility {
  if (opts.appealBanned) return { allowed: false, reason: "appeal-banned" };
  if (p.appealsDisabled) return { allowed: false, reason: "appeals-disabled" };
  if (opts.openAppealExists) return { allowed: false, reason: "already-open" };
  if ((opts.consecutiveDenials ?? 0) >= 3) {
    return { allowed: false, reason: "three-denials" };
  }

  if (p.type === "BAN") {
    const expires = asDate(p.expiresAt ?? null);
    if (expires) {
      const hours = (expires.getTime() - asDate(p.createdAt)!.getTime()) / 3_600_000;
      // A two-day ban would expire before an appeal could realistically be read.
      if (hours < MIN_APPEALABLE_BAN_HOURS) {
        return { allowed: false, reason: "too-short" };
      }
    }
  }

  return { allowed: true };
}

/** Plain-language description of what an action does, for the standing page. */
export const PUNISHMENT_EFFECTS: Record<PunishmentType, string> = {
  WARNING: "A note on your record. Nothing is restricted.",
  RESTRICTION: "You cannot use public matchmaking. Friends, bots and puzzles are unaffected.",
  SUSPENSION: "You cannot play against other people. Bots and puzzles are unaffected.",
  DEACTIVATION:
    "You can browse the site and your own profile, but cannot play, solve puzzles or chat.",
  BAN: "Your access to Aurora has been withdrawn. You can still view this page and appeal.",
};

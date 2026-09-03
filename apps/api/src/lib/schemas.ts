import { z } from "zod";
import type { TimeControl } from "@aurora/chess";

const TIME_CONTROLS: [TimeControl, ...TimeControl[]] = [
  "BULLET",
  "BLITZ",
  "RAPID",
  "CLASSICAL",
  "UNLIMITED",
];
const timeControlEnum = z.enum(TIME_CONTROLS);

// ── Common ─────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ── Auth ───────────────────────────────────────────────

export const registerBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Optional: the gate is a site setting now, checked in the route.
  inviteCode: z.string().min(1).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const preferencesBodySchema = z.object({
  darkMode: z.boolean().optional(),
  boardTheme: z.string().optional(),
  pieceSet: z.string().optional(),
  soundEnabled: z.boolean().optional(),
});

// ── Users ──────────────────────────────────────────────

export const userSearchQuerySchema = z.object({
  q: z.string().min(1).optional(),
});

export const usernameParamSchema = z.object({
  username: z.string().min(1),
});

export const userProfileQuerySchema = z.object({
  vsUserId: z.string().optional(),
});

// ── Games ──────────────────────────────────────────────

export const createFriendGameBodySchema = z.object({
  friendId: z.string().min(1),
  preset: z.string().optional(),
  initialTime: z.number().optional(),
  increment: z.number().optional(),
});

export const gameActionBodySchema = z.object({
  gameId: z.string().min(1),
});

export const createBotGameBodySchema = z.object({
  variant: z
    .enum([
      "STANDARD",
      "CHESS960",
      "ATOMIC",
      "CRAZYHOUSE",
      "KINGOFTHEHILL",
      "THREECHECK",
      "ANTICHESS",
      "HORDE",
    ])
    .optional(),
  /** Specific Chess960 position, or omitted for a random one. */
  positionId: z.number().int().min(0).max(959).optional(),
  botElo: z.number().int().min(200).max(3200),
  color: z.enum(["white", "black", "random"]),
  preset: z.string().optional(),
  initialTime: z.number().optional(),
  increment: z.number().optional(),
});

export const makeMoveBodySchema = z.object({
  from: z.string().min(2).max(2),
  to: z.string().min(2).max(2),
  promotion: z.string().max(1).optional(),
});

export const syncOfflineGameBodySchema = z.object({
  offlineId: z.string().optional(),
  botElo: z.number().int().min(200).max(3200),
  playerIsWhite: z.boolean(),
  moves: z
    .array(
      z.object({
        ply: z.number().int(),
        san: z.string(),
        uci: z.string(),
        fen: z.string(),
      })
    )
    .min(1, "No moves to sync"),
  result: z.string().nullable(),
  termination: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  timeControl: timeControlEnum.optional(),
  initialTime: z.number().optional(),
  increment: z.number().optional(),
});

// ── Friends ────────────────────────────────────────────

export const sendFriendRequestBodySchema = z.object({
  username: z.string().min(1),
});

export const friendActionBodySchema = z.object({
  friendshipId: z.string().min(1),
});

export const friendshipIdParamSchema = z.object({
  friendshipId: z.string().min(1),
});

// ── Admin ──────────────────────────────────────────────

export const adminUsersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
});

export const adminUpdateUserBodySchema = z.object({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
  role: z.string().optional(),
  /**
   * Manual rating correction.
   *
   * Bounded to the plausible range: an unbounded field invites a typo that
   * silently awards a title, since automatic titles key off peak rating.
   */
  rating: z.number().int().min(400).max(3500).optional(),
  /**
   * Reason for a rating change, recorded in the audit log. Required by the
   * route rather than by this schema, so the other fields stay optional.
   */
  ratingReason: z.string().max(300).optional(),
});

export const adminCreateUserBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().optional(),
  verified: z.boolean().optional(),
});

export const adminGamesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export const adminUpdateSettingsBodySchema = z.object({
  siteName: z.string().optional(),
  registrationOpen: z.boolean().optional(),
  maxUsers: z.number().optional(),
  requireEmailVerification: z.boolean().optional(),
});

export const adminAuditLogQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  action: z.string().optional(),
  adminId: z.string().optional(),
});

// ── Collections ────────────────────────────────────────

export const createCollectionBodySchema = z.object({
  name: z.string().min(1).max(50),
});

export const addGameToCollectionBodySchema = z.object({
  gameId: z.string().min(1),
});

export const collectionGameParamsSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
});

// ── Notes ──────────────────────────────────────────────

export const updateNoteBodySchema = z.object({
  text: z.string().max(2000).optional(),
});

// ── Invites ────────────────────────────────────────────

export const validateInviteParamSchema = z.object({
  code: z.string().min(1),
});

// ── Bots (Admin) ──────────────────────────────────────

const botTierEnum = z.enum(["custom", "hybrid", "engine"]);
const botCategoryEnum = z.enum([
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "expert",
  "master",
  "grandmaster",
]);

export const createBotBodySchema = z.object({
  botId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(50),
  elo: z.number().int().min(100).max(3200),
  description: z.string().min(1).max(500),
  avatar: z.string().min(1).max(10),
  tier: botTierEnum,
  category: botCategoryEnum,
  enabled: z.boolean().optional(),
  randomMoveChance: z.number().min(0).max(1).optional(),
  blunderChance: z.number().min(0).max(1).optional(),
  captureGreed: z.number().min(0).max(1).optional(),
  aggressionBias: z.number().min(-1).max(1).optional(),
  maxDepth: z.number().int().min(1).max(18).optional(),
  queenEarly: z.boolean().optional(),
  pawnPusher: z.boolean().optional(),
  messages: z.record(z.string(), z.array(z.string())).optional(),
  preferredOpenings: z
    .object({
      asWhite: z.array(z.string()).optional(),
      asBlack: z.array(z.string()).optional(),
    })
    .optional(),
});

export const updateBotBodySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  elo: z.number().int().min(100).max(3200).optional(),
  description: z.string().min(1).max(500).optional(),
  avatar: z.string().min(1).max(10).optional(),
  tier: botTierEnum.optional(),
  category: botCategoryEnum.optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  randomMoveChance: z.number().min(0).max(1).optional(),
  blunderChance: z.number().min(0).max(1).optional(),
  captureGreed: z.number().min(0).max(1).optional(),
  aggressionBias: z.number().min(-1).max(1).optional(),
  maxDepth: z.number().int().min(1).max(18).optional(),
  queenEarly: z.boolean().optional(),
  pawnPusher: z.boolean().optional(),
  messages: z.record(z.string(), z.array(z.string())).optional(),
  preferredOpenings: z
    .object({
      asWhite: z.array(z.string()).optional(),
      asBlack: z.array(z.string()).optional(),
    })
    .optional(),
});

// ── Titles ────────────────────────────────────────────────

export const manualTitleEnum = z.enum([
  "GM",
  "WGM",
  "IM",
  "WIM",
  "FM",
  "WFM",
  "CM",
  "WCM",
  "NM",
  "WNM",
]);

export const autoTitleEnum = z.enum(["AM", "UM"]);

/**
 * Admin title mutation.
 *
 * Every field is optional and independently addressable. `null` is meaningful
 * and distinct from omission: `titleManual: null` clears the manual title,
 * whereas omitting it leaves it untouched.
 */
export const adminUpdateTitleBodySchema = z
  .object({
    /** Set or clear the staff-assigned title. */
    titleManual: manualTitleEnum.nullable().optional(),
    /**
     * Override the derived title by hand. Setting this locks the user out of
     * automatic recomputation until `titleAutoLocked` is set back to false.
     */
    titleAuto: autoTitleEnum.nullable().optional(),
    /**
     * Hand the user back to the automatic system. When set to false the auto
     * title is immediately recomputed from their peak rating.
     */
    titleAutoLocked: z.boolean().optional(),
    /** Suppress all title display without destroying underlying state. */
    titleBanned: z.boolean().optional(),
    titleBanReason: z.string().max(500).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

// ── FIDE ──────────────────────────────────────────────────

export const fidePanelTitleEnum = z.enum([
  "AGM",
  "AIM",
  "AFM",
  "ACM",
  "IA",
  "FA",
  "NA",
  "FST",
  "FT",
  "FI",
  "NI",
  "DI",
]);

/**
 * Admin update of a player's FIDE details.
 *
 * Every field optional and independently addressable; `null` clears rather than
 * being ignored. The profile URL is validated against FIDE's own domain in the
 * route — it is staff-entered and rendered as an outbound link on a public
 * page, so it is an obvious place for a bad URL to end up.
 */
export const adminUpdateFideBodySchema = z
  .object({
    /** Site verification complete and a FIDE account confirmed. */
    fideVerified: z.boolean().optional(),
    fideId: z.string().max(20).nullable().optional(),
    /** Show the panel on the player's profile. */
    enabled: z.boolean().optional(),
    standard: z.number().int().min(0).max(3500).nullable().optional(),
    rapid: z.number().int().min(0).max(3500).nullable().optional(),
    blitz: z.number().int().min(0).max(3500).nullable().optional(),
    arenaTitles: z.array(fidePanelTitleEnum).max(12).optional(),
    profileUrl: z.string().url().max(300).nullable().optional(),
    federation: z.string().max(3).nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "At least one field must be provided",
  });

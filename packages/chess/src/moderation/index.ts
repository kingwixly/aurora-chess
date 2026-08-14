export type {
  PunishmentType,
  Capabilities,
  PunishmentRecord,
  AppealEligibility,
  AppealBlockReason,
} from "./punishments";
export {
  isActive,
  capabilitiesFor,
  countingStrikes,
  blocksAutomaticTitles,
  titleBlockExpiresAt,
  canAppeal,
  STRIKE_WINDOW_MONTHS,
  ESCALATION_REVIEW,
  ESCALATION_SUSPEND,
  MIN_APPEALABLE_BAN_HOURS,
  PUNISHMENT_EFFECTS,
} from "./punishments";

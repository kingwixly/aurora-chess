export type { UserRole, FriendshipStatus, Player, ClockState } from "./types";
export type { ManualTitle, AutoTitle, Title, TitleState } from "./titles";
export {
  MANUAL_TITLES,
  AUTO_TITLES,
  AUTO_TITLE_THRESHOLDS,
  TITLE_LABELS,
  UNOFFICIAL_TITLES,
  isManualTitle,
  isAutoTitle,
  isUnofficialTitle,
  computeAutoTitle,
  resolveTitle,
} from "./titles";

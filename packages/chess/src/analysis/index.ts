export type { ClassifiedMove } from "./classify";
export { classifyMove, computeAccuracy } from "./classify";

export type { CoachingBand, MoveQuality, PatternFinding } from "./coaching";
export {
  bandFor,
  coachingText,
  patternAdvice,
  isPattern,
  PATTERN_MIN_OCCURRENCES,
} from "./coaching";

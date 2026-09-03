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

export type { EngineId, EngineSpec } from "./engines";
export {
  ENGINES,
  DEFAULT_ENGINE,
  enginesFor,
  availableEngines,
  engineForVariant,
  isEngineValidFor,
  resolveEngine,
} from "./engines";

export type { CoachPersona, CoachNote } from "./coachMode";
export {
  COACHES,
  COACH_MIN,
  COACH_MAX,
  COACH_DEFAULT,
  noiseFloorFor,
  depthForStrength,
  coachNote,
  clampStrength,
  bandForStrength,
} from "./coachMode";

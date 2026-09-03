export type { BackRank, CastlingSide } from "./chess960";
export {
  isValidBackRank,
  backRankForPosition,
  fenForPosition,
  castlingRookFiles,
  applyCastling,
  randomPositionId,
  STANDARD_POSITION_ID,
} from "./chess960";

export type { OddsKind, OddsDefinition, OddsReceiver } from "./odds";
export {
  ODDS,
  suggestOdds,
  fenForOdds,
  freeMovesForOdds,
  timeMultiplierForOdds,
  affectsRating,
  ODDS_SUGGESTION_THRESHOLD,
} from "./odds";

export type { Variant, VariantInfo, CheckCount, Pocket } from "./rules";
export {
  VARIANTS,
  PLAYABLE_VARIANTS,
  needsFairyEngine,
  startingFenFor,
  explosionSquares,
  applyAtomicMove,
  atomicResult,
  HILL,
  hillWinner,
  countCheck,
  threeCheckWinner,
  antichessMoves,
  antichessResult,
  hordeResult,
  addToPocket,
  dropSquares,
  pocketIsEmpty,
  EMPTY_POCKET,
} from "./rules";

/**
 * Tailwind CSS color classes for each move classification.
 */
export const CLASSIFICATION_COLORS: Record<string, string> = {
  BRILLIANT: "text-cyan-400",
  GREAT: "text-blue-400",
  BEST: "text-green-400",
  EXCELLENT: "text-green-300",
  GOOD: "text-gray-300",
  INACCURACY: "text-yellow-400",
  MISTAKE: "text-orange-400",
  BLUNDER: "text-red-400",
  FORCED: "text-gray-500",
  // Deliberately neutral rather than praise-coloured: being in book is a
  // statement about theory, not about how well you played.
  BOOK: "text-amber-300",
};

/**
 * Annotation symbols for each move classification, used in move lists.
 */
export const CLASSIFICATION_SYMBOLS: Record<string, string> = {
  BRILLIANT: "!!",
  GREAT: "!",
  BEST: "\u2605",
  EXCELLENT: "\u25CF",
  GOOD: "\u25CF",
  INACCURACY: "?!",
  MISTAKE: "?",
  BLUNDER: "??",
  FORCED: "\u25A1",
  BOOK: "\u{1F4D6}",
};

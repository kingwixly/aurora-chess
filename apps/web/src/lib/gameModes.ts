/** Configuration flags controlling which assistance tools are available during a game. */
export interface GameModeSettings {
  hints: boolean;
  evalBar: boolean;
  threats: boolean;
  suggestions: boolean;
  moveFeedback: boolean;
  takeback: boolean;
  engine: boolean;
  botChat: boolean;
  botReactions: boolean;
}

/** Union type of available game mode preset identifiers. */
export type GameModePreset = "challenge" | "friendly" | "assisted" | "custom";

/** Predefined game mode settings for challenge, friendly, and assisted presets. */
export const GAME_MODE_PRESETS: Record<Exclude<GameModePreset, "custom">, GameModeSettings> = {
  challenge: {
    hints: false,
    evalBar: false,
    threats: false,
    suggestions: false,
    moveFeedback: false,
    takeback: false,
    engine: false,
    botChat: false,
    botReactions: false,
  },
  friendly: {
    hints: true,
    evalBar: false,
    threats: false,
    suggestions: false,
    moveFeedback: false,
    takeback: true,
    engine: false,
    botChat: true,
    botReactions: true,
  },
  assisted: {
    hints: true,
    evalBar: true,
    threats: true,
    suggestions: true,
    moveFeedback: true,
    takeback: false,
    engine: true,
    botChat: true,
    botReactions: true,
  },
};

/** Display names and short descriptions for each game mode preset. */
export const GAME_MODE_LABELS: Record<GameModePreset, { name: string; desc: string }> = {
  challenge: { name: "Challenge", desc: "No help of any kind" },
  friendly: { name: "Friendly", desc: "Hints and takebacks allowed" },
  assisted: { name: "Assisted", desc: "All tools available" },
  custom: { name: "Custom", desc: "Choose your tools" },
};

/** Default settings used when the "custom" game mode is first selected. */
export const DEFAULT_CUSTOM: GameModeSettings = {
  hints: true,
  evalBar: true,
  threats: false,
  suggestions: false,
  moveFeedback: true,
  takeback: false,
  engine: false,
  botChat: true,
  botReactions: true,
};

import { create } from "zustand";
import api from "../lib/api";
import { useToast } from "@aurora/ui";

export type BoardTheme = "classic" | "wood" | "green" | "blue" | "purple" | "dark";
/**
 * Installed piece sets.
 *
 * `fontaine` is Chessground's built-in default. The rest are real image sets
 * under /piece-sets/<key>/, named `wK.png`, `bQ.png` and so on — the same
 * naming Chessground's own role classes map to.
 */
export type PieceSet = "fontaine" | "sleek" | "fae" | "fatty";

/**
 * How captured material is shown.
 *
 * - `board`  - the over-the-board convention: every captured piece laid out
 *              beside the player who took it.
 * - `compact` - the online convention: only the material *difference*, as the
 *              surplus pieces plus a number, e.g. a knight and +2.
 */
export type MaterialStyle = "board" | "compact";

/** Shape of the settings Zustand store, including UI preferences and their setters. */
interface SettingsState {
  darkMode: boolean;
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  materialStyle: MaterialStyle;
  /** In-game chat. Off by default — most of it is tilt. */
  gameChatEnabled: boolean;
  soundEnabled: boolean;
  setDarkMode: (dark: boolean) => void;
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSet: (set: PieceSet) => void;
  setMaterialStyle: (style: MaterialStyle) => void;
  setGameChatEnabled: (on: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  loadFromUser: (prefs: {
    darkMode: boolean;
    boardTheme: string;
    pieceSet: string;
    soundEnabled?: boolean;
  }) => void;
}

async function savePreference(data: Record<string, unknown>) {
  try {
    await api.put("/api/v1/auth/preferences", data);
    useToast.getState().show("Settings saved", "success");
  } catch {
    // Silently fail — will sync next login
  }
}

/**
 * Zustand store for user UI preferences (dark mode, board theme, piece set, sound).
 * Each setter persists the change to the server via the preferences API.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  darkMode: true,
  boardTheme: "classic",
  pieceSet: "fontaine",
  soundEnabled: true,
  gameChatEnabled: ((): boolean => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("aurora-game-chat") === "on";
  })(),

  materialStyle: ((): MaterialStyle => {
    if (typeof window === "undefined") return "compact";
    const stored = window.localStorage.getItem("aurora-material-style");
    return stored === "board" ? "board" : "compact";
  })(),

  setDarkMode: (dark) => {
    set({ darkMode: dark });
    savePreference({ darkMode: dark });
  },

  setBoardTheme: (theme) => {
    set({ boardTheme: theme });
    savePreference({ boardTheme: theme });
  },

  setGameChatEnabled: (gameChatEnabled) => {
    set({ gameChatEnabled });
    try {
      localStorage.setItem("aurora-game-chat", gameChatEnabled ? "on" : "off");
    } catch {
      // Private browsing; the default applies for this session.
    }
  },

  setMaterialStyle: (materialStyle) => {
    set({ materialStyle });
    // Local-only: the server has no column for it, and it is a display
    // preference rather than account state.
    try {
      localStorage.setItem("aurora-material-style", materialStyle);
    } catch {
      // Private browsing; the default applies for this session.
    }
  },

  setPieceSet: (pieceSet) => {
    set({ pieceSet });
    savePreference({ pieceSet });
  },

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    savePreference({ soundEnabled });
  },

  loadFromUser: (prefs) => {
    set({
      darkMode: prefs.darkMode,
      boardTheme: prefs.boardTheme as BoardTheme,
      // Retired keys — "classic"/"modern"/"minimal" from the CSS-filter era,
      // "vista" and "minimalistic" from later passes — fall back rather than
      // resolving to a directory that no longer exists.
      pieceSet: (["sleek", "fae", "fatty"].includes(prefs.pieceSet)
        ? prefs.pieceSet
        : "fontaine") as PieceSet,
      soundEnabled: prefs.soundEnabled ?? true,
    });
  },
}));

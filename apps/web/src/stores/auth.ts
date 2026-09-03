import { create } from "zustand";
import api, { setAccessToken } from "../lib/api";
import { useSettingsStore } from "./settings";

interface User {
  id: string;
  /**
   * Present only on your own account. Never rendered in the UI -- exposing it
   * would leak PII from anyone screen-sharing or streaming.
   */
  email: string;
  username: string;
  rating: number;
  /** Resolved server-side: ban, then manual, then automatic. */
  title?: import("@aurora/chess").Title | null;
  modShield?: boolean;
  /** FIDE details verified - rendered before the shield and title. */
  fideVerified?: boolean;
  staffRank?: string | null;
  /** ISO 3166-1 alpha-2. Renders a flag beside the name. */
  countryCode?: string | null;
  bio?: string | null;
  activeFlair?: string | null;
  /** Per-time-control ratings. Absent on older sessions until /me is refetched. */
  ratings?: {
    timeControl: "BULLET" | "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED";
    rating: number;
    peak: number;
    games: number;
  }[];
  role?: string;
  tosAccepted?: boolean;
  avatarUrl?: string | null;
  darkMode?: boolean;
  boardTheme?: string;
  pieceSet?: string;
  soundEnabled?: boolean;
}

/** Shape of the authentication Zustand store, including user state and auth actions. */
interface AuthState {
  /** Set when the session check failed for a reason other than being logged out. */
  sessionError: string | null;
  /**
   * Whether the session has been resolved once already.
   *
   * Kept in store state rather than a module variable so it resets with the
   * store - which matters for tests, and means a state reset cannot leave a
   * stale "already checked" behind.
   */
  sessionChecked: boolean;
  user: User | null;
  isLoading: boolean;
  register: (
    email: string,
    username: string,
    password: string,
    inviteCode?: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<{ banned?: unknown } | void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

function syncSettings(user: User) {
  if (user.darkMode !== undefined && user.boardTheme && user.pieceSet) {
    useSettingsStore.getState().loadFromUser({
      darkMode: user.darkMode,
      soundEnabled: user.soundEnabled,
      boardTheme: user.boardTheme,
      pieceSet: user.pieceSet,
    });
  }
}

// Prevent concurrent fetchMe calls
let fetchMePromise: Promise<void> | null = null;

/**
 * Zustand store managing authentication state: current user, login, logout,
 * registration, token refresh, and profile fetching. Syncs user preferences
 * to the settings store on login.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  sessionError: null,
  sessionChecked: false,

  register: async (email, username, password, inviteCode) => {
    const { data } = await api.post("/api/v1/auth/register", {
      email,
      username,
      password,
      inviteCode,
    });
    setAccessToken(data.accessToken);
    set({ user: data.user });
  },

  login: async (email, password) => {
    const { data } = await api.post("/api/v1/auth/login", { email, password });
    // A banned account signs in successfully - that is what lets them appeal.
    // The flag tells the UI to send them to their standing page instead of a
    // dashboard where every button would silently fail.
    setAccessToken(data.accessToken);
    set({ user: data.user, isLoading: false, sessionChecked: true });
    syncSettings(data.user);
    return { banned: data.banned ?? null };
  },

  logout: async () => {
    // Clear local state even if the server call fails. A network error must not
    // leave someone apparently logged in on a machine they are walking away
    // from, and the refresh cookie is httpOnly so the server call is what
    // actually revokes it -- but local state is what the UI trusts.
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // Intentionally ignored: log out locally regardless.
    }
    setAccessToken(null);
    set({ user: null, isLoading: false, sessionChecked: true });
  },

  refresh: async () => {
    try {
      const { data } = await api.post("/api/v1/auth/refresh");
      setAccessToken(data.accessToken);
    } catch {
      setAccessToken(null);
      set({ user: null });
    }
  },

  fetchMe: async () => {
    // Single-flight for the lifetime of the page, not just for concurrent
    // callers. Several components call fetchMe on mount, and React re-mounts
    // them in development - each firing its own /auth/refresh. Refresh ROTATES
    // the token, so the first request invalidates the one every other request
    // is holding, and the losers all come back 401 "token already used". The
    // result was a dozen refreshes and a session that appeared to fail.
    if (fetchMePromise) {
      return fetchMePromise;
    }
    if (get().sessionChecked) {
      return;
    }

    fetchMePromise = (async () => {
      try {
        const refreshRes = await api.post("/api/v1/auth/refresh");
        setAccessToken(refreshRes.data.accessToken);

        const { data } = await api.get("/api/v1/auth/me");
        set({ user: data.user, isLoading: false, sessionError: null, sessionChecked: true });
        syncSettings(data.user);
      } catch (err: unknown) {
        // A 401 means "not signed in", which is normal. A 5xx means the server
        // is broken, which is NOT the same thing - silently treating it as
        // logged-out sent people to a blank page with no explanation. Surface
        // it so the UI can say what happened.
        const status = (err as { response?: { status?: number } })?.response?.status;
        const serverBroken = typeof status === "number" && status >= 500;
        setAccessToken(null);
        set({
          user: null,
          isLoading: false,
          sessionError: serverBroken ? `Session check failed (HTTP ${status})` : null,
        });
      } finally {
        fetchMePromise = null;
        set({ sessionChecked: true });
      }
    })();

    return fetchMePromise;
  },
}));

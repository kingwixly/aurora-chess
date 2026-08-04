import { create } from "zustand";
import api, { setAccessToken } from "../lib/api";
import { useSettingsStore } from "./settings";

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
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
  user: User | null;
  isLoading: boolean;
  register: (
    email: string,
    username: string,
    password: string,
    inviteCode?: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

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
    setAccessToken(data.accessToken);
    set({ user: data.user, isLoading: false });
    syncSettings(data.user);
  },

  logout: async () => {
    await api.post("/api/v1/auth/logout");
    setAccessToken(null);
    set({ user: null });
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
    // Deduplicate: if already fetching, wait for the existing promise
    if (fetchMePromise) {
      return fetchMePromise;
    }

    fetchMePromise = (async () => {
      try {
        const refreshRes = await api.post("/api/v1/auth/refresh");
        setAccessToken(refreshRes.data.accessToken);

        const { data } = await api.get("/api/v1/auth/me");
        set({ user: data.user, isLoading: false });
        syncSettings(data.user);
      } catch {
        setAccessToken(null);
        set({ user: null, isLoading: false });
      } finally {
        fetchMePromise = null;
      }
    })();

    return fetchMePromise;
  },
}));

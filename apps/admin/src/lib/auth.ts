"use client";

import { create } from "zustand";
import api, { setAccessToken } from "./api";

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  fetchMe: async () => {
    // The admin panel is a separate origin, so it starts with no access token
    // in memory even when the refresh cookie is present and valid. Refresh
    // FIRST rather than relying on a 401 to trigger it: if that request fails
    // for any reason other than a genuine 401 — a CORS problem, a network
    // blip — the retry never fires and the panel bounces you to the login page
    // of a site you are already signed in to.
    try {
      const { data } = await api.post("/api/v1/auth/refresh");
      if (data?.accessToken) setAccessToken(data.accessToken);
    } catch {
      // No valid session. The /auth/me call below will confirm it.
    }

    try {
      const { data } = await api.get("/api/v1/auth/me");
      set({ user: data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));

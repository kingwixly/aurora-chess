"use client";

import { create } from "zustand";
import api from "./api";

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
    try {
      const { data } = await api.get("/api/v1/auth/me");
      set({ user: data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));

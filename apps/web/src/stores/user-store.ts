"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UserRole = "service" | "resource" | "both";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_COOKIE_KEY = "airp_token";

interface UserState {
  token: string;
  phone: string;
  role: UserRole;
  tokenExpiresAt: number;
  setLogin: (payload: { token: string; phone: string; role?: UserRole }) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
  getValidToken: () => string;
}

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

function writeTokenCookie(token: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${TOKEN_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: "",
      phone: "",
      role: "both",
      tokenExpiresAt: 0,
      setLogin(payload) {
        const tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
        writeTokenCookie(payload.token, Math.floor(TOKEN_TTL_MS / 1000));
        set({
          token: payload.token,
          phone: payload.phone,
          role: payload.role ?? "both",
          tokenExpiresAt
        });
      },
      setRole(role) {
        set({ role });
      },
      logout() {
        clearTokenCookie();
        set({
          token: "",
          phone: "",
          role: "both",
          tokenExpiresAt: 0
        });
      },
      getValidToken() {
        const state = get();
        if (!state.token) {
          return "";
        }
        if (Date.now() >= state.tokenExpiresAt) {
          clearTokenCookie();
          set({
            token: "",
            phone: "",
            role: "both",
            tokenExpiresAt: 0
          });
          return "";
        }
        return state.token;
      }
    }),
    {
      name: "airp-user-store",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage
      ),
      partialize: (state) => ({
        token: state.token,
        phone: state.phone,
        role: state.role,
        tokenExpiresAt: state.tokenExpiresAt
      })
    }
  )
);

export type { UserRole };

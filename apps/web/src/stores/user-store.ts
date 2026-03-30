"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UserRole = "service" | "resource" | "both";
type MemberLevel = "FREE" | "PRO" | "LIFETIME";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_COOKIE_KEY = "airp_token";

interface UserStoreState {
  token: string;
  phone: string;
  avatar: string | null;
  role: UserRole;
  memberLevel: MemberLevel;
  isRealNameVerified: boolean;
  tokenExpiresAt: number;
}

interface UserStoreActions {
  setLogin: (payload: { token: string; phone: string; role?: UserRole }) => void;
  setAvatar: (avatar: string | null) => void;
  setRole: (role: UserRole) => void;
  setMemberLevel: (level: MemberLevel) => void;
  setRealNameVerified: (verified: boolean) => void;
  logout: () => void;
  getValidToken: () => string;
}

type UserStore = UserStoreState & UserStoreActions;

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

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      token: "",
      phone: "",
      avatar: null,
      role: "both",
      memberLevel: "FREE",
      isRealNameVerified: false,
      tokenExpiresAt: 0,
      setLogin(payload) {
        const tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
        writeTokenCookie(payload.token, Math.floor(TOKEN_TTL_MS / 1000));
        set({
          token: payload.token,
          phone: payload.phone,
          avatar: null,
          role: payload.role ?? "both",
          memberLevel: "FREE",
          isRealNameVerified: false,
          tokenExpiresAt
        });
      },
      setAvatar(avatar) {
        set({ avatar });
      },
      setRole(role) {
        set({ role });
      },
      setMemberLevel(memberLevel) {
        set({ memberLevel });
      },
      setRealNameVerified(verified) {
        set({ isRealNameVerified: verified });
      },
      logout() {
        clearTokenCookie();
        set({
          token: "",
          phone: "",
          avatar: null,
          role: "both",
          memberLevel: "FREE",
          isRealNameVerified: false,
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
            avatar: null,
            role: "both",
            memberLevel: "FREE",
            isRealNameVerified: false,
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
        avatar: state.avatar,
        role: state.role,
        memberLevel: state.memberLevel,
        isRealNameVerified: state.isRealNameVerified,
        tokenExpiresAt: state.tokenExpiresAt
      })
    }
  )
);

export type { UserRole, MemberLevel };

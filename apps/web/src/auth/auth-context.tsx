"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { LoginResult } from "../api/user-api";

type AuthMode = "login" | "register";

interface AuthState {
  token: string;
  loginType: LoginResult["loginType"] | "";
  phone: string;
}

interface AuthContextValue {
  auth: AuthState;
  mode: AuthMode;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  setAuthSession: (session: AuthState) => void;
  clearAuthSession: () => void;
}

const emptyAuth: AuthState = {
  token: "",
  loginType: "",
  phone: ""
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(emptyAuth);
  const [mode, setMode] = useState<AuthMode>("login");
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      mode,
      isAuthModalOpen,
      openAuthModal(nextMode = "login") {
        setMode(nextMode);
        setAuthModalOpen(true);
      },
      closeAuthModal() {
        setAuthModalOpen(false);
      },
      setAuthSession(session) {
        setAuth(session);
      },
      clearAuthSession() {
        setAuth(emptyAuth);
      }
    }),
    [auth, isAuthModalOpen, mode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

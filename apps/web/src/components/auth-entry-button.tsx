"use client";

import { useAuth } from "../auth/auth-context";

interface AuthEntryButtonProps {
  mode?: "login" | "register";
  className?: string;
  label: string;
}

export function AuthEntryButton({ mode = "login", className, label }: AuthEntryButtonProps) {
  const { openAuthModal } = useAuth();

  return (
    <button type="button" className={className} onClick={() => openAuthModal(mode)}>
      {label}
    </button>
  );
}

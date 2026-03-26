export interface AdminSessionProfile {
  adminId: number;
  username: string;
  role: "super_admin";
}

const TOKEN_KEY = "airp_admin_token";
const PROFILE_KEY = "airp_admin_profile";

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

export function getAdminToken(): string | null {
  if (!canUseWindow()) {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getAdminProfile(): AdminSessionProfile | null {
  if (!canUseWindow()) {
    return null;
  }
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminSessionProfile;
  } catch {
    return null;
  }
}

export function saveAdminSession(token: string, profile: AdminSessionProfile): void {
  if (!canUseWindow()) {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearAdminSession(): void {
  if (!canUseWindow()) {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

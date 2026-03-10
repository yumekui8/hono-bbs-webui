import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth";
import type { IdentityUser } from "../types/api";
import { getCookie, setCookie, deleteCookie } from "../utils/cookies";

interface AuthState {
  sessionId: string | null;
  userId: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  identityUser: IdentityUser | null;
  turnstileSession: string | null;
  isLoggedIn: boolean;
  signIn: (id: string, password: string) => Promise<void>;
  signUp: (id: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; bio?: string | null; email?: string | null }) => Promise<void>;
  updatePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  refreshIdentityUser: () => Promise<void>;
  setTurnstileSession: (sessionId: string) => void;
  clearTurnstileSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "auth";

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch { /* ignore */ }
  return { sessionId: null, userId: null, username: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadAuth);
  const [identityUser, setIdentityUser] = useState<IdentityUser | null>(null);
  const [turnstileSession, setTurnstileSessionState] = useState<string | null>(
    () => getCookie("ts_session"),
  );

  const saveAuth = (next: AuthState) => {
    setAuth(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setTurnstileSession = (id: string) => {
    setTurnstileSessionState(id);
    setCookie("ts_session", id, 7);
  };

  const clearTurnstileSession = () => {
    setTurnstileSessionState(null);
    deleteCookie("ts_session");
  };

  const requireTurnstile = (): string => {
    if (!turnstileSession) throw new Error("Turnstile セッションが必要です");
    return turnstileSession;
  };

  const fetchIdentityUser = async (sessionId: string) => {
    try {
      const user = await authApi.getProfile(sessionId);
      setIdentityUser(user);
    } catch {
      setIdentityUser(null);
    }
  };

  useEffect(() => {
    if (auth.sessionId) {
      fetchIdentityUser(auth.sessionId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (id: string, password: string) => {
    const ts = requireTurnstile();
    const res = await authApi.login(id, password, ts);
    saveAuth({ sessionId: res.sessionId, userId: res.userId, username: res.displayName });
    await fetchIdentityUser(res.sessionId);
  };

  const signUp = async (id: string, password: string, displayName?: string) => {
    const ts = requireTurnstile();
    await authApi.register(id, password, ts, displayName);
  };

  const logout = async () => {
    if (auth.sessionId) await authApi.logout(auth.sessionId);
    saveAuth({ sessionId: null, userId: null, username: null });
    setIdentityUser(null);
  };

  const updateProfile = async (data: { displayName?: string; bio?: string | null; email?: string | null }) => {
    if (!auth.sessionId) throw new Error("ログインが必要です");
    const ts = requireTurnstile();
    const user = await authApi.updateProfile(data, auth.sessionId, ts);
    setIdentityUser(user);
  };

  const updatePassword = async (data: { currentPassword: string; newPassword: string }) => {
    if (!auth.sessionId) throw new Error("ログインが必要です");
    const ts = requireTurnstile();
    const user = await authApi.updatePassword(data, auth.sessionId, ts);
    setIdentityUser(user);
  };

  const refreshIdentityUser = async () => {
    if (auth.sessionId) await fetchIdentityUser(auth.sessionId);
  };

  return (
    <AuthContext.Provider value={{
      ...auth,
      identityUser,
      turnstileSession,
      isLoggedIn: !!auth.sessionId,
      signIn,
      signUp,
      logout,
      updateProfile,
      updatePassword,
      refreshIdentityUser,
      setTurnstileSession,
      clearTurnstileSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

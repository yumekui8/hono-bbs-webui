import { apiClient } from "./client";
import type { IdentityUser, SignInResponse, SignUpResponse, TurnstileSession } from "../types/api";

export const authApi = {
  getTurnstileSession: (token: string) =>
    apiClient.post<TurnstileSession>("/auth/turnstile", { token }),

  login: (id: string, password: string, turnstileSession: string) =>
    apiClient.post<SignInResponse>("/auth/login", { id, password }, { turnstileSession }),

  register: (id: string, password: string, turnstileSession: string, displayName?: string) =>
    apiClient.post<SignUpResponse>("/identity/users", { id, password, ...(displayName ? { displayName } : {}) }, { turnstileSession }),

  logout: (sessionId: string) =>
    apiClient.post<void>("/auth/logout", undefined, { sessionId }),

  getProfile: (sessionId: string) =>
    apiClient.get<IdentityUser>("/profile", { sessionId }),

  updateProfile: (
    data: { displayName?: string; bio?: string | null; email?: string | null },
    sessionId: string,
    turnstileSession: string,
  ) => apiClient.put<IdentityUser>("/profile", data, { sessionId, turnstileSession }),

  updatePassword: (
    data: { currentPassword: string; newPassword: string },
    sessionId: string,
    turnstileSession: string,
  ) => apiClient.put<IdentityUser>("/profile/password", data, { sessionId, turnstileSession }),
};

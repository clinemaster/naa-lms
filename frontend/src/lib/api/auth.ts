import { jwtDecode } from "jwt-decode";
import { apiClient, setTokens, clearTokens, getAccessToken } from "./client";
import type { AuthUser, Role } from "../types";

interface TokenClaims {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  teacher_id: number | null;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const data = await apiClient.post<{ access: string; refresh: string }>(
      "/user/token/",
      { email, password },
      { auth: false }
    );
    setTokens(data.access, data.refresh);
    return decodeUser(data.access);
  },

  async register(payload: { email: string; password: string; password2: string; full_name: string }) {
    return apiClient.post("/user/register/", payload, { auth: false });
  },

  logout() {
    clearTokens();
  },

  getCurrentUser(): AuthUser | null {
    const token = getAccessToken();
    if (!token) return null;
    try {
      return decodeUser(token);
    } catch {
      return null;
    }
  },

  requestPasswordReset(email: string) {
    return apiClient.get(`/user/password-reset/${encodeURIComponent(email)}/`, { auth: false });
  },

  confirmPasswordReset(payload: { otp: string; uuidb64: string; password: string; confirm_password: string }) {
    return apiClient.post("/user/password-change/", payload, { auth: false });
  },

  changePassword(payload: { old_password: string; new_password: string }) {
    return apiClient.post("/user/change-password/", payload);
  },
};

function decodeUser(token: string): AuthUser {
  const claims = jwtDecode<TokenClaims>(token);
  return {
    id: claims.user_id,
    username: claims.username,
    email: claims.email,
    full_name: claims.full_name,
    role: claims.role,
    teacher_id: claims.teacher_id,
  };
}

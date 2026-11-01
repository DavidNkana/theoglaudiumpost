/**
 * features/auth/AuthService.js
 *
 * Authentication against Supabase Auth.
 *
 * The application has no separate application server: Supabase issues the
 * session and Row Level Security decides what that session may read or write.
 */

import { signInWithPassword, ok } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Signs a user in with email and password.
 *
 * @param {{email: string, password: string}} data - Credentials
 * @returns {Promise} - Promise resolving to { status, data: { token, refreshToken, user } }
 */
export const login = async (data) => {
  const response = await signInWithPassword({
    email: data?.email,
    password: data?.password,
  });

  // Mirror the session into the keys the UI and router guard already read.
  if (typeof window !== "undefined" && response?.data) {
    try {
      window.localStorage.setItem("auth.token", response.data.token);
      window.localStorage.setItem("auth.refresh_token", response.data.refreshToken);
      window.localStorage.setItem("auth.user", JSON.stringify(response.data.user));
    } catch (error) {
      console.error("Failed to persist session:", error);
    }
  }

  return response;
};

/**
 * Signs the current user out and clears the mirrored session keys.
 */
export const logout = async () => {
  const { supabase } = await import("@/services/supabase.js");
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("auth.token");
    window.localStorage.removeItem("auth.refresh_token");
    window.localStorage.removeItem("auth.user");
  }
  return ok(true);
};

export class AuthService extends BaseService {
  constructor() {
    super("auth");
  }
}

Object.assign(AuthService.prototype, { login, logout });

export const authService = new AuthService();
export default authService;

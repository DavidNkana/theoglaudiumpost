import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  session: null,
  profile: null,
  signInError: null,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(async () => ({
        data: { session: state.session, user: state.session?.user ?? null },
        error: state.signInError,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({
        data: { session: state.session },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: state.profile, error: null })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn((path) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        })),
      })),
    },
  })),
}));

import {
  supabase,
  ok,
  created,
  apiError,
  rethrow,
  getSession,
  getAccessToken,
  getProfile,
  isAdmin,
  signInWithPassword,
  signOut,
  publicMediaUrl,
  MEDIA_BUCKET,
} from "@/services/supabase.js";

describe("services/supabase.js", () => {
  beforeEach(() => {
    state.session = null;
    state.profile = null;
    state.signInError = null;
  });

  describe("response adapters", () => {
    it("wraps data as a successful response", () => {
      expect(ok({ a: 1 })).toEqual({ status: 200, data: { a: 1 } });
    });

    it("wraps data as a created response", () => {
      expect(created({ a: 1 })).toEqual({ status: 201, data: { a: 1 } });
    });

    it("rejects with an axios-shaped error", async () => {
      await expect(apiError("nope", 404)).rejects.toMatchObject({
        isAxiosError: true,
        response: { status: 404, data: { message: "nope" } },
      });
    });

    it("rethrows a Supabase error in the axios shape", async () => {
      await expect(rethrow({ message: "boom", status: 400 })).rejects.toMatchObject({
        response: { status: 400, data: { message: "boom" } },
      });
    });

    it("falls back to a generic message", async () => {
      await expect(rethrow({}, "fallback")).rejects.toThrow("fallback");
    });

    it("maps a row-level security failure to a forbidden response", async () => {
      await expect(
        rethrow({ message: "new row violates row-level security policy" }),
      ).rejects.toMatchObject({ response: { status: 403 } });
    });
  });

  describe("session helpers", () => {
    it("returns the current session", async () => {
      state.session = { access_token: "token" };

      await expect(getSession()).resolves.toEqual(state.session);
    });

    it("returns the access token", async () => {
      state.session = { access_token: "token" };

      await expect(getAccessToken()).resolves.toBe("token");
    });

    it("returns no access token when signed out", async () => {
      await expect(getAccessToken()).resolves.toBeNull();
    });

    it("returns the profile of the signed-in user", async () => {
      state.session = { user: { id: "u1" } };
      state.profile = { id: "u1", role: "admin" };

      await expect(getProfile()).resolves.toEqual(state.profile);
    });

    it("returns no profile when signed out", async () => {
      await expect(getProfile()).resolves.toBeNull();
    });

    it("knows when the signed-in user is an administrator", async () => {
      state.session = { user: { id: "u1" } };
      state.profile = { id: "u1", role: "admin" };

      await expect(isAdmin()).resolves.toBe(true);
    });

    it("knows when the signed-in user is not an administrator", async () => {
      state.session = { user: { id: "u1" } };
      state.profile = { id: "u1", role: "business" };

      await expect(isAdmin()).resolves.toBe(false);
    });
  });

  describe("signInWithPassword", () => {
    it("returns the token, refresh token and the user's role", async () => {
      state.session = {
        access_token: "token",
        refresh_token: "refresh",
        expires_at: 123,
        user: { id: "u1", email: "info@laudiumpost.co.za" },
      };
      state.profile = { id: "u1", full_name: "Admin", role: "admin" };

      const response = await signInWithPassword({
        email: "info@laudiumpost.co.za",
        password: "secret",
      });

      expect(response.status).toBe(200);
      expect(response.data.token).toBe("token");
      expect(response.data.refreshToken).toBe("refresh");
      expect(response.data.user.role).toEqual({ id: 1, name: "admin" });
      expect(response.data.user.name).toBe("Admin");
    });

    it("reports bad credentials as unauthorised", async () => {
      state.signInError = { status: 400, message: "Invalid login credentials" };

      await expect(
        signInWithPassword({ email: "a@b.co", password: "wrong" }),
      ).rejects.toMatchObject({
        response: { status: 401, data: { message: "Invalid email or password" } },
      });
    });
  });

  describe("signOut", () => {
    it("signs the user out", async () => {
      const response = await signOut();

      expect(response.status).toBe(200);
    });
  });

  describe("media helpers", () => {
    it("uses the public media bucket", () => {
      expect(MEDIA_BUCKET).toBe("public-media");
    });

    it("passes absolute URLs through", () => {
      expect(publicMediaUrl("https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
    });

    it("builds a public URL from a storage path", () => {
      expect(publicMediaUrl("latest/a.png")).toContain("latest/a.png");
    });

    it("returns nothing without a path", () => {
      expect(publicMediaUrl("")).toBeNull();
    });
  });

  it("exposes the Supabase client", () => {
    expect(supabase).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { callsTo } from "../../../tests/helpers/supabaseMock.js";

const state = vi.hoisted(() => ({
  tables: {},
  builders: {},
  session: null,
  user: null,
}));

vi.mock("@/services/supabase.js", async () => {
  const { buildSupabaseModule } = await import(
    "../../../tests/helpers/supabaseModuleMock.js"
  );
  return buildSupabaseModule(state);
});

import { login, logout } from "@/features/auth/AuthService.js";

describe("features/auth/AuthService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("signs a user in and mirrors the session into local storage", async () => {
    const response = await login({ email: "info@laudiumpost.co.za", password: "secret" });

    expect(response.status).toBe(200);
    expect(response.data.token).toBe("token");
    expect(window.localStorage.getItem("auth.token")).toBe("token");
    expect(window.localStorage.getItem("auth.refresh_token")).toBe("refresh");
    expect(JSON.parse(window.localStorage.getItem("auth.user")).id).toBe("user-1");
  });

  it("clears the stored session on sign out", async () => {
    await login({ email: "a@b.co", password: "secret" });

    await logout();

    expect(window.localStorage.getItem("auth.token")).toBeNull();
    expect(window.localStorage.getItem("auth.user")).toBeNull();
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

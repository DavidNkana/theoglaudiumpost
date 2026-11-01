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

import {
  getUsers,
  getUser,
  getRoles,
  createUser,
  editUser,
  removeUser,
} from "@/features/users/UsersService.js";

describe("features/users/UsersService", () => {
  beforeEach(reset);

  it("lists accounts with pagination info", async () => {
    state.tables.profiles = { data: [{ id: "u1", email: "a@b.co" }], error: null, count: 1 };

    const response = await getUsers({ size: 10 });

    expect(response.status).toBe(200);
    expect(response.data.users).toHaveLength(1);
    expect(response.data.totalPages).toBe(1);
  });

  it("searches accounts by email", async () => {
    state.tables.profiles = { data: [], error: null, count: 0 };

    await getUsers({ search: "info" });

    expect(callsTo(state.builders.profiles, "or")[0].args[0]).toContain(
      "email.ilike.%info%",
    );
  });

  it("fetches a single account", async () => {
    state.tables.profiles = { data: { id: "u1" }, error: null };

    const response = await getUser("u1");

    expect(response.data.id).toBe("u1");
  });

  it("lists the roles an account can hold", async () => {
    const response = await getRoles();

    expect(response.data.map((role) => role.name)).toEqual(["admin", "business"]);
  });

  it("creates a profile for an account", async () => {
    state.tables.profiles = { data: { id: "u1" }, error: null };

    const response = await createUser({ id: "u1", email: "a@b.co" });

    expect(response.status).toBe(201);
    expect(callsTo(state.builders.profiles, "insert")[0].args[0]).toMatchObject({
      id: "u1",
      role: "business",
    });
  });

  it("refuses to create a profile without an account id", async () => {
    await expect(createUser({ email: "a@b.co" })).rejects.toThrow(
      "An account id is required",
    );
  });

  it("updates an account", async () => {
    state.tables.profiles = { data: { id: "u1" }, error: null };

    const response = await editUser("u1", { full_name: "David" });

    expect(response.status).toBe(200);
    expect(callsTo(state.builders.profiles, "update")[0].args[0]).toEqual({
      full_name: "David",
    });
  });

  it("removes an account", async () => {
    state.tables.profiles = { data: null, error: null };

    const response = await removeUser("u1");

    expect(response.status).toBe(200);
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

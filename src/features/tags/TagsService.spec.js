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
  getTags,
  getTag,
  getTagBySlug,
  createTag,
  editTag,
  removeTag,
} from "@/features/tags/TagsService.js";

describe("features/tags/TagsService", () => {
  beforeEach(reset);

  it("lists tags", async () => {
    state.tables.tags = { data: [{ id: "t1", name: "Sport" }], error: null };

    const response = await getTags();

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
  });

  it("fetches a tag by id", async () => {
    state.tables.tags = { data: { id: "t1", name: "Sport" }, error: null };

    const response = await getTag("t1");

    expect(response.data.name).toBe("Sport");
  });

  it("fetches a tag by slug", async () => {
    state.tables.tags = { data: { id: "t1", name: "Sport" }, error: null };

    const response = await getTagBySlug("sport");

    expect(response.data.id).toBe("t1");
  });

  it("creates a tag", async () => {
    state.tables.tags = { data: { id: "t1", name: "Sport" }, error: null };

    const response = await createTag({ name: "Sport", slug: "sport" });

    expect(response.status).toBe(201);
  });

  it("updates a tag", async () => {
    state.tables.tags = { data: { id: "t1", name: "Sport" }, error: null };

    const response = await editTag("t1", { name: "Sport", slug: "sport" });

    expect(response.status).toBe(200);
  });

  it("removes a tag", async () => {
    state.tables.tags = { data: null, error: null };

    const response = await removeTag("t1");

    expect(response.status).toBe(200);
  });

  it("rejects when the query fails", async () => {
    state.tables.tags = { data: null, error: { message: "denied" } };

    await expect(getTags()).rejects.toThrow("denied");
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

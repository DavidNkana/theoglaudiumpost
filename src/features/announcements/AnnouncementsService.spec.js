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
  getAnnouncements,
  getAnnouncementCategories,
  getCategories,
  getAnnouncement,
  getAnnouncementBySlug,
  createAnnouncement,
  editAnnouncement,
  removeAnnouncement,
  createCategory,
  editCategory,
  changeCategoryStatus,
  removeCategory,
} from "@/features/announcements/AnnouncementsService.js";

describe("features/announcements/AnnouncementsService", () => {
  beforeEach(reset);

  it("lists notices with pagination info", async () => {
    state.tables.announcements = { data: [{ id: "n1" }], error: null, count: 1 };

    const response = await getAnnouncements({ size: 10 });

    expect(response.status).toBe(200);
    expect(response.data.announcements).toHaveLength(1);
    expect(response.data.totalPages).toBe(1);
  });

  it("excludes funeral notices by default", async () => {
    state.tables.announcements = { data: [], error: null, count: 0 };

    await getAnnouncements({});

    expect(callsTo(state.builders.announcements, "eq")[0].args).toEqual([
      "is_funeral",
      false,
    ]);
  });

  it("filters notices by category id", async () => {
    state.tables.announcements = { data: [], error: null, count: 0 };

    await getAnnouncements({ category: "cat-1" });

    const eqArgs = callsTo(state.builders.announcements, "eq").map((c) => c.args);
    expect(eqArgs).toContainEqual(["category_id", "cat-1"]);
  });

  it("lists categories with their notice counts", async () => {
    state.tables.notice_categories = {
      data: [{ id: "cat-1", name: "General" }],
      error: null,
    };
    state.tables.announcements = {
      data: [{ category_id: "cat-1" }],
      error: null,
    };

    const response = await getAnnouncementCategories();

    expect(response.data.categories[0].count).toBe(1);
  });

  it("exposes the categories under the name the notices store uses", async () => {
    state.tables.notice_categories = { data: [], error: null };
    state.tables.announcements = { data: [], error: null };

    const response = await getCategories();

    expect(response.status).toBe(200);
    expect(response.data.categories).toEqual([]);
  });

  it("fetches a notice by id", async () => {
    state.tables.announcements = { data: { id: "n1" }, error: null };

    const response = await getAnnouncement("n1");

    expect(response.data.id).toBe("n1");
  });

  it("fetches a notice by slug", async () => {
    state.tables.announcements = { data: { id: "n1" }, error: null };

    const response = await getAnnouncementBySlug("a-notice");

    expect(response.data.id).toBe("n1");
  });

  it("reports a missing notice as not found", async () => {
    state.tables.announcements = { data: null, error: null };

    await expect(getAnnouncementBySlug("nope")).rejects.toThrow("Notice not found");
  });

  it("creates a notice", async () => {
    state.tables.announcements = { data: { id: "n1" }, error: null };

    const response = await createAnnouncement({ title: "Notice", slug: "notice" });

    expect(response.status).toBe(201);
    const insert = callsTo(state.builders.announcements, "insert")[0];
    expect(insert.args[0]).toMatchObject({ title: "Notice", slug: "notice" });
  });

  it("updates a notice", async () => {
    state.tables.announcements = { data: { id: "n1" }, error: null };

    const response = await editAnnouncement("n1", { title: "Notice", slug: "notice" });

    expect(response.status).toBe(200);
  });

  it("removes a notice", async () => {
    state.tables.announcements = { data: null, error: null };

    const response = await removeAnnouncement("n1");

    expect(response.status).toBe(200);
  });

  it("creates a notice category", async () => {
    state.tables.notice_categories = { data: { id: "cat-1" }, error: null };

    const response = await createCategory({ name: "General", slug: "general" });

    expect(response.status).toBe(201);
  });

  it("updates a notice category", async () => {
    state.tables.notice_categories = { data: { id: "cat-1" }, error: null };

    const response = await editCategory("cat-1", { name: "General", slug: "general" });

    expect(response.status).toBe(200);
  });

  it("activates or retires a notice category", async () => {
    state.tables.notice_categories = { data: { id: "cat-1" }, error: null };

    const response = await changeCategoryStatus("cat-1", { is_active: false });

    expect(response.status).toBe(200);
    expect(callsTo(state.builders.notice_categories, "update")[0].args[0]).toEqual({
      is_active: false,
    });
  });

  it("removes a notice category", async () => {
    state.tables.notice_categories = { data: null, error: null };

    const response = await removeCategory("cat-1");

    expect(response.status).toBe(200);
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

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
  getCategories,
  getCategory,
  getCategoryBySlug,
  getCategoryArticles,
  createCategory,
  editCategory,
  removeCategory,
} from "@/features/categories/CategoriesService.js";

describe("features/categories/CategoriesService", () => {
  beforeEach(reset);

  it("lists categories", async () => {
    state.tables.categories = { data: [{ id: "c1", name: "Sport" }], error: null };

    const response = await getCategories({});

    expect(response.status).toBe(200);
    expect(response.data.categories).toHaveLength(1);
  });

  it("searches categories by name", async () => {
    state.tables.categories = { data: [], error: null };

    await getCategories({ search: "spo" });

    expect(callsTo(state.builders.categories, "or")[0].args[0]).toContain(
      "name.ilike.%spo%",
    );
  });

  it("fetches a category by id", async () => {
    state.tables.categories = { data: { id: "c1", name: "Sport" }, error: null };

    const response = await getCategory("c1");

    expect(response.data.name).toBe("Sport");
  });

  it("fetches a category by slug", async () => {
    state.tables.categories = { data: { id: "c1", name: "Sport" }, error: null };

    const response = await getCategoryBySlug("sport");

    expect(response.data.id).toBe("c1");
    expect(callsTo(state.builders.categories, "eq")[0].args).toEqual(["slug", "sport"]);
  });

  it("lists the published articles in a category", async () => {
    state.tables.categories = { data: { id: "c1" }, error: null };
    state.tables.articles = { data: [{ id: "a1" }], error: null, count: 1 };

    const response = await getCategoryArticles("sport", { page: "0", size: 10 });

    expect(response.status).toBe(200);
    expect(response.data.articles).toHaveLength(1);
    expect(response.data.totalPages).toBe(1);
  });

  it("returns an empty list for an unknown category", async () => {
    state.tables.categories = { data: null, error: null };

    const response = await getCategoryArticles("nope", { size: 10 });

    expect(response.data.articles).toEqual([]);
  });

  it("creates a category", async () => {
    state.tables.categories = { data: { id: "c1", name: "Sport" }, error: null };

    const response = await createCategory({ name: "Sport", slug: "sport" });

    expect(response.status).toBe(201);
  });

  it("updates a category", async () => {
    state.tables.categories = { data: { id: "c1", name: "Sport" }, error: null };

    const response = await editCategory("c1", { name: "Sport", slug: "sport" });

    expect(response.status).toBe(200);
  });

  it("removes a category", async () => {
    state.tables.categories = { data: null, error: null };

    const response = await removeCategory("c1");

    expect(response.status).toBe(200);
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

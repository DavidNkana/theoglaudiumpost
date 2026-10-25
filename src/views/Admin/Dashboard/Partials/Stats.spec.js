import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the data-fetching boundary. getStats is driven to resolve (200),
// resolve with a non-200 status (throw branch), and reject (catch branch).
const { getStats } = vi.hoisted(() => ({ getStats: vi.fn() }));
vi.mock("@/features/dashboard/DashboardService", () => ({ getStats }));

import Stats from "./Stats.vue";

const fullStats = {
  articles: { total_articles: 12, total_published: 9, total_draft: 3 },
  ads: { total_ads: 7 },
};

describe("Stats.vue", () => {
  let errorSpy;

  beforeEach(() => {
    getStats.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("shows the shimmer loading state (v-else, v-for index in 4) before data resolves", async () => {
    // Never-resolving promise so isLoading stays true through the render.
    getStats.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Stats);
    // onMounted -> fetchStats sets isLoading=true; let the DOM update.
    await nextTick();

    // v-else branch: 4 shimmer placeholders driven by `v-for index in 4`.
    const shimmers = wrapper.findAll(".shimmer");
    expect(shimmers).toHaveLength(4);
    expect(wrapper.findAll(".col-md-3.col-sm-6.mb-3")).toHaveLength(4);
    // The loaded cards must not be present while loading.
    expect(wrapper.find(".bi-newspaper").exists()).toBe(false);
  });

  it("renders populated stats on a successful (200) fetch (v-if branch + filled nullish values)", async () => {
    getStats.mockResolvedValue({ status: 200, data: fullStats });
    const wrapper = mount(Stats);
    await flushPromises();

    expect(getStats).toHaveBeenCalledTimes(1);

    // v-if="!isLoading" branch rendered: loaded cards present, shimmer gone.
    expect(wrapper.findAll(".shimmer")).toHaveLength(0);
    expect(wrapper.find(".bi-newspaper").exists()).toBe(true);
    expect(wrapper.find(".bi-badge-ad").exists()).toBe(true);

    const headings = wrapper.findAll("h3").map((h) => h.text());
    // Articles total / published / draft (left side of ?? operators).
    expect(wrapper.text()).toContain("Total Articles");
    expect(headings).toContain("12"); // total_articles ?? 0 -> 12
    expect(wrapper.text()).toContain("9"); // total_published ?? 0 -> 9
    expect(wrapper.text()).toContain("3"); // total_draft ?? 0 -> 3
    expect(headings).toContain("7"); // ads.total_ads ?? "-" -> 7
  });

  it("renders fallback defaults when stats payload is empty (right side of ?? operators)", async () => {
    // status 200 but empty object -> optional chaining yields undefined ->
    // nullish coalescing fallbacks (?? 0 and ?? "-") are taken.
    getStats.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mount(Stats);
    await flushPromises();

    const headings = wrapper.findAll("h3").map((h) => h.text());
    // Articles total fallback 0, ads fallback "-".
    expect(headings).toContain("0");
    expect(headings).toContain("-");
    // Published/draft spans fall back to 0 as well.
    const spans = wrapper.findAll("span.h6").map((s) => s.text());
    expect(spans).toEqual(["0", "0"]);
  });

  it("handles a non-200 response by throwing and hitting the catch (error logged, loading cleared)", async () => {
    getStats.mockResolvedValue({ status: 500, data: fullStats });
    const wrapper = mount(Stats);
    await flushPromises();

    // catch branch: console.error called, isLoading reset to false.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(errorSpy.mock.calls[0][0].message).toBe("Unable to Fetch Stats");

    // isLoading=false -> v-if branch renders, but stats stayed {} (defaults).
    expect(wrapper.findAll(".shimmer")).toHaveLength(0);
    const headings = wrapper.findAll("h3").map((h) => h.text());
    expect(headings).toContain("0");
    expect(headings).toContain("-");
  });

  it("handles a rejected fetch (catch branch via rejection, loading cleared)", async () => {
    const boom = new Error("network down");
    getStats.mockRejectedValue(boom);
    const wrapper = mount(Stats);
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith(boom);
    // Loading cleared even on failure -> loaded layout with default values.
    expect(wrapper.findAll(".shimmer")).toHaveLength(0);
    expect(wrapper.find(".bi-newspaper").exists()).toBe(true);
  });
});

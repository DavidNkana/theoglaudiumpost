import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// The only external dependency is getStats from the Articles service.
const getStats = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getStats: (...args) => getStats(...args),
}));

import Stats from "@/views/Admin/Articles/Partials/Stats.vue";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Stats.vue", () => {
  it("renders the four stat cards with fetched data once loaded (success path)", async () => {
    getStats.mockResolvedValue({
      status: 200,
      data: {
        total_published: 12,
        total_draft: 5,
        total_upcoming: 3,
        total_archived: 7,
      },
    });

    const wrapper = mount(Stats, { props: { currentStatus: "published" } });

    // onMounted -> fetchStats; resolve the async work.
    await flushPromises();

    // Loaded template (!isLoading) is rendered: four cards present.
    const cards = wrapper.findAll(".card");
    expect(cards).toHaveLength(4);

    // Values rendered from stats.value (?? fallback NOT taken).
    const texts = wrapper.findAll(".card-text").map((n) => n.text());
    expect(texts).toEqual(["12", "5", "3", "7"]);

    // currentStatus === 'published' -> only the published card shows the icon.
    const icons = wrapper.findAll("i.bi-check-circle");
    expect(icons).toHaveLength(1);
    // It belongs to the first (Published) card.
    expect(cards[0].find("i.bi-check-circle").exists()).toBe(true);
    expect(cards[1].find("i.bi-check-circle").exists()).toBe(false);

    expect(getStats).toHaveBeenCalledTimes(1);
  });

  it("uses the '-' fallback for every missing stat field (?? else branch)", async () => {
    // Empty data object -> all four nullish coalescing fallbacks taken.
    getStats.mockResolvedValue({ status: 200, data: {} });

    const wrapper = mount(Stats, { props: { currentStatus: "draft" } });
    await flushPromises();

    const texts = wrapper.findAll(".card-text").map((n) => n.text());
    expect(texts).toEqual(["-", "-", "-", "-"]);

    // currentStatus === 'draft' -> icon only on the Draft card (second).
    const cards = wrapper.findAll(".card");
    expect(cards[1].find("i.bi-check-circle").exists()).toBe(true);
    expect(cards[0].find("i.bi-check-circle").exists()).toBe(false);
  });

  it("shows the icon on the Scheduled card when currentStatus is 'scheduled'", async () => {
    getStats.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mount(Stats, { props: { currentStatus: "scheduled" } });
    await flushPromises();

    const cards = wrapper.findAll(".card");
    expect(cards[2].find("i.bi-check-circle").exists()).toBe(true);
    expect(wrapper.findAll("i.bi-check-circle")).toHaveLength(1);
  });

  it("shows the icon on the Archived card when currentStatus is 'archived'", async () => {
    getStats.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mount(Stats, { props: { currentStatus: "archived" } });
    await flushPromises();

    const cards = wrapper.findAll(".card");
    expect(cards[3].find("i.bi-check-circle").exists()).toBe(true);
    expect(wrapper.findAll("i.bi-check-circle")).toHaveLength(1);
  });

  it("renders no icon when currentStatus matches none of the cards", async () => {
    // Drives the FALSE side of all four v-if="props.currentStatus === ..." branches.
    getStats.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mount(Stats, { props: { currentStatus: "something-else" } });
    await flushPromises();

    expect(wrapper.findAll("i.bi-check-circle")).toHaveLength(0);
  });

  it("emits change-status with the correct status for each card click", async () => {
    getStats.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mount(Stats, { props: { currentStatus: "published" } });
    await flushPromises();

    const cards = wrapper.findAll(".card");
    await cards[0].trigger("click"); // published
    await cards[1].trigger("click"); // draft
    await cards[2].trigger("click"); // scheduled
    await cards[3].trigger("click"); // archived

    expect(wrapper.emitted("change-status")).toEqual([
      ["published"],
      ["draft"],
      ["scheduled"],
      ["archived"],
    ]);
  });

  it("shows the loading shimmer (v-for of 4) while the fetch is pending", async () => {
    // Never-resolving promise keeps isLoading true so the v-else branch renders.
    getStats.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(Stats, { props: { currentStatus: "published" } });
    // onMounted sets isLoading=true; let the reactive update flush.
    await wrapper.vm.$nextTick();

    // v-else loading branch: 4 shimmer placeholders, no stat cards.
    const shimmers = wrapper.findAll(".shimmer");
    expect(shimmers).toHaveLength(4);
    expect(wrapper.findAll(".card-text")).toHaveLength(0);
  });

  it("handles a non-200 response by throwing and entering the catch block", async () => {
    // status != 200 -> throw new Error -> catch -> console.error, isLoading=false.
    getStats.mockResolvedValue({ status: 500, data: { total_published: 99 } });

    const wrapper = mount(Stats, { props: { currentStatus: "published" } });
    await flushPromises();

    // Error logged.
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(console.error.mock.calls[0][0].message).toBe(
      "Unable to Fetch Stats"
    );

    // stats.value never assigned -> fallbacks shown, but loading is finished.
    const texts = wrapper.findAll(".card-text").map((n) => n.text());
    expect(texts).toEqual(["-", "-", "-", "-"]);
    expect(wrapper.findAll(".shimmer")).toHaveLength(0);
  });

  it("handles a rejected getStats promise via the catch block", async () => {
    const boom = new Error("network down");
    getStats.mockRejectedValue(boom);

    const wrapper = mount(Stats, { props: { currentStatus: "published" } });
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(boom);
    // isLoading set false in catch -> loaded template shown with fallbacks.
    expect(wrapper.findAll(".shimmer")).toHaveLength(0);
    expect(wrapper.findAll(".card-text").map((n) => n.text())).toEqual([
      "-",
      "-",
      "-",
      "-",
    ]);
  });
});

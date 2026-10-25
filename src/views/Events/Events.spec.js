import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { flushPromises } from "@vue/test-utils";
import Events from "@/views/Events/Events.vue";

// The component is fully self-contained (only `vue` ref/computed). There are no
// service / router / store / composable / capacitor / config imports to mock.
// The only external boundary that affects behaviour is the system clock, used by
// the time-filter (`new Date()`), so we control it with fake timers.

// Seed dates live in 2025. We pin "now" so the time filters have deterministic,
// branch-covering outcomes.
//  - id 5 (Art Exhibition) -> 2025-04-25  == BASE_NOW (today branch true)
//  - id 1 (Tech Conf)      -> 2025-05-15  (within a month, not this week)
//  - id 3 (Startup Pitch)  -> 2025-04-30  (within this week)
// Pinned to the exact instant the seed date "2025-04-25" parses to (midnight
// UTC). This makes `eventDate >= today` an equality that holds for id 5 in any
// timezone, while `today.toDateString()` still lands on the same calendar day.
const BASE_NOW = new Date("2025-04-25T00:00:00.000Z");

describe("Events.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Initial render: every seed event shows (all filters at default) ------
  it("renders all six seed events with default filters", () => {
    const wrapper = mount(Events);

    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(6);

    // Heading + pagination static chrome present
    expect(wrapper.text()).toContain("Upcoming Events");
    expect(wrapper.find(".pagination").exists()).toBe(true);

    // "All Events" button is active by default (currentCategory === 'all')
    const allBtn = wrapper.findAll("button.filter-btn")[0];
    expect(allBtn.classes()).toContain("active");

    // "All Time" button is active by default (currentTimeFilter === 'all')
    const timeButtons = wrapper.findAll(".btn-group button");
    expect(timeButtons[0].classes()).toContain("active");
  });

  // ---- categories computed -> v-for over derived category buttons -----------
  it("renders one category filter button per distinct category", () => {
    const wrapper = mount(Events);
    // Distinct categories in seed data: Technology, Music, Business, Food, Arts, Health
    const categoryButtons = wrapper.findAll("button.filter-btn");
    // index 0 is the static "All Events" button, the rest are v-for categories
    expect(categoryButtons).toHaveLength(1 + 6);
    const labels = categoryButtons.slice(1).map((b) => b.text());
    expect(labels).toEqual([
      "Technology",
      "Music",
      "Business",
      "Food",
      "Arts",
      "Health",
    ]);
  });

  // ---- Category filter: selecting a category narrows + toggles active -------
  it("filters by category and marks the chosen category button active", async () => {
    const wrapper = mount(Events);

    const techBtn = wrapper
      .findAll("button.filter-btn")
      .find((b) => b.text() === "Technology");
    await techBtn.trigger("click");

    // categoryMatch: event.category === currentCategory (true branch) AND
    // the !== branch for the other 5 events (filtered out)
    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain("Tech Conference 2025");

    // The Technology button is now active; "All Events" is not
    expect(techBtn.classes()).toContain("active");
    expect(wrapper.findAll("button.filter-btn")[0].classes()).not.toContain(
      "active"
    );
  });

  it("clicking 'All Events' resets the category filter back to all", async () => {
    const wrapper = mount(Events);

    const techBtn = wrapper
      .findAll("button.filter-btn")
      .find((b) => b.text() === "Technology");
    await techBtn.trigger("click");
    expect(wrapper.findAll(".event-card")).toHaveLength(1);

    const allBtn = wrapper.findAll("button.filter-btn")[0];
    await allBtn.trigger("click");
    // back to currentCategory === 'all' (categoryMatch true branch)
    expect(wrapper.findAll(".event-card")).toHaveLength(6);
    expect(allBtn.classes()).toContain("active");
  });

  // ---- Search filter: title / description / location OR branches -----------
  it("matches the search query against the event title (first OR branch)", async () => {
    const wrapper = mount(Events);
    const input = wrapper.find("input");
    // No <input> exists in template -> guard: drive searchQuery via vm instead.
    expect(input.exists()).toBe(false);

    // searchQuery is a top-level <script setup> binding, exposed on vm.
    wrapper.vm.searchQuery = "Tech Conference";
    await wrapper.vm.$nextTick();

    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain("Tech Conference 2025");
  });

  it("matches the search query against the description (second OR branch)", async () => {
    const wrapper = mount(Events);
    // 'genres' appears only in the Summer Music Festival description, not titles/locations
    wrapper.vm.searchQuery = "genres";
    await wrapper.vm.$nextTick();
    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain("Summer Music Festival");
  });

  it("matches the search query against the location (third OR branch)", async () => {
    const wrapper = mount(Events);
    // 'Boston' appears only in the Startup Pitch Night location
    wrapper.vm.searchQuery = "Boston";
    await wrapper.vm.$nextTick();
    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain("Startup Pitch Night");
  });

  // ---- Empty state: v-if="filteredEvents.length === 0" true branch ----------
  it("shows the empty state and a Reset Filters button when nothing matches", async () => {
    const wrapper = mount(Events);
    wrapper.vm.searchQuery = "zzz-no-such-event-zzz";
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll(".event-card")).toHaveLength(0);
    expect(wrapper.text()).toContain("No events match your current filters");
    expect(wrapper.find("button.btn-primary").exists()).toBe(true);
  });

  it("resetFilters clears category, time, and search filters", async () => {
    const wrapper = mount(Events);

    // Drive into the empty state via a non-matching search
    wrapper.vm.searchQuery = "zzz-no-such-event-zzz";
    wrapper.vm.currentCategory = "Technology";
    wrapper.vm.currentTimeFilter = "today";
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".event-card")).toHaveLength(0);

    // Click the Reset Filters button rendered by the empty state
    await wrapper.find(".text-center.py-5 button.btn-primary").trigger("click");

    // All three refs reset -> all six events back (categoryMatch 'all',
    // searchMatch '' substring, timeMatch 'all')
    expect(wrapper.vm.currentCategory).toBe("all");
    expect(wrapper.vm.currentTimeFilter).toBe("all");
    expect(wrapper.vm.searchQuery).toBe("");
    expect(wrapper.findAll(".event-card")).toHaveLength(6);
  });

  // ---- Time filter: TODAY branch (eventDate === today true & false) ---------
  it("filters to events happening today and toggles the Today button active", async () => {
    const wrapper = mount(Events);

    const todayBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "Today");
    await todayBtn.trigger("click");

    // Only the Art Exhibition (2025-04-25) matches BASE_NOW's date.
    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain("Art Exhibition Opening");
    expect(todayBtn.classes()).toContain("active");
  });

  // ---- Time filter: WEEK branch (eventDate >= today && <= weekFromNow) ------
  it("filters to events within the next week (week branch, both boundary sides)", async () => {
    const wrapper = mount(Events);

    const weekBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "This Week");
    await weekBtn.trigger("click");

    // From 2025-04-25 .. 2025-05-02 inclusive:
    //   id 5 Art (04-25, == today, >= true)  and id 3 Startup (04-30) qualify.
    //   id 1 (05-15) is after weekFromNow -> <= false branch exercised.
    const titles = wrapper
      .findAll(".event-card .card-title")
      .map((n) => n.text());
    expect(titles).toContain("Art Exhibition Opening");
    expect(titles).toContain("Startup Pitch Night");
    expect(titles).not.toContain("Tech Conference 2025");
    expect(weekBtn.classes()).toContain("active");
  });

  it("excludes past events in the week branch (>= today false branch)", async () => {
    // Move "now" forward so an event falls strictly before today -> >= false.
    vi.setSystemTime(new Date("2025-05-01T12:00:00.000Z"));
    const wrapper = mount(Events);

    const weekBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "This Week");
    await weekBtn.trigger("click");

    const titles = wrapper
      .findAll(".event-card .card-title")
      .map((n) => n.text());
    // id 3 (04-30) is now in the past -> eventDate >= today is FALSE
    expect(titles).not.toContain("Startup Pitch Night");
  });

  // ---- Time filter: MONTH branch (eventDate >= today && <= monthFromNow) ----
  it("filters to events within the next month (month branch, both boundary sides)", async () => {
    const wrapper = mount(Events);

    const monthBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "This Month");
    await monthBtn.trigger("click");

    // From 2025-04-25 .. 2025-05-25:
    //   id 1 Tech (05-15), id 4 Food (05-10), id 5 Art (04-25),
    //   id 3 Startup (04-30), id 6 Health (05-22) qualify.
    //   id 2 Music (06-20) is after monthFromNow -> <= false branch.
    const titles = wrapper
      .findAll(".event-card .card-title")
      .map((n) => n.text());
    expect(titles).toContain("Tech Conference 2025");
    expect(titles).not.toContain("Summer Music Festival");
    expect(monthBtn.classes()).toContain("active");
  });

  it("excludes past events in the month branch (>= today false branch)", async () => {
    vi.setSystemTime(new Date("2025-05-01T12:00:00.000Z"));
    const wrapper = mount(Events);

    const monthBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "This Month");
    await monthBtn.trigger("click");

    const titles = wrapper
      .findAll(".event-card .card-title")
      .map((n) => n.text());
    // id 5 Art (04-25) is now in the past -> >= today FALSE
    expect(titles).not.toContain("Art Exhibition Opening");
  });

  it("clicking 'All Time' resets the time filter (timeMatch stays true)", async () => {
    const wrapper = mount(Events);

    const todayBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "Today");
    await todayBtn.trigger("click");
    expect(wrapper.findAll(".event-card")).toHaveLength(1);

    const allTimeBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "All Time");
    await allTimeBtn.trigger("click");

    // currentTimeFilter === 'all' -> timeMatch default true, all events show
    expect(wrapper.findAll(".event-card")).toHaveLength(6);
    expect(allTimeBtn.classes()).toContain("active");
  });

  // ---- formatDate, category badge class, price + featured ternaries ---------
  it("renders date badge, category badge class, price label and Featured/Learn More buttons", () => {
    const wrapper = mount(Events);
    const cards = wrapper.findAll(".event-card");

    // formatDate output (en-US short month + numeric day) for the first card
    // (Tech Conference, 2025-05-15) -> "May 15"
    expect(cards[0].find(".date-badge").text()).toBe("May 15");

    // getCategoryClass mapped colour for a known category (Technology -> bg-primary)
    expect(cards[0].find(".category-badge").classes()).toContain("bg-primary");

    // Featured event (id 1) -> btn-warning + "Featured Event" (ternary true side)
    const featuredBtn = cards[0].find(".card-body button");
    expect(featuredBtn.classes()).toContain("btn-warning");
    expect(featuredBtn.text()).toBe("Featured Event");

    // Non-featured event (id 2 Summer Music Festival) -> "Learn More" + outline
    const musicCard = cards.find((c) =>
      c.text().includes("Summer Music Festival")
    );
    const musicBtn = musicCard.find(".card-body button");
    expect(musicBtn.classes()).toContain("btn-outline-primary");
    expect(musicBtn.text()).toBe("Learn More");

    // Price ternary: free event (Startup Pitch, price 0) -> "Free"
    const freeCard = cards.find((c) => c.text().includes("Startup Pitch Night"));
    expect(freeCard.find(".badge.bg-secondary").text()).toBe("Free");

    // Price ternary: paid event (Tech Conference, price 199) -> "$199"
    expect(cards[0].find(".badge.bg-secondary").text()).toBe("$199");
  });

  // ---- getCategoryClass default branch ("bg-dark" for unknown category) -----
  it("uses bg-dark for an event with an unknown category (default branch)", async () => {
    const wrapper = mount(Events);

    // Inject an event whose category is NOT in the colour map -> `|| "bg-dark"`.
    wrapper.vm.events = [
      {
        id: 99,
        title: "Mystery Event",
        description: "Unknown category event for the default branch.",
        date: "2025-04-25",
        location: "Nowhere",
        category: "Mystery",
        price: 10,
        featured: false,
      },
    ];
    await wrapper.vm.$nextTick();

    const cards = wrapper.findAll(".event-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].find(".category-badge").classes()).toContain("bg-dark");
    expect(cards[0].find(".category-badge").text()).toBe("Mystery");

    // No pending async work, but keep the harness contract consistent.
    await flushPromises();
  });
});

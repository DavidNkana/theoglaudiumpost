import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import Interviews from "@/views/Interviews/Interviews.vue";

const mountInterviews = () =>
  mount(Interviews, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("Interviews.vue", () => {
  it("renders the featured interview block (title, excerpt, interviewer)", () => {
    const wrapper = mountInterviews();

    expect(wrapper.find(".featured-section h2").text()).toBe(
      "The Future of AI and Human Collaboration"
    );
    expect(wrapper.find(".featured-section p.lead").text()).toContain(
      "Dr. Elena Martinez"
    );
    expect(wrapper.text()).toContain("Michael Chen");
    // formatDate(featuredInterview.date) -> "Apr 10, 2025"
    expect(wrapper.text()).toContain("Apr 10, 2025");
    // featured duration + views ( formatViews(145789) -> "145.8K" )
    expect(wrapper.text()).toContain("45:23");
    expect(wrapper.text()).toContain("145.8K views");
  });

  it("renders a category filter button per unique category plus 'All Categories'", () => {
    const wrapper = mountInterviews();

    const filterBtns = wrapper.findAll(".filter-btn");
    const labels = filterBtns.map((b) => b.text());
    // first is the static "All Categories", rest are computed unique categories
    expect(labels[0]).toBe("All Categories");
    const categoryLabels = labels.slice(1);
    expect(categoryLabels).toEqual([
      "Business",
      "Arts",
      "Sports",
      "Health",
      "Science",
      "Food",
      "Technology",
    ]);
    // de-duped: "Technology" appears once though two interviews use it
    expect(categoryLabels.filter((c) => c === "Technology")).toHaveLength(1);
  });

  it("marks 'All Categories' active by default and applies the active class", () => {
    const wrapper = mountInterviews();
    const allBtn = wrapper.findAll(".filter-btn")[0];
    expect(allBtn.classes()).toContain("active");
  });

  it("clicking 'All Categories' resets the category filter back to all", async () => {
    const wrapper = mountInterviews();

    // first narrow down to a single category
    const techBtn = wrapper
      .findAll(".filter-btn")
      .find((b) => b.text() === "Technology");
    await techBtn.trigger("click");
    expect(wrapper.vm.currentCategory).toBe("Technology");

    // now click the static "All Categories" button -> exercises @click="currentCategory = 'all'"
    const allBtn = wrapper.findAll(".filter-btn")[0];
    await allBtn.trigger("click");

    expect(wrapper.vm.currentCategory).toBe("all");
    expect(allBtn.classes()).toContain("active");
    expect(wrapper.findAll(".interview-card")).toHaveLength(7);
  });

  it("renders one card per interview by default (no filters applied)", () => {
    const wrapper = mountInterviews();
    const cards = wrapper.findAll(".interview-card");
    expect(cards).toHaveLength(7);
  });

  it("applies the featured-interview class only to featured cards", () => {
    const wrapper = mountInterviews();
    const featuredCards = wrapper.findAll(".interview-card.featured-interview");
    // interviews array has featured:true for ids 3, 6 => 2 featured cards
    expect(featuredCards).toHaveLength(2);
  });

  it("filters by category when a category button is clicked", async () => {
    const wrapper = mountInterviews();

    const techBtn = wrapper
      .findAll(".filter-btn")
      .find((b) => b.text() === "Technology");
    await techBtn.trigger("click");

    expect(techBtn.classes()).toContain("active");
    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    // Only Technology interviews remain (Digital Privacy + ... matches category Technology)
    expect(titles).toContain("Digital Privacy in the Age of Big Data");
    titles.forEach((t) => {
      expect(t).not.toBe("Sustainable Business Models for 2025 and Beyond");
    });
  });

  it("filters by search query matching title/excerpt/interviewer", async () => {
    const wrapper = mountInterviews();

    // drive the searchQuery ref directly via the exposed setup state
    wrapper.vm.searchQuery = "Sarah Johnson"; // interviewer match
    await wrapper.vm.$nextTick();

    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    expect(titles).toEqual(["Sustainable Business Models for 2025 and Beyond"]);
  });

  it("matches search against excerpt text", async () => {
    const wrapper = mountInterviews();
    wrapper.vm.searchQuery = "climate challenges"; // excerpt match
    await wrapper.vm.$nextTick();

    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    expect(titles).toEqual(["Sustainable Business Models for 2025 and Beyond"]);
  });

  it("matches search against title text", async () => {
    const wrapper = mountInterviews();
    wrapper.vm.searchQuery = "Space Exploration"; // title match
    await wrapper.vm.$nextTick();

    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    expect(titles).toEqual(["The Evolution of Space Exploration"]);
  });

  it("shows the empty state + reset button when no interviews match", async () => {
    const wrapper = mountInterviews();
    wrapper.vm.searchQuery = "zzz-no-match-zzz";
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll(".interview-card")).toHaveLength(0);
    expect(wrapper.text()).toContain("No interviews match your current filters");

    const resetBtn = wrapper.find(".col-12.text-center .btn.btn-primary");
    expect(resetBtn.text()).toBe("Reset Filters");

    // reset restores everything
    await resetBtn.trigger("click");
    expect(wrapper.vm.searchQuery).toBe("");
    expect(wrapper.vm.currentCategory).toBe("all");
    expect(wrapper.vm.currentSort).toBe("newest");
    expect(wrapper.findAll(".interview-card")).toHaveLength(7);
  });

  it("sorts newest by default (most recent date first)", () => {
    const wrapper = mountInterviews();
    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    // newest date 2025-04-12 is Sustainable Business...
    expect(titles[0]).toBe("Sustainable Business Models for 2025 and Beyond");
  });

  it("sorts by most popular when 'Most Popular' is clicked", async () => {
    const wrapper = mountInterviews();
    const popularBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "Most Popular");
    await popularBtn.trigger("click");

    expect(popularBtn.classes()).toContain("active");
    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    // highest views among interviews array is Space Exploration (120500)
    expect(titles[0]).toBe("The Evolution of Space Exploration");
  });

  it("sorts by longest when 'Longest' is clicked", async () => {
    const wrapper = mountInterviews();
    const longestBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "Longest");
    await longestBtn.trigger("click");

    expect(longestBtn.classes()).toContain("active");
    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    // longest duration minutes: Healthcare 53:27 -> 53 minutes
    expect(titles[0]).toBe("Reimagining Global Healthcare Systems");
  });

  it("keeps the newest button active when 'Newest' clicked explicitly", async () => {
    const wrapper = mountInterviews();
    const newestBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "Newest");
    // switch away then back to exercise the active binding toggling
    await wrapper
      .findAll(".btn-group button")
      .find((b) => b.text() === "Longest")
      .trigger("click");
    await newestBtn.trigger("click");
    expect(newestBtn.classes()).toContain("active");
  });

  it("leaves results unsorted when currentSort is an unrecognized value", async () => {
    const wrapper = mountInterviews();
    // none of the three sort branches match -> filtered returned as-is (source order)
    wrapper.vm.currentSort = "unknown-sort";
    await wrapper.vm.$nextTick();

    const titles = wrapper.findAll(".card-title").map((t) => t.text());
    // source array order is preserved (first interview in the data array)
    expect(titles[0]).toBe("Sustainable Business Models for 2025 and Beyond");
    expect(titles).toHaveLength(7);
  });

  it("renders the trending list (top 5 by views, ordered desc)", () => {
    const wrapper = mountInterviews();
    const trending = wrapper.findAll(".trending-item h6").map((h) => h.text());
    expect(trending).toHaveLength(5);
    expect(trending[0]).toBe("The Evolution of Space Exploration"); // 120500
    expect(trending[1]).toBe("The Science of High-Performance Athletics"); // 94200
  });

  it("renders all topic tags", () => {
    const wrapper = mountInterviews();
    const tagLinks = wrapper.findAll(".card .d-flex.flex-wrap a.btn-outline-secondary");
    const tagTexts = tagLinks.map((a) => a.text());
    expect(tagTexts).toContain("Artificial Intelligence");
    expect(tagTexts).toContain("Global Economy");
    expect(tagTexts).toHaveLength(12);
  });

  it("formatViews returns M / K / raw across all magnitude branches", () => {
    const wrapper = mountInterviews();
    expect(wrapper.vm.formatViews(2500000)).toBe("2.5M"); // >= 1,000,000
    expect(wrapper.vm.formatViews(78450)).toBe("78.5K"); // >= 1,000
    expect(wrapper.vm.formatViews(500)).toBe(500); // raw number
  });

  it("getCategoryClass maps known categories and falls back to bg-dark", () => {
    const wrapper = mountInterviews();
    expect(wrapper.vm.getCategoryClass("Technology")).toBe("bg-primary");
    expect(wrapper.vm.getCategoryClass("Business")).toBe("bg-info");
    expect(wrapper.vm.getCategoryClass("Arts")).toBe("bg-danger");
    expect(wrapper.vm.getCategoryClass("Sports")).toBe("bg-success");
    expect(wrapper.vm.getCategoryClass("Health")).toBe("bg-warning");
    expect(wrapper.vm.getCategoryClass("Science")).toBe("bg-dark");
    expect(wrapper.vm.getCategoryClass("Food")).toBe("bg-secondary");
    // unknown -> fallback branch
    expect(wrapper.vm.getCategoryClass("Unknown")).toBe("bg-dark");
  });

  it("renders the category badge using getCategoryClass on each card", () => {
    const wrapper = mountInterviews();
    const badge = wrapper.find(".category-badge");
    // first card (newest) is Business -> bg-info
    expect(badge.classes()).toContain("bg-info");
  });

  it("formatDate renders a localized short date in card date badges", () => {
    const wrapper = mountInterviews();
    const dates = wrapper.findAll(".date-badge").map((d) => d.text());
    // every date badge should be in "Mon D, YYYY" style
    dates.forEach((d) => {
      expect(d).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });
  });
});

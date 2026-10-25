import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the announcements service boundary.
const changeCategoryStatus = vi.fn();
vi.mock("@/features/announcements/AnnouncementsService", () => ({
  changeCategoryStatus: (...args) => changeCategoryStatus(...args),
}));

// Mock the utils boundary (imported by the component).
vi.mock("@/utils", () => ({
  formatAdLocation: vi.fn(() => "loc"),
  getAdLocationBadgeClass: vi.fn(() => "badge-loc"),
  getStatusBadgeClass: vi.fn(() => "badge-status"),
}));

import CategoriesTable from "./CategoriesTable.vue";

const makeCategory = (overrides = {}) => ({
  id: 1,
  name: "News",
  description: "Latest news",
  announcements: 3,
  is_active: true,
  ...overrides,
});

const factory = (props = {}) =>
  mount(CategoriesTable, {
    props: {
      categories: [makeCategory()],
      isLoading: false,
      ...props,
    },
  });

describe("CategoriesTable.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the shimmer loading rows when isLoading is true", () => {
    const wrapper = factory({ isLoading: true, categories: [] });
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(5);
    // No data rows / empty message while loading.
    expect(wrapper.text()).not.toContain("No categories found");
  });

  it("renders the empty state when not loading and list is empty", () => {
    const wrapper = factory({ isLoading: false, categories: [] });
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(0);
    expect(wrapper.text()).toContain("No categories found");
  });

  it("renders category rows with computed index, active label and actions", () => {
    const categories = [
      makeCategory({ id: 1, name: "News", is_active: true }),
      makeCategory({ id: 2, name: "Events", is_active: false }),
    ];
    const wrapper = factory({ categories, page: 2, pageSize: 10 });

    expect(wrapper.text()).not.toContain("No categories found");

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);

    // index = page * pageSize + index + 1 => 2*10 + 0 + 1 = 21, then 22
    expect(rows[0].text()).toContain("21");
    expect(rows[1].text()).toContain("22");

    // Active vs Inactive ternary branches.
    expect(rows[0].text()).toContain("Active");
    expect(rows[1].text()).toContain("Inactive");

    // Both rows have the action btn-group since id !== 14.
    expect(wrapper.findAll(".btn-group")).toHaveLength(2);
  });

  it("emits handle-edit and handle-delete with the category id", async () => {
    const wrapper = factory({
      categories: [makeCategory({ id: 7 })],
    });
    const buttons = wrapper.findAll(".btn-group button");
    await buttons[0].trigger("click"); // edit
    await buttons[1].trigger("click"); // delete

    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([7]);
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([7]);
  });

  it("hides the action btn-group for the protected category id 14", () => {
    const wrapper = factory({
      categories: [makeCategory({ id: 14, name: "Protected" })],
    });
    expect(wrapper.find(".btn-group").exists()).toBe(false);
  });

  it("returns early from toggleStatus for category id 14 without calling the service", async () => {
    const wrapper = factory({
      categories: [makeCategory({ id: 14, is_active: true })],
    });
    const checkbox = wrapper.find("input[type='checkbox']");
    await checkbox.trigger("change");
    await flushPromises();

    expect(changeCategoryStatus).not.toHaveBeenCalled();
    // No spinner shown because loadingId never set.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
  });

  it("toggles status successfully, shows the spinner while pending and updates locally", async () => {
    let resolveCall;
    changeCategoryStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve;
      })
    );

    const category = makeCategory({ id: 5, is_active: false });
    const wrapper = factory({ categories: [category] });

    const checkbox = wrapper.find("input[type='checkbox']");
    await checkbox.trigger("change");
    await wrapper.vm.$nextTick();

    // Spinner visible while loadingId === category.id (v-if true branch).
    expect(wrapper.find(".spinner-border").exists()).toBe(true);

    resolveCall();
    await flushPromises();

    // Service called with new status (toggled from false to true).
    expect(changeCategoryStatus).toHaveBeenCalledWith(5, { is_active: true });
    // Local state updated and spinner removed (loadingId reset).
    expect(category.is_active).toBe(true);
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.text()).toContain("Active");
  });

  it("handles a rejected service call via the catch branch and reverts loading state", async () => {
    const error = new Error("network");
    changeCategoryStatus.mockRejectedValue(error);

    const category = makeCategory({ id: 9, is_active: true });
    const wrapper = factory({ categories: [category] });

    const checkbox = wrapper.find("input[type='checkbox']");
    await checkbox.trigger("change");
    await flushPromises();

    expect(changeCategoryStatus).toHaveBeenCalledWith(9, { is_active: false });
    // Local state NOT updated because of failure.
    expect(category.is_active).toBe(true);
    // Error logged via catch branch.
    expect(console.error).toHaveBeenCalledWith(
      "Failed to update status:",
      error
    );
    // Spinner cleared in finally.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import TagSelector from "./TagSelector.vue";

const sampleTags = [
  { id: 1, name: "Alpha", count: 3 },
  { id: 2, name: "Beta", count: 0 },
  { id: 3, name: "Gamma" }, // no count -> exercises `tag.count || 0`
];

function makeWrapper(props = {}) {
  return mount(TagSelector, {
    props: {
      tags: sampleTags,
      ...props,
    },
  });
}

describe("TagSelector.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title when provided and omits it otherwise", () => {
    const withTitle = makeWrapper({ title: "Categories" });
    const h3 = withTitle.find("h3");
    expect(h3.exists()).toBe(true);
    expect(h3.text()).toBe("Categories");

    const noTitle = makeWrapper({ title: "" });
    expect(noTitle.find("h3").exists()).toBe(false);
  });

  it("shows search input when searchable and hides it otherwise", () => {
    const searchable = makeWrapper({ searchable: true });
    expect(searchable.find(".input-group input[type='text']").exists()).toBe(
      true
    );

    const notSearchable = makeWrapper({ searchable: false });
    expect(notSearchable.find(".input-group").exists()).toBe(false);
  });

  it("filters tags by search query and shows/clears the clear button", async () => {
    const wrapper = makeWrapper({ searchable: true, displayType: "badges" });

    // No query -> input-group clear button hidden, all tags rendered
    expect(
      wrapper.find(".input-group .btn-outline-secondary").exists()
    ).toBe(false);
    expect(wrapper.findAll(".tag-badge-item").length).toBe(3);

    // Typing a query filters to matching tags (case-insensitive) and shows clear btn
    const input = wrapper.find("input[type='text']");
    await input.setValue("alp");
    await flushPromises();
    expect(wrapper.findAll(".tag-badge-item").length).toBe(1);
    const clearBtn = wrapper.find(".input-group .btn-outline-secondary");
    expect(clearBtn.exists()).toBe(true);

    // Clicking clear button resets the query (covers @click="searchQuery = ''")
    await clearBtn.trigger("click");
    await flushPromises();
    expect(wrapper.find("input[type='text']").element.value).toBe("");
    expect(wrapper.findAll(".tag-badge-item").length).toBe(3);
  });

  it("renders 'No tags found' when the filtered list is empty", async () => {
    const wrapper = makeWrapper({ searchable: true });
    await wrapper.find("input[type='text']").setValue("zzzz-no-match");
    await flushPromises();
    expect(wrapper.find(".text-muted.p-2").text()).toBe("No tags found");
    expect(wrapper.find(".tag-list").exists()).toBe(false);
  });

  it("renders grid display type with count badge driven by showCount", async () => {
    const wrapper = makeWrapper({
      displayType: "grid",
      showCount: true,
      modelValue: [1],
    });
    const cols = wrapper.findAll(".col-md-4");
    expect(cols.length).toBe(3);
    // selected class applied to tag 1 (isSelected true branch)
    expect(wrapper.find(".tag-item.selected").exists()).toBe(true);
    // count badges present; Gamma (no count) shows 0 via `tag.count || 0`
    const badges = wrapper.findAll(".badge.bg-secondary");
    expect(badges.length).toBe(3);
    expect(badges[2].text()).toBe("0");

    // showCount false hides the count badge (v-if=showCount false branch)
    const noCount = makeWrapper({ displayType: "grid", showCount: false });
    expect(noCount.find(".badge.bg-secondary").exists()).toBe(false);
  });

  it("renders list display type with showCount branches", () => {
    const wrapper = makeWrapper({ displayType: "list", showCount: true });
    expect(wrapper.find(".tag-list-container").exists()).toBe(true);
    expect(wrapper.findAll(".tag-item").length).toBe(3);
    expect(wrapper.findAll(".badge.bg-secondary").length).toBe(3);

    const noCount = makeWrapper({ displayType: "list", showCount: false });
    expect(noCount.find(".badge.bg-secondary").exists()).toBe(false);
  });

  it("renders badges display type with selected/unselected classes and showCount", () => {
    const wrapper = makeWrapper({
      displayType: "badges",
      showCount: true,
      modelValue: [2],
    });
    expect(wrapper.find(".tag-badges").exists()).toBe(true);
    // selected tag uses bg-primary label, others bg-secondary (ternary both branches)
    expect(wrapper.find("label.badge.bg-primary").exists()).toBe(true);
    expect(wrapper.find("label.badge.bg-secondary").exists()).toBe(true);
    // count span uses `(count || 0)`; Beta has count 0
    expect(wrapper.html()).toContain("(0)");

    const noCount = makeWrapper({ displayType: "badges", showCount: false });
    expect(noCount.find(".tag-badge-item .ms-1").exists()).toBe(false);
  });

  it("emits update:modelValue and change when a checkbox changes", async () => {
    const wrapper = makeWrapper({ displayType: "list" });
    const checkbox = wrapper.find("input[type='checkbox']");
    await checkbox.setValue(true);
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("change")).toBeTruthy();
    // First selected id should be tag 1
    const lastUpdate = wrapper.emitted("update:modelValue").at(-1)[0];
    expect(lastUpdate).toContain(1);
  });

  it("emits change when a grid-mode checkbox is toggled", async () => {
    const wrapper = makeWrapper({ displayType: "grid" });
    await wrapper.find(".tag-item-grid input[type='checkbox']").setValue(true);
    await flushPromises();
    expect(wrapper.emitted("change").at(-1)[0]).toContain(1);
  });

  it("emits change when a badges-mode checkbox is toggled", async () => {
    const wrapper = makeWrapper({ displayType: "badges" });
    await wrapper.find(".tag-badge-item input[type='checkbox']").setValue(true);
    await flushPromises();
    expect(wrapper.emitted("change").at(-1)[0]).toContain(1);
  });

  it("falls back to the default empty tags array when tags is omitted", () => {
    // Mounting without `tags` exercises the `default: () => []` factory (line 178).
    const wrapper = mount(TagSelector, { props: {} });
    expect(wrapper.find(".text-muted.p-2").text()).toBe("No tags found");
  });

  it("validates the displayType prop value", () => {
    const validator = TagSelector.props.displayType.validator;
    expect(validator("grid")).toBe(true);
    expect(validator("list")).toBe(true);
    expect(validator("badges")).toBe(true);
    expect(validator("invalid")).toBe(false);
  });

  it("shows actions and toggles disabled state of Clear/Select buttons", async () => {
    const wrapper = makeWrapper({
      displayType: "list",
      showActions: true,
      modelValue: [],
    });
    const clearBtn = wrapper.find(".tag-actions .btn-outline-secondary");
    const selectBtn = wrapper.find(".tag-actions .btn-outline-primary");

    // Nothing selected: Clear disabled (length === 0 true), Select enabled
    expect(clearBtn.attributes("disabled")).toBeDefined();
    expect(selectBtn.attributes("disabled")).toBeUndefined();

    // Select All -> all selected, emits, Select becomes disabled, Clear enabled
    await selectBtn.trigger("click");
    await flushPromises();
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(
      wrapper.find(".tag-actions .btn-outline-primary").attributes("disabled")
    ).toBeDefined();
    expect(
      wrapper.find(".tag-actions .btn-outline-secondary").attributes("disabled")
    ).toBeUndefined();

    // Clear All -> empties selection
    await wrapper.find(".tag-actions .btn-outline-secondary").trigger("click");
    await flushPromises();
    expect(
      wrapper.find(".tag-actions .btn-outline-secondary").attributes("disabled")
    ).toBeDefined();
  });

  it("hides actions block when showActions is false", () => {
    const wrapper = makeWrapper({ showActions: false });
    expect(wrapper.find(".tag-actions").exists()).toBe(false);
  });

  it("renders the selection summary and removes a tag via the x icon", async () => {
    const wrapper = makeWrapper({
      showSelectionSummary: true,
      modelValue: [1, 2],
    });
    const summary = wrapper.find(".selected-summary");
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toContain("Selected (2)");
    // getTagName returns names for valid ids
    expect(summary.text()).toContain("Alpha");
    expect(summary.text()).toContain("Beta");

    // Remove tag 1 via x-circle icon
    await wrapper.find(".selected-summary .bi-x-circle-fill").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("change")).toBeTruthy();
    const lastUpdate = wrapper.emitted("update:modelValue").at(-1)[0];
    expect(lastUpdate).toEqual([2]);
  });

  it("hides the summary when showSelectionSummary is false or nothing selected", () => {
    const off = makeWrapper({ showSelectionSummary: false, modelValue: [1] });
    expect(off.find(".selected-summary").exists()).toBe(false);

    const empty = makeWrapper({ showSelectionSummary: true, modelValue: [] });
    expect(empty.find(".selected-summary").exists()).toBe(false);
  });

  it("getTagName returns empty string for an unknown id in the summary", () => {
    // selected id 999 is not in tags -> getTagName returns "" (false branch)
    const wrapper = makeWrapper({
      showSelectionSummary: true,
      modelValue: [999],
    });
    const badge = wrapper.find(".selected-tags .badge");
    expect(badge.exists()).toBe(true);
    // Only the x icon text remains; the tag name is empty
    expect(badge.text().trim()).toBe("");
  });

  it("syncs internal selection when modelValue prop changes (watcher)", async () => {
    const wrapper = makeWrapper({ modelValue: [1] });
    await wrapper.setProps({ modelValue: [2, 3] });
    await flushPromises();
    expect(wrapper.vm.selectedTagIds).toEqual([2, 3]);
    // isSelected reflects updated internal state
    expect(wrapper.vm.isSelected(2)).toBe(true);
    expect(wrapper.vm.isSelected(1)).toBe(false);
  });
});

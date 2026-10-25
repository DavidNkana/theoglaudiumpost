import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import TagSelector from "@/components/TagSelector.vue";

// A reusable set of tags. Tags 2 has no `count` to exercise the `tag.count || 0`
// fallback branch; tag 1 has a numeric count to exercise the truthy branch.
const baseTags = [
  { id: 1, name: "Apple", count: 5 },
  { id: 2, name: "Banana" }, // no count -> `count || 0` falls back to 0
  { id: 3, name: "Cherry", count: 0 }, // count === 0 -> falls back to 0 too
];

/**
 * Mount helper with sane defaults. Override via `props`.
 */
function mountSelector(props = {}) {
  return mount(TagSelector, {
    props: {
      tags: baseTags,
      ...props,
    },
  });
}

describe("TagSelector.vue", () => {
  // ---- tags prop default factory ------------------------------------------
  it("falls back to an empty tags array via the prop default factory when `tags` is omitted", () => {
    // Mounting without `tags` invokes the `default: () => []` factory (line 210)
    // and renders the empty-state message.
    const wrapper = mount(TagSelector);
    expect(wrapper.find(".text-muted.p-2").text()).toBe("No tags found");
  });

  // ---- title v-if ----------------------------------------------------------
  it("renders the title heading when `title` is provided", () => {
    const wrapper = mountSelector({ title: "Categories" });
    const h3 = wrapper.find("h3.h6");
    expect(h3.exists()).toBe(true);
    expect(h3.text()).toBe("Categories");
  });

  it("omits the title heading when `title` is empty (default)", () => {
    const wrapper = mountSelector();
    expect(wrapper.find("h3.h6").exists()).toBe(false);
  });

  // ---- searchable v-if + clear button --------------------------------------
  it("renders the search input when `searchable` is true and binds the placeholder to the title", () => {
    const wrapper = mountSelector({ searchable: true, title: "Tags" });
    const input = wrapper.find("input[type='text']");
    expect(input.exists()).toBe(true);
    expect(input.attributes("placeholder")).toBe("Search Tags...");
    // No query yet -> the clear (x) button (inside the input-group) is hidden
    expect(
      wrapper.find(".input-group button.btn-outline-secondary").exists()
    ).toBe(false);
  });

  it("hides the search input when `searchable` is false", () => {
    const wrapper = mountSelector({ searchable: false });
    expect(wrapper.find("input[type='text']").exists()).toBe(false);
  });

  it("filters tags by the search query and renders the clear button; clearing resets the query", async () => {
    const wrapper = mountSelector({ searchable: true, displayType: "list" });
    const input = wrapper.find("input[type='text']");

    // Typing a query exercises the computed's `query` branch + .filter()
    await input.setValue("ban");
    await nextTick();

    // Only "Banana" matches (case-insensitive)
    const labels = wrapper.findAll(".tag-list-container label");
    expect(labels).toHaveLength(1);
    expect(labels[0].text()).toContain("Banana");

    // searchQuery truthy -> clear button now visible
    const clearBtn = wrapper.find(".input-group button.btn-outline-secondary");
    expect(clearBtn.exists()).toBe(true);

    // Clicking the clear button sets searchQuery back to ""
    await clearBtn.trigger("click");
    await nextTick();
    expect(wrapper.find("input[type='text']").element.value).toBe("");
    // All tags are visible again (computed's `!searchQuery.value` branch)
    expect(wrapper.findAll(".tag-list-container label")).toHaveLength(3);
  });

  // ---- filteredTags empty branch ------------------------------------------
  it("shows the 'No tags found' message when the filtered list is empty", () => {
    const wrapper = mountSelector({ tags: [] });
    expect(wrapper.find(".text-muted.p-2").text()).toBe("No tags found");
    expect(wrapper.find(".tag-list").exists()).toBe(false);
  });

  it("shows 'No tags found' when a search query matches nothing", async () => {
    const wrapper = mountSelector({ searchable: true });
    await wrapper.find("input[type='text']").setValue("zzz-nomatch");
    await nextTick();
    expect(wrapper.find(".text-muted.p-2").text()).toBe("No tags found");
  });

  // ---- grid display mode ---------------------------------------------------
  it("renders tags in grid mode with count badges when showCount is true", () => {
    const wrapper = mountSelector({ displayType: "grid", showCount: true });
    const grid = wrapper.find(".row.g-2");
    expect(grid.exists()).toBe(true);

    const items = wrapper.findAll(".tag-item-grid");
    expect(items).toHaveLength(3);

    // showCount true -> badge rendered; tag 1 count=5, tag 2 missing -> 0
    const badges = wrapper.findAll(".tag-item-grid .badge.bg-secondary");
    expect(badges).toHaveLength(3);
    expect(badges[0].text()).toBe("5");
    expect(badges[1].text()).toBe("0"); // `tag.count || 0` fallback
    expect(badges[2].text()).toBe("0"); // count === 0 fallback
  });

  it("renders grid mode without count badges when showCount is false (default)", () => {
    const wrapper = mountSelector({ displayType: "grid" });
    expect(wrapper.findAll(".tag-item-grid").length).toBe(3);
    expect(wrapper.find(".tag-item-grid .badge").exists()).toBe(false);
  });

  // ---- list display mode ---------------------------------------------------
  it("renders tags in list mode with count badges when showCount is true", () => {
    const wrapper = mountSelector({ displayType: "list", showCount: true });
    expect(wrapper.find(".tag-list-container").exists()).toBe(true);
    const badges = wrapper.findAll(".tag-list-container .badge.bg-secondary");
    expect(badges).toHaveLength(3);
    expect(badges[1].text()).toBe("0");
  });

  it("renders list mode without count badges when showCount is false", () => {
    const wrapper = mountSelector({ displayType: "list" });
    expect(wrapper.find(".tag-list-container").exists()).toBe(true);
    expect(wrapper.find(".tag-list-container .badge").exists()).toBe(false);
  });

  // ---- badges display mode (default / else branch) -------------------------
  it("renders tags as badges by default, applying selected vs unselected classes and the count span", () => {
    const wrapper = mountSelector({
      displayType: "badges",
      showCount: true,
      modelValue: [1], // tag 1 selected -> bg-primary; others bg-secondary
    });
    expect(wrapper.find(".tag-badges").exists()).toBe(true);

    const labels = wrapper.findAll(".tag-badge-item label");
    expect(labels).toHaveLength(3);
    // isSelected(1) true -> bg-primary
    expect(labels[0].classes()).toContain("bg-primary");
    // isSelected(2) false -> bg-secondary
    expect(labels[1].classes()).toContain("bg-secondary");

    // showCount true -> "(count)" span; tag 2 missing count -> (0)
    expect(labels[0].text()).toContain("(5)");
    expect(labels[1].text()).toContain("(0)");
  });

  it("renders badges mode without count spans when showCount is false", () => {
    const wrapper = mountSelector({ displayType: "badges" });
    expect(wrapper.find(".tag-badges").exists()).toBe(true);
    expect(wrapper.find(".tag-badge-item label span").exists()).toBe(false);
  });

  // ---- selecting a checkbox emits update:modelValue + change ---------------
  it("selecting a tag checkbox in LIST mode emits update:modelValue and change", async () => {
    const wrapper = mountSelector({ displayType: "list" });
    const checkbox = wrapper.find(".tag-list-container #tag-1");
    await checkbox.setValue(true); // triggers v-model update + @change -> emitChange
    await nextTick();

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toContain(1);
    expect(wrapper.emitted("change").at(-1)[0]).toContain(1);
  });

  it("selecting a tag checkbox in GRID mode triggers @change/emitChange", async () => {
    const wrapper = mountSelector({ displayType: "grid" });
    const checkbox = wrapper.find(".tag-item-grid #tag-2");
    await checkbox.setValue(true);
    await nextTick();
    expect(wrapper.emitted("change").at(-1)[0]).toContain(2);
    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toContain(2);
  });

  it("selecting a tag checkbox in BADGES mode triggers @change/emitChange", async () => {
    const wrapper = mountSelector({ displayType: "badges" });
    const checkbox = wrapper.find(".tag-badge-item #tag-3");
    await checkbox.setValue(true);
    await nextTick();
    expect(wrapper.emitted("change").at(-1)[0]).toContain(3);
    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toContain(3);
  });

  // ---- showActions: Clear All / Select All + disabled states ---------------
  it("hides the action buttons when showActions is false", () => {
    const wrapper = mountSelector({ showActions: false });
    expect(wrapper.find(".tag-actions").exists()).toBe(false);
  });

  it("Clear All is disabled with no selection and Select All is enabled", () => {
    const wrapper = mountSelector({ showActions: true, modelValue: [] });
    const clearBtn = wrapper.find(".tag-actions .btn-outline-secondary");
    const selectBtn = wrapper.find(".tag-actions .btn-outline-primary");
    // selectedTagIds.length === 0 -> Clear disabled
    expect(clearBtn.attributes("disabled")).toBeDefined();
    // length (0) !== filteredTags.length (3) -> Select All enabled
    expect(selectBtn.attributes("disabled")).toBeUndefined();
  });

  it("Select All selects every filtered tag, then becomes disabled; Clear All then resets", async () => {
    const wrapper = mountSelector({ showActions: true });
    const selectBtn = wrapper.find(".tag-actions .btn-outline-primary");

    await selectBtn.trigger("click");
    await nextTick();

    // selectAll maps all filtered ids and emits change
    expect(wrapper.emitted("change").at(-1)[0]).toEqual([1, 2, 3]);
    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toEqual([1, 2, 3]);

    // Now length === filteredTags.length -> Select All disabled; Clear enabled
    expect(
      wrapper.find(".tag-actions .btn-outline-primary").attributes("disabled")
    ).toBeDefined();
    const clearBtn = wrapper.find(".tag-actions .btn-outline-secondary");
    expect(clearBtn.attributes("disabled")).toBeUndefined();

    // Clear All empties the selection
    await clearBtn.trigger("click");
    await nextTick();
    expect(wrapper.emitted("change").at(-1)[0]).toEqual([]);
  });

  // ---- selection summary + removeTag + getTagName --------------------------
  it("shows the selection summary with names and removes a tag via the x icon", async () => {
    const wrapper = mountSelector({
      showSelectionSummary: true,
      modelValue: [1, 2],
    });
    const summary = wrapper.find(".selected-summary");
    expect(summary.exists()).toBe(true);
    expect(summary.find("strong").text()).toBe("Selected (2):");

    const chips = wrapper.findAll(".selected-tags .badge");
    expect(chips).toHaveLength(2);
    // getTagName resolves ids to names (found branch)
    expect(chips[0].text()).toContain("Apple");
    expect(chips[1].text()).toContain("Banana");

    // Click the x icon on the first chip -> removeTag(1)
    await wrapper.find(".selected-tags .badge i.bi-x-circle-fill").trigger("click");
    await nextTick();

    expect(wrapper.emitted("change").at(-1)[0]).toEqual([2]);
    expect(wrapper.findAll(".selected-tags .badge")).toHaveLength(1);
    expect(wrapper.find(".selected-tags .badge").text()).toContain("Banana");
  });

  it("renders an empty name in the summary when the selected id has no matching tag (getTagName not-found branch)", () => {
    const wrapper = mountSelector({
      showSelectionSummary: true,
      modelValue: [999], // no tag with this id -> getTagName returns ""
    });
    const chip = wrapper.find(".selected-tags .badge");
    expect(chip.exists()).toBe(true);
    // Only the close icon remains; the name is empty
    expect(chip.text()).toBe("");
  });

  it("hides the selection summary when showSelectionSummary is false", () => {
    const wrapper = mountSelector({
      showSelectionSummary: false,
      modelValue: [1],
    });
    expect(wrapper.find(".selected-summary").exists()).toBe(false);
  });

  it("hides the selection summary when nothing is selected (length === 0 branch)", () => {
    const wrapper = mountSelector({
      showSelectionSummary: true,
      modelValue: [],
    });
    expect(wrapper.find(".selected-summary").exists()).toBe(false);
  });

  // ---- watcher on modelValue ----------------------------------------------
  it("updates internal selection when the modelValue prop changes externally (watcher)", async () => {
    const wrapper = mountSelector({
      displayType: "list",
      modelValue: [1],
    });
    expect(wrapper.vm.selectedTagIds).toEqual([1]);

    await wrapper.setProps({ modelValue: [2, 3] });
    await nextTick();

    // Watcher copies the new array into selectedTagIds
    expect(wrapper.vm.selectedTagIds).toEqual([2, 3]);
    // isSelected reflects the new state in the rendered list
    expect(wrapper.find(".tag-item.selected").exists()).toBe(true);
  });
});

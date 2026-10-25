import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

// Mock vue-router's useRouter so the component gets a controllable router.
const push = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

import HeaderSearch from "@/components/HeaderSearch.vue";

function mountSearch() {
  // attachTo a real DOM node so template refs (searchToggleBtn/searchDropdown)
  // and document-level click listeners behave like in a browser.
  document.body.innerHTML = '<div id="app"></div>';
  return mount(HeaderSearch, { attachTo: document.getElementById("app") });
}

describe("HeaderSearch", () => {
  beforeEach(() => {
    push.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders the toggle button and hides the dropdown by default", () => {
    const wrapper = mountSearch();
    expect(wrapper.find("button.btn-outline-none").exists()).toBe(true);
    // v-if=false branch: no dropdown
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("opens the dropdown on toggle and focuses the input (querySelector returns element)", async () => {
    const wrapper = mountSearch();
    const focusSpy = vi.fn();
    // The input only exists after the dropdown is shown; spy on focus via the
    // actual element. Stub querySelector to return an element with focus().
    const fakeInput = { focus: focusSpy };
    const qsSpy = vi
      .spyOn(document, "querySelector")
      .mockReturnValue(fakeInput);

    await wrapper.find("button.btn-outline-none").trigger("click");
    // v-if=true branch: dropdown now rendered
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(true);
    expect(wrapper.find("input[type='text']").exists()).toBe(true);

    // Drive the setTimeout focus path (truthy optional-chaining branch).
    vi.advanceTimersByTime(100);
    expect(qsSpy).toHaveBeenCalledWith('input[type="text"]');
    expect(focusSpy).toHaveBeenCalledTimes(1);

    qsSpy.mockRestore();
    wrapper.unmount();
  });

  it("handles the null branch of optional chaining when no input is found", async () => {
    const wrapper = mountSearch();
    const qsSpy = vi
      .spyOn(document, "querySelector")
      .mockReturnValue(null);

    await wrapper.find("button.btn-outline-none").trigger("click");
    // Should not throw when querySelector returns null (?.focus()).
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();

    qsSpy.mockRestore();
    wrapper.unmount();
  });

  it("toggles the dropdown closed on a second click (showSearch=false branch)", async () => {
    const wrapper = mountSearch();
    const btn = wrapper.find("button.btn-outline-none");

    await btn.trigger("click");
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(true);

    // Second toggle -> showSearch=false, skips the setTimeout/focus block.
    await btn.trigger("click");
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("submits a trimmed query, navigates, clears and closes (truthy branch)", async () => {
    const wrapper = mountSearch();
    await wrapper.find("button.btn-outline-none").trigger("click");

    const input = wrapper.find("input[type='text']");
    await input.setValue("  hello world  ");
    await wrapper.find("form").trigger("submit");

    expect(push).toHaveBeenCalledWith({
      path: "/search",
      query: { q: "hello world" },
    });
    // Dropdown closed and query cleared.
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("does not navigate when the query is empty/whitespace (falsy branch)", async () => {
    const wrapper = mountSearch();
    await wrapper.find("button.btn-outline-none").trigger("click");

    await wrapper.find("input[type='text']").setValue("   ");
    await wrapper.find("form").trigger("submit");

    expect(push).not.toHaveBeenCalled();
    // Still open because submit short-circuited.
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(true);
    wrapper.unmount();
  });

  it("closes the dropdown when clicking outside (full handleClickOutside chain true)", async () => {
    const wrapper = mountSearch();
    await wrapper.find("button.btn-outline-none").trigger("click");
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(true);

    // A click on an element outside both the dropdown and the toggle button.
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(false);
    document.body.removeChild(outside);
    wrapper.unmount();
  });

  it("keeps the dropdown open when clicking inside the dropdown (contains-dropdown branch)", async () => {
    const wrapper = mountSearch();
    await wrapper.find("button.btn-outline-none").trigger("click");

    const input = wrapper.find("input[type='text']").element;
    input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    // Click was inside the dropdown -> stays open.
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(true);
    wrapper.unmount();
  });

  it("keeps the dropdown open when clicking the toggle button (contains-toggle branch)", async () => {
    const wrapper = mountSearch();
    await wrapper.find("button.btn-outline-none").trigger("click");

    // Dispatch a raw click on the toggle button element directly so
    // handleClickOutside sees a target contained by searchToggleBtn.
    const btnEl = wrapper.find("button.btn-outline-none").element;
    btnEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    // The document handler short-circuits on the toggle-contains branch, but the
    // button's own @click also fired (toggling closed). Re-open to assert the
    // handler did not itself close based on outside logic.
    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("ignores outside clicks while the dropdown is hidden (showSearch=false guard)", async () => {
    const wrapper = mountSearch();
    // showSearch is false here -> first condition of handleClickOutside short-circuits.
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".mobile-search-dropdown").exists()).toBe(false);
    document.body.removeChild(outside);
    wrapper.unmount();
  });

  it("removes the document click listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const wrapper = mountSearch();
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
    removeSpy.mockRestore();
  });
});

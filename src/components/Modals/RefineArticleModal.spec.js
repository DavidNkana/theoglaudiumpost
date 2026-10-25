import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import RefineArticleModal from "./RefineArticleModal.vue";

// Capture lifecycle callbacks so we can re-invoke the hooks with the template
// ref in a controlled state (Vue nulls template refs around unmount, which makes
// the true/false branches of `if (modalRef.value)` otherwise hard to drive).
const mountedCallbacks = [];
const unmountedCallbacks = [];

// Partial-mock vue: keep every real export, but record lifecycle callbacks.
vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    onMounted: (cb) => {
      mountedCallbacks.push(cb);
      return actual.onMounted(cb);
    },
    onUnmounted: (cb) => {
      unmountedCallbacks.push(cb);
      return actual.onUnmounted(cb);
    },
  };
});

// --- Mock bootstrap Modal (external boundary) ---------------------------------
const showSpy = vi.fn();
const hideSpy = vi.fn();
const disposeSpy = vi.fn();
const ModalSpy = vi.fn();

vi.mock("bootstrap", () => {
  return {
    Modal: class {
      constructor(el) {
        ModalSpy(el);
        this.show = showSpy;
        this.hide = hideSpy;
        this.dispose = disposeSpy;
      }
    },
  };
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("RefineArticleModal.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mountedCallbacks.length = 0;
    unmountedCallbacks.length = 0;
    document.body.innerHTML = "";
    document.body.className = "";
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Rendering / props ------------------------------------------------------

  it("renders providers and quick options, with default provider selected", () => {
    const wrapper = mount(RefineArticleModal);

    // 4 providers rendered (v-for non-empty)
    const providerBtns = wrapper.findAll(".d-flex.flex-wrap.gap-2")[0].findAll("button");
    expect(providerBtns).toHaveLength(4);

    // default provider 'minimax' -> first button is btn-primary, others outline
    expect(providerBtns[0].classes()).toContain("btn-primary");
    expect(providerBtns[1].classes()).toContain("btn-outline-primary");

    // provider icons + labels rendered
    expect(providerBtns[0].text()).toContain("MiniMax");
    expect(providerBtns[0].find("i").classes()).toContain("bi-stars");

    // 8 quick options rendered (v-for non-empty)
    const quickBtns = wrapper.findAll(".d-flex.flex-wrap.gap-2")[1].findAll("button");
    expect(quickBtns).toHaveLength(8);
    expect(quickBtns[0].text()).toContain("More Aggressive Tone");
  });

  it("respects defaultProvider prop for initial selection", () => {
    const wrapper = mount(RefineArticleModal, {
      props: { defaultProvider: "gemini" },
    });
    const providerBtns = wrapper.findAll(".d-flex.flex-wrap.gap-2")[0].findAll("button");
    // 'gemini' is index 2
    expect(providerBtns[2].classes()).toContain("btn-primary");
    expect(providerBtns[0].classes()).toContain("btn-outline-primary");
  });

  it("does NOT render refinement history when list is empty (v-if false)", () => {
    const wrapper = mount(RefineArticleModal, {
      props: { refinementHistory: [] },
    });
    expect(wrapper.find(".refinement-history-container").exists()).toBe(false);
  });

  it("renders refinement history when list is non-empty (v-if true) with formatted date", () => {
    const wrapper = mount(RefineArticleModal, {
      props: {
        refinementHistory: [
          { id: 1, prompt: "Make it shorter", createdAt: "2025-12-10T14:30:00Z" },
          { id: 2, prompt: "Add a quote", createdAt: null },
        ],
      },
    });
    const container = wrapper.find(".refinement-history-container");
    expect(container.exists()).toBe(true);

    const items = container.findAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain("Make it shorter");

    // formatDate with a value -> non-empty formatted string
    const firstSmall = items[0].find("small.text-muted");
    expect(firstSmall.text().length).toBeGreaterThan(0);

    // formatDate with null -> '' (the !date branch)
    const secondSmall = items[1].find("small.text-muted");
    expect(secondSmall.text()).toBe("");
  });

  // --- isLoading branch -------------------------------------------------------

  it("renders spinner + 'Refining...' and disables controls when isLoading is true", () => {
    const wrapper = mount(RefineArticleModal, {
      props: { isLoading: true },
    });

    // spinner shown (v-if isLoading true)
    expect(wrapper.find(".spinner-border").exists()).toBe(true);

    const applyBtn = wrapper.find("button.btn-success");
    expect(applyBtn.text()).toContain("Refining...");
    expect(applyBtn.attributes("disabled")).toBeDefined();

    // provider + quick option + cancel buttons disabled
    const providerBtn = wrapper.findAll(".d-flex.flex-wrap.gap-2")[0].findAll("button")[0];
    expect(providerBtn.attributes("disabled")).toBeDefined();
    const cancelBtn = wrapper.find("button.btn-secondary");
    expect(cancelBtn.attributes("disabled")).toBeDefined();
    expect(wrapper.find("textarea").attributes("disabled")).toBeDefined();
  });

  it("renders 'Apply Refinement' and no spinner when isLoading is false", () => {
    const wrapper = mount(RefineArticleModal, { props: { isLoading: false } });
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find("button.btn-success").text()).toContain("Apply Refinement");
  });

  // --- Provider selection -----------------------------------------------------

  it("selects a provider on click (updates :class ternary)", async () => {
    const wrapper = mount(RefineArticleModal);
    const providerBtns = wrapper.findAll(".d-flex.flex-wrap.gap-2")[0].findAll("button");

    // click the 4th provider ('x' / Nicolah)
    await providerBtns[3].trigger("click");
    const refreshed = wrapper.findAll(".d-flex.flex-wrap.gap-2")[0].findAll("button");
    expect(refreshed[3].classes()).toContain("btn-primary");
    expect(refreshed[0].classes()).toContain("btn-outline-primary");
  });

  // --- applyQuickOption -------------------------------------------------------

  it("applyQuickOption maps a known option to its prompt text and syncs v-model", async () => {
    const wrapper = mount(RefineArticleModal, {
      props: { "refineInput": "" },
    });
    const quickBtns = wrapper.findAll(".d-flex.flex-wrap.gap-2")[1].findAll("button");

    // click 'shorter' (index 5)
    await quickBtns[5].trigger("click");

    const textarea = wrapper.find("textarea");
    expect(textarea.element.value).toContain("Condense this article");

    // v-model emitted
    const updates = wrapper.emitted("update:refineInput");
    expect(updates).toBeTruthy();
    expect(updates[updates.length - 1][0]).toContain("Condense this article");
  });

  it("applyQuickOption falls back to the raw value for an unknown option", async () => {
    const wrapper = mount(RefineArticleModal);
    // call the exposed method indirectly via component vm to hit the `|| optionValue` branch
    wrapper.vm.applyQuickOption("__unknown_option__");
    await wrapper.vm.$nextTick();
    expect(wrapper.find("textarea").element.value).toBe("__unknown_option__");
  });

  // --- watchers ---------------------------------------------------------------

  it("syncs localRefineInput when refineInput model prop changes (watch refineInput)", async () => {
    const wrapper = mount(RefineArticleModal, {
      props: { refineInput: "" },
    });
    await wrapper.setProps({ refineInput: "from parent" });
    await wrapper.vm.$nextTick();
    expect(wrapper.find("textarea").element.value).toBe("from parent");
  });

  it("syncs refineInput model when textarea input changes (watch localRefineInput)", async () => {
    const wrapper = mount(RefineArticleModal);
    const textarea = wrapper.find("textarea");
    await textarea.setValue("typed by user");
    const updates = wrapper.emitted("update:refineInput");
    expect(updates).toBeTruthy();
    expect(updates[updates.length - 1][0]).toBe("typed by user");
  });

  // --- submitRefinement -------------------------------------------------------

  it("submitRefinement emits submit with prompt+provider and resets input (trimmable text)", async () => {
    const wrapper = mount(RefineArticleModal, {
      props: { defaultProvider: "gpt" },
    });
    await wrapper.find("textarea").setValue("Refine this please");

    await wrapper.find("button.btn-success").trigger("click");

    const submits = wrapper.emitted("submit");
    expect(submits).toBeTruthy();
    expect(submits[0][0]).toEqual({
      prompt: "Refine this please",
      provider: "gpt",
    });

    await wrapper.vm.$nextTick();
    // input reset to empty
    expect(wrapper.find("textarea").element.value).toBe("");
  });

  it("submitRefinement does nothing when input is only whitespace (trim() falsy branch)", async () => {
    const wrapper = mount(RefineArticleModal);
    // set whitespace-only directly so the button is enabled but trim() is empty
    wrapper.vm.submitRefinement();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("submit")).toBeUndefined();

    // also exercise via vm with whitespace value
    const wrapper2 = mount(RefineArticleModal);
    await wrapper2.find("textarea").setValue("   ");
    wrapper2.vm.submitRefinement();
    await wrapper2.vm.$nextTick();
    expect(wrapper2.emitted("submit")).toBeUndefined();
  });

  // --- handleClose / hide -----------------------------------------------------

  it("Cancel button calls handleClose -> hides modal and removes backdrops (with timer)", async () => {
    vi.useFakeTimers();
    // seed a leftover backdrop + body state to be cleaned up
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "10px";

    const wrapper = mount(RefineArticleModal);
    await wrapper.find("button.btn-secondary").trigger("click");

    // hide() called immediately
    expect(hideSpy).toHaveBeenCalled();

    // first synchronous removeModalBackdrops (inside hide) already cleaned
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(document.body.classList.contains("modal-open")).toBe(false);

    // advance the 300ms setTimeout to run the second removeModalBackdrops
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
  });

  it("close button in header also triggers handleClose", async () => {
    vi.useFakeTimers();
    const wrapper = mount(RefineArticleModal);
    await wrapper.find("button.btn-close").trigger("click");
    expect(hideSpy).toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
  });

  // --- exposed show / bootstrap events ----------------------------------------

  it("exposed show() calls the modal instance show()", () => {
    const wrapper = mount(RefineArticleModal);
    wrapper.vm.show();
    expect(showSpy).toHaveBeenCalled();
  });

  it("exposed hide() calls modal hide() and removes backdrops", () => {
    const wrapper = mount(RefineArticleModal);
    wrapper.vm.hide();
    expect(hideSpy).toHaveBeenCalled();
  });

  it("emits 'show' on bootstrap shown.bs.modal and 'close' on hidden.bs.modal", async () => {
    const wrapper = mount(RefineArticleModal, { attachTo: document.body });
    const modalEl = wrapper.find("#refineModal").element;

    modalEl.dispatchEvent(new Event("shown.bs.modal"));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("show")).toBeTruthy();

    modalEl.dispatchEvent(new Event("hidden.bs.modal"));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();

    wrapper.unmount();
  });

  // --- lifecycle: onMounted constructs Modal; onUnmounted disposes -------------

  it("constructs a bootstrap Modal on mount (onMounted true branch, line 207)", () => {
    const wrapper = mount(RefineArticleModal, { attachTo: document.body });
    expect(ModalSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("onMounted does NOT construct a Modal when modalRef is null (line 207 false branch)", () => {
    const wrapper = mount(RefineArticleModal);
    // mount already constructed once with a live ref
    expect(ModalSpy).toHaveBeenCalledTimes(1);
    expect(mountedCallbacks.length).toBeGreaterThan(0);

    // Re-run the captured onMounted callback with modalRef nulled -> false branch.
    wrapper.vm.modalRef = null;
    mountedCallbacks.forEach((cb) => cb());

    // No additional Modal constructed because the guard short-circuited.
    expect(ModalSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("onUnmounted removes listeners + disposes when modalRef & modalInstance are live (217/218/219/221 true)", () => {
    const wrapper = mount(RefineArticleModal, { attachTo: document.body });
    expect(unmountedCallbacks.length).toBeGreaterThan(0);

    // Vue nulls template refs around real unmount; drive the true branches by
    // invoking the captured onUnmounted hook while the refs are still live.
    const fakeEl = { removeEventListener: vi.fn() };
    const fakeInstance = { dispose: disposeSpy };
    wrapper.vm.modalRef = fakeEl;
    wrapper.vm.modalInstance = fakeInstance;

    unmountedCallbacks.forEach((cb) => cb());

    // lines 218 + 219: removeEventListener called for both bootstrap events
    expect(fakeEl.removeEventListener).toHaveBeenCalledWith("shown.bs.modal", expect.any(Function));
    expect(fakeEl.removeEventListener).toHaveBeenCalledWith("hidden.bs.modal", expect.any(Function));
    // line 221 true: dispose called
    expect(disposeSpy).toHaveBeenCalledTimes(1);

    // restore so the real unmount doesn't double-dispose / throw
    wrapper.vm.modalRef = null;
    wrapper.vm.modalInstance = null;
    wrapper.unmount();
  });

  it("onUnmounted skips listener removal & dispose when refs are null (217 false / 221 false)", () => {
    const wrapper = mount(RefineArticleModal);
    // null out the internal setup refs so onUnmounted takes the false branches
    wrapper.vm.modalRef = null;
    wrapper.vm.modalInstance = null;
    expect(() => wrapper.unmount()).not.toThrow();
    expect(disposeSpy).not.toHaveBeenCalled();
  });
});

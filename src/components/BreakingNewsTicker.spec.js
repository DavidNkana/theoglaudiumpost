import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import BreakingNewsTicker from "@/components/BreakingNewsTicker.vue";

/**
 * requestAnimationFrame is controlled manually so we can step the ticker
 * animation callback deterministically and drive every branch of the loop
 * (the position increment AND the contentWidth-reset path).
 */
let rafCallbacks;
let rafId;
let cancelled;

function flushRaf() {
  // Pull the currently-queued callbacks and run them once. Each run may
  // re-queue a new callback (the animation loop), which we deliberately do
  // NOT run again here so a single flush == a single animation frame.
  const pending = rafCallbacks;
  rafCallbacks = new Map();
  for (const cb of pending.values()) {
    cb();
  }
}

beforeEach(() => {
  rafCallbacks = new Map();
  rafId = 0;
  cancelled = [];

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafId += 1;
    rafCallbacks.set(rafId, cb);
    return rafId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    cancelled.push(id);
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BreakingNewsTicker.vue", () => {
  it("renders a ticker item for every news entry (non-empty v-for branch)", async () => {
    const news = ["Headline one", "Headline two", "Headline three"];
    const wrapper = mount(BreakingNewsTicker, { props: { news } });
    await nextTick();

    expect(wrapper.find(".breaking-label").text()).toBe("BREAKING");

    const items = wrapper.findAll(".ticker-item");
    expect(items).toHaveLength(3);
    expect(items[0].text()).toContain("Headline one");
    expect(items[1].text()).toContain("Headline two");
    expect(items[2].text()).toContain("Headline three");

    // Each item renders the separator span.
    expect(wrapper.findAll(".ticker-separator")).toHaveLength(3);
    expect(wrapper.find(".ticker-separator").text()).toBe("•");

    wrapper.unmount();
  });

  it("renders no ticker items for an empty news array (empty v-for branch)", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: [] } });
    await nextTick();

    expect(wrapper.findAll(".ticker-item")).toHaveLength(0);
    expect(wrapper.find(".ticker-content").exists()).toBe(true);

    wrapper.unmount();
  });

  it("applies the transform style derived from currentPosition", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["A"] } });
    await nextTick();

    const content = wrapper.find(".ticker-content");
    // Initial position is 0.
    expect(content.attributes("style")).toContain("translateX(0px)");

    // Advance currentPosition and assert the bound transform updates.
    wrapper.vm.currentPosition = 42;
    await nextTick();
    expect(wrapper.find(".ticker-content").attributes("style")).toContain(
      "translateX(-42px)"
    );

    wrapper.unmount();
  });

  it("startTicker measures widths and queues an animation frame on mount", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["X", "Y"] } });

    const tickerEl = wrapper.vm.$refs.tickerWrapper;
    // Provide deterministic geometry via the real DOM element.
    Object.defineProperty(tickerEl, "offsetWidth", {
      configurable: true,
      get: () => 100,
    });
    Object.defineProperty(tickerEl, "scrollWidth", {
      configurable: true,
      get: () => 300,
    });

    // mounted() runs startTicker inside $nextTick.
    await nextTick();

    // Re-run startTicker now that geometry is mocked to capture the values.
    wrapper.vm.startTicker();
    expect(wrapper.vm.tickerWidth).toBe(100);
    expect(wrapper.vm.contentWidth).toBe(300);
    expect(wrapper.vm.tickerAnimation).not.toBeNull();
    expect(window.requestAnimationFrame).toHaveBeenCalled();

    wrapper.unmount();
  });

  it("animation increments currentPosition by 0.5 per frame (no reset branch)", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["Item"] } });

    const tickerEl = wrapper.vm.$refs.tickerWrapper;
    Object.defineProperty(tickerEl, "offsetWidth", {
      configurable: true,
      get: () => 50,
    });
    Object.defineProperty(tickerEl, "scrollWidth", {
      configurable: true,
      get: () => 1000,
    });

    await nextTick();
    wrapper.vm.startTicker();
    wrapper.vm.currentPosition = 0;

    // One frame: 0 -> 0.5, no reset because 0.5 < 1000.
    flushRaf();
    expect(wrapper.vm.currentPosition).toBe(0.5);

    // Another frame: 0.5 -> 1.0, still below contentWidth.
    flushRaf();
    expect(wrapper.vm.currentPosition).toBe(1.0);

    wrapper.unmount();
  });

  it("animation resets position to -tickerWidth once content scrolled past (reset branch)", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["Item"] } });

    const tickerEl = wrapper.vm.$refs.tickerWrapper;
    Object.defineProperty(tickerEl, "offsetWidth", {
      configurable: true,
      get: () => 80,
    });
    Object.defineProperty(tickerEl, "scrollWidth", {
      configurable: true,
      get: () => 5,
    });

    await nextTick();
    wrapper.vm.startTicker();

    // contentWidth is 5; force currentPosition near the threshold so the next
    // 0.5 step crosses it (4.5 + 0.5 = 5 >= 5) and triggers the reset branch.
    wrapper.vm.currentPosition = 4.5;
    flushRaf();

    expect(wrapper.vm.currentPosition).toBe(-80); // -tickerWidth

    wrapper.unmount();
  });

  it("startTicker returns early when the ticker ref is missing (guard branch)", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["A"] } });
    // Let the mounted() $nextTick callback (its own startTicker) settle first.
    await nextTick();
    await Promise.resolve();

    // Simulate the ref being absent. $refs is a plain object on the instance;
    // redefine the property as a getter that yields null so the guard trips.
    Object.defineProperty(wrapper.vm.$refs, "tickerWrapper", {
      configurable: true,
      get: () => null,
      set: () => {},
    });
    const rafCallsBefore = window.requestAnimationFrame.mock.calls.length;
    const stopSpy = vi.spyOn(wrapper.vm, "stopTicker");

    wrapper.vm.startTicker();

    // Early return: no stopTicker, no measurement, no new frame scheduled.
    expect(stopSpy).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame.mock.calls.length).toBe(rafCallsBefore);

    wrapper.unmount();
  });

  it("stopTicker cancels an active animation and clears the handle (truthy branch)", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["A"] } });
    await nextTick();
    wrapper.vm.startTicker();

    expect(wrapper.vm.tickerAnimation).not.toBeNull();
    const activeId = wrapper.vm.tickerAnimation;

    wrapper.vm.stopTicker();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(activeId);
    expect(wrapper.vm.tickerAnimation).toBeNull();

    wrapper.unmount();
  });

  it("stopTicker is a no-op when no animation is active (falsy branch)", () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["A"] } });

    wrapper.vm.tickerAnimation = null;
    window.cancelAnimationFrame.mockClear();

    wrapper.vm.stopTicker();

    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
    expect(wrapper.vm.tickerAnimation).toBeNull();

    wrapper.unmount();
  });

  it("handleResize restarts the ticker", async () => {
    const wrapper = mount(BreakingNewsTicker, { props: { news: ["A"] } });
    await nextTick();

    const startSpy = vi.spyOn(wrapper.vm, "startTicker");
    wrapper.vm.handleResize();

    expect(startSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it("registers a resize listener on mount and removes it on unmount", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const wrapper = mount(BreakingNewsTicker, { props: { news: ["A"] } });
    await nextTick();

    expect(addSpy).toHaveBeenCalledWith("resize", wrapper.vm.handleResize);

    const handler = wrapper.vm.handleResize;
    wrapper.unmount();

    // beforeUnmount stops the ticker and removes the resize listener.
    expect(removeSpy).toHaveBeenCalledWith("resize", handler);
  });
});

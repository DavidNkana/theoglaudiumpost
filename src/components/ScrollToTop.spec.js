import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ScrollToTop from "@/components/ScrollToTop.vue";

describe("ScrollToTop", () => {
  let addEventSpy;
  let removeEventSpy;
  let scrollToSpy;

  beforeEach(() => {
    addEventSpy = vi.spyOn(window, "addEventListener");
    removeEventSpy = vi.spyOn(window, "removeEventListener");
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    // Reset scroll positions to a known state.
    Object.defineProperty(window, "pageYOffset", {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollTop", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the scroll listener on mount and runs the initial check (below threshold => hidden)", () => {
    const wrapper = mount(ScrollToTop);

    // onMounted attached the scroll listener.
    expect(addEventSpy).toHaveBeenCalledWith("scroll", expect.any(Function));

    // Initial check ran with pageYOffset = 0 (below 300 threshold) => not visible.
    const btn = wrapper.find("button.scroll-top-btn");
    expect(btn.exists()).toBe(true);
    // v-show false => display:none applied to the element.
    expect(btn.element.style.display).toBe("none");
    expect(btn.attributes("aria-label")).toBe("Scroll to top");
    expect(wrapper.find("i.bi.bi-arrow-up").exists()).toBe(true);
  });

  it("uses pageYOffset branch and shows the button once scrolled past the threshold", async () => {
    window.pageYOffset = 350; // above threshold (300), truthy => uses this branch
    const wrapper = mount(ScrollToTop);
    await wrapper.vm.$nextTick();

    const btn = wrapper.find("button.scroll-top-btn");
    // v-show true => display is NOT none.
    expect(btn.element.style.display).not.toBe("none");
  });

  it("falls back to documentElement.scrollTop when pageYOffset is falsy", async () => {
    window.pageYOffset = 0; // falsy => fall through to documentElement.scrollTop
    document.documentElement.scrollTop = 500; // above threshold
    const wrapper = mount(ScrollToTop);
    await wrapper.vm.$nextTick();

    const btn = wrapper.find("button.scroll-top-btn");
    expect(btn.element.style.display).not.toBe("none");
  });

  it("toggles visibility reactively when the scroll handler fires", async () => {
    const wrapper = mount(ScrollToTop);

    // Grab the handler registered for the "scroll" event.
    const scrollCall = addEventSpy.mock.calls.find((c) => c[0] === "scroll");
    expect(scrollCall).toBeTruthy();
    const handler = scrollCall[1];

    // Scroll past threshold -> becomes visible.
    window.pageYOffset = 400;
    handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find("button.scroll-top-btn").element.style.display).not.toBe(
      "none"
    );

    // Scroll back below threshold -> hidden again.
    window.pageYOffset = 10;
    document.documentElement.scrollTop = 0;
    handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find("button.scroll-top-btn").element.style.display).toBe(
      "none"
    );
  });

  it("scrolls smoothly to the top when the button is clicked", async () => {
    window.pageYOffset = 800; // make the button visible so it is interactable
    const wrapper = mount(ScrollToTop);
    await wrapper.vm.$nextTick();

    await wrapper.find("button.scroll-top-btn").trigger("click");

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("removes the scroll listener on unmount", () => {
    const wrapper = mount(ScrollToTop);
    wrapper.unmount();

    expect(removeEventSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

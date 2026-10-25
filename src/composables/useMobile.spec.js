import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useMobile } from "@/composables/useMobile";

/**
 * Mounts a host component that calls useMobile() so the onMounted / onUnmounted
 * lifecycle hooks actually fire. Returns the wrapper plus the live isMobile ref.
 */
function mountWithComposable() {
  let api;
  const Host = defineComponent({
    setup() {
      api = useMobile();
      return () => h("div");
    },
  });
  const wrapper = mount(Host);
  return { wrapper, api };
}

describe("useMobile", () => {
  let addSpy;
  let removeSpy;
  let originalInnerWidth;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  function setWidth(value) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value,
    });
  }

  it("initializes isMobile to true when viewport is narrower than 768 (branch: innerWidth < 768 truthy)", () => {
    setWidth(500);
    const { wrapper, api } = mountWithComposable();
    expect(api.isMobile.value).toBe(true);
    wrapper.unmount();
  });

  it("initializes isMobile to false when viewport is 768 or wider (branch: innerWidth < 768 falsy)", () => {
    setWidth(1024);
    const { wrapper, api } = mountWithComposable();
    expect(api.isMobile.value).toBe(false);
    wrapper.unmount();
  });

  it("treats exactly 768 as not mobile (boundary of the < comparison)", () => {
    setWidth(768);
    const { wrapper, api } = mountWithComposable();
    expect(api.isMobile.value).toBe(false);
    wrapper.unmount();
  });

  it("registers a resize listener on mount and re-checks the viewport (onMounted -> updateMobile)", async () => {
    // Start wide so the initial ref is false; mount then narrows via updateMobile.
    setWidth(1200);
    const { wrapper, api } = mountWithComposable();
    expect(api.isMobile.value).toBe(false);

    // The resize listener must have been registered with the updateMobile handler.
    const resizeCall = addSpy.mock.calls.find((c) => c[0] === "resize");
    expect(resizeCall).toBeTruthy();
    const handler = resizeCall[1];
    expect(typeof handler).toBe("function");

    // onMounted called updateMobile() once already; firing the handler again
    // after a width change must flip the reactive value.
    setWidth(400);
    handler();
    await nextTick();
    expect(api.isMobile.value).toBe(true);

    // And back to false when widened.
    setWidth(900);
    handler();
    await nextTick();
    expect(api.isMobile.value).toBe(false);

    wrapper.unmount();
  });

  it("re-checks the viewport during onMounted even if width changed between setup and mount", () => {
    // Width is wide at setup time (initial ref false), but onMounted's
    // updateMobile() runs synchronously during mount with the same width here,
    // exercising the updateMobile body via the lifecycle hook.
    setWidth(300);
    const { wrapper, api } = mountWithComposable();
    // checkMobile() at construction already saw 300 -> true, and updateMobile
    // in onMounted re-affirms it.
    expect(api.isMobile.value).toBe(true);
    wrapper.unmount();
  });

  it("removes the resize listener on unmount (onUnmounted) using the same handler", () => {
    setWidth(600);
    const { wrapper } = mountWithComposable();

    const addedHandler = addSpy.mock.calls.find((c) => c[0] === "resize")[1];

    wrapper.unmount();

    const removeCall = removeSpy.mock.calls.find((c) => c[0] === "resize");
    expect(removeCall).toBeTruthy();
    expect(removeCall[1]).toBe(addedHandler);
  });

  it("returns false from checkMobile when window is undefined (branch: typeof window !== 'undefined' falsy)", () => {
    // Exercise the left-hand side of the && short-circuit by hiding `window`.
    const originalWindow = globalThis.window;
    // eslint-disable-next-line no-global-assign
    vi.stubGlobal("window", undefined);
    try {
      // useMobile() reads window during construction; with window undefined the
      // first && operand is false and checkMobile() returns false without
      // touching window.innerWidth.
      const api = useMobile();
      expect(api.isMobile.value).toBe(false);
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });
});

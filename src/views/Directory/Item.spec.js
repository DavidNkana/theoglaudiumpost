import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";

// Stable route mock so useRoute() returns a controllable object.
const route = { params: { slug: "sample-business" } };
vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

import Item from "@/views/Directory/Item.vue";

function mountItem() {
  return mount(Item, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("Directory/Item.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the loading spinner before data resolves", () => {
    const wrapper = mountItem();
    // isLoading is true initially => v-if branch renders.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading business details...");
    // The success/error branches are absent while loading.
    expect(wrapper.find(".card-title").exists()).toBe(false);
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
    // The Back-to-Directory router-link renders in every state.
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe("/directory");
  });

  it("renders the full business listing after the timeout resolves (success + all social links)", async () => {
    const wrapper = mountItem();

    // Advance past the 1000ms setTimeout in onMounted.
    vi.advanceTimersByTime(1000);
    await flushPromises();

    // Loading branch gone, success (v-else-if="item") branch present.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".card-title").text()).toBe("Sample Business");
    expect(wrapper.find(".badge").text()).toBe("Services");
    expect(wrapper.text()).toContain("123 Main Street, Laudium");
    expect(wrapper.text()).toContain("(123) 456-7890");
    expect(wrapper.text()).toContain("contact@samplebusiness.com");

    // Website anchor uses the item's website href.
    const websiteLink = wrapper
      .findAll("a")
      .find((a) => a.attributes("href") === "https://www.example.com");
    expect(websiteLink).toBeTruthy();

    // socialMedia block present (v-if="item.socialMedia") with all three links
    // (each inner v-if truthy).
    expect(wrapper.text()).toContain("Connect With Us");
    const fb = wrapper
      .findAll("a")
      .find((a) => a.attributes("href") === "https://facebook.com/samplebusiness");
    const tw = wrapper
      .findAll("a")
      .find((a) => a.attributes("href") === "https://twitter.com/samplebusiness");
    const ig = wrapper
      .findAll("a")
      .find((a) => a.attributes("href") === "https://instagram.com/samplebusiness");
    expect(fb).toBeTruthy();
    expect(tw).toBeTruthy();
    expect(ig).toBeTruthy();

    // Static side panels still render.
    expect(wrapper.text()).toContain("Reviews");
    expect(wrapper.text()).toContain("Location");
    expect(wrapper.text()).toContain("Contact Business");
    expect(wrapper.text()).toContain("Similar Businesses");

    // Error branch absent on success.
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
  });

  it("renders the not-found error branch when setTimeout throws (catch path, isLoading cleared)", async () => {
    // Force the try body to throw so the catch block executes and item stays null.
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(() => {
        throw new Error("boom");
      });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountItem();
    await flushPromises();

    // catch ran: console.error logged, isLoading=false, item still null
    // => v-else (error) branch renders.
    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching directory item:",
      expect.any(Error)
    );
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".card-title").exists()).toBe(false);
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
    expect(wrapper.text()).toContain("Business not found.");

    setTimeoutSpy.mockRestore();
  });
});

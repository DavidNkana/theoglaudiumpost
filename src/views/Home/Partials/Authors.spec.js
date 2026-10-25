import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Authors from "@/views/Home/Partials/Authors.vue";

/**
 * Authors.vue is a static placeholder component: it has an empty <script setup>
 * (no imports, props, state, computed, methods, watchers, or branches) and a
 * template that renders the literal text "authors here". There are no external
 * boundaries to mock and no conditional/loop branches to exercise. These tests
 * assert the real rendered output so the whole (trivial) file is covered.
 */
describe("Home/Partials/Authors.vue", () => {
  it("mounts without errors", async () => {
    const wrapper = mount(Authors);
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the placeholder author text", () => {
    const wrapper = mount(Authors);
    expect(wrapper.text()).toBe("authors here");
  });
});

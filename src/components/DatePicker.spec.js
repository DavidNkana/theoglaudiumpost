import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

// Mock the dev logger so we don't depend on @/config/env and to keep output clean.
vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// Stub the flatpickr CSS side-effect imports (jsdom can't parse them).
vi.mock("flatpickr/dist/flatpickr.css", () => ({}));
vi.mock("flatpickr/dist/themes/material_blue.css", () => ({}));

// Replace the real flatpickr wrapper with a minimal v-model-capable stub so we
// can drive `internalRange` from the "input" side via the rendered element.
vi.mock("vue-flatpickr-component", () => ({
  default: {
    name: "FlatPickr",
    props: ["modelValue", "config"],
    emits: ["update:modelValue"],
    template:
      '<input class="flat-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}));

import DatePicker from "@/components/DatePicker.vue";
import { devLog } from "@/utils/devLog";

function factory(modelValue = []) {
  return mount(DatePicker, { props: { modelValue } });
}

describe("DatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the flatpickr input and the clear button", () => {
    const wrapper = factory();
    expect(wrapper.find(".flat-stub").exists()).toBe(true);
    expect(wrapper.find("button[data-clear]").exists()).toBe(true);
    expect(wrapper.find("i.bi-x").exists()).toBe(true);
  });

  it("passes the range config to flatpickr", () => {
    const wrapper = factory();
    const cfg = wrapper.findComponent({ name: "FlatPickr" }).props("config");
    expect(cfg).toMatchObject({
      wrap: true,
      mode: "range",
      dateFormat: "Y-m-d",
      time_24hr: true,
    });
  });

  it("initialises internalRange from the modelValue prop", () => {
    const wrapper = factory(["2026-01-01"]);
    expect(wrapper.find(".flat-stub").element.value).toBe("2026-01-01");
  });

  // --- modelValue watcher branch: val[1] truthy (range) ---
  it("formats a range with 'to' when the prop becomes a two-element array", async () => {
    const wrapper = factory();
    await wrapper.setProps({ modelValue: ["2026-01-01", "2026-01-31"] });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".flat-stub").element.value).toBe(
      "2026-01-01 to 2026-01-31"
    );
    expect(devLog.info).toHaveBeenCalledWith("modelValue", [
      "2026-01-01",
      "2026-01-31",
    ]);
  });

  // --- modelValue watcher branch: val[1] falsy (single date) ---
  it("uses the single date when the prop becomes a one-element array", async () => {
    const wrapper = factory();
    await wrapper.setProps({ modelValue: ["2026-02-15"] });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".flat-stub").element.value).toBe("2026-02-15");
  });

  // --- internalRange watcher branch: string contains "to" -> split ---
  it("emits a split array when the input value contains 'to'", async () => {
    const wrapper = factory();
    const input = wrapper.find(".flat-stub");
    input.element.value = "2026-03-01 to 2026-03-10";
    await input.trigger("input");
    const events = wrapper.emitted("update:modelValue");
    expect(events[events.length - 1][0]).toEqual([
      "2026-03-01",
      "2026-03-10",
    ]);
  });

  // --- internalRange watcher branch: string without "to" -> [val, null] ---
  it("emits [value, null] when the input value has no 'to'", async () => {
    const wrapper = factory();
    const input = wrapper.find(".flat-stub");
    input.element.value = "2026-04-05";
    await input.trigger("input");
    const events = wrapper.emitted("update:modelValue");
    expect(events[events.length - 1][0]).toEqual(["2026-04-05", null]);
  });

  // --- internalRange watcher branch: optional chaining on null (clearDate) ---
  it("clearing emits [null, null] (null path through optional chaining)", async () => {
    const wrapper = factory(["2026-05-01"]);
    await wrapper.find("button[data-clear]").trigger("click");
    await wrapper.vm.$nextTick();
    const events = wrapper.emitted("update:modelValue");
    expect(events[events.length - 1][0]).toEqual([null, null]);
    expect(devLog.info).toHaveBeenCalledWith("update:modelValue", [null, null]);
  });

  it("resets the input element when cleared", async () => {
    const wrapper = factory(["2026-06-01"]);
    expect(wrapper.find(".flat-stub").element.value).toBe("2026-06-01");
    await wrapper.find("button[data-clear]").trigger("click");
    await wrapper.vm.$nextTick();
    // null model renders as an empty input value
    expect(wrapper.find(".flat-stub").element.value).toBe("");
  });
});

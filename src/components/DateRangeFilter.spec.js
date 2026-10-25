import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import DateRangeFilter from "@/components/DateRangeFilter.vue";

function lastEmit(wrapper) {
  const events = wrapper.emitted("filter-changed");
  return events[events.length - 1][0];
}

describe("DateRangeFilter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to the 'month' filter and emits on mount", () => {
    // Fixed date so formatDate output is deterministic and exercises
    // the two-digit (no-pad) padStart path for month/day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-15T12:00:00Z"));

    const wrapper = mount(DateRangeFilter);

    // Month button is active, the others are outline.
    const buttons = wrapper.findAll("button");
    expect(buttons[1].classes()).toContain("btn-success");
    expect(buttons[0].classes()).toContain("btn-outline-success");
    expect(buttons[2].classes()).toContain("btn-outline-success");

    // Custom inputs are hidden (v-if false branch).
    expect(wrapper.find("input[type='date']").exists()).toBe(false);

    // onMounted applied the initial 'month' filter.
    const payload = lastEmit(wrapper);
    expect(payload.filter).toBe("month");
    // end is today; start is 30 days earlier.
    expect(payload.endDate).toBe("2023-11-15");
    expect(payload.startDate).toBe("2023-10-16");
  });

  it("honors the initialFilter prop ('week') and computes a 7-day range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-10T08:00:00Z"));

    const wrapper = mount(DateRangeFilter, {
      props: { initialFilter: "week" },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons[0].classes()).toContain("btn-success");
    expect(buttons[1].classes()).toContain("btn-outline-success");

    const payload = lastEmit(wrapper);
    expect(payload.filter).toBe("week");
    expect(payload.endDate).toBe("2024-03-10");
    expect(payload.startDate).toBe("2024-03-03");
  });

  it("switches to 'week' via setFilter and re-emits (non-custom branch)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T00:00:00Z"));

    const wrapper = mount(DateRangeFilter);
    const buttons = wrapper.findAll("button");

    await buttons[0].trigger("click"); // Week

    const payload = lastEmit(wrapper);
    expect(payload.filter).toBe("week");
    expect(payload.endDate).toBe("2024-01-20");
    expect(payload.startDate).toBe("2024-01-13");
    // Active class moved to the week button.
    expect(buttons[0].classes()).toContain("btn-success");
  });

  it("re-applies the month filter via setFilter", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-31T00:00:00Z"));

    const wrapper = mount(DateRangeFilter, { props: { initialFilter: "week" } });
    const buttons = wrapper.findAll("button");

    await buttons[1].trigger("click"); // Month

    const payload = lastEmit(wrapper);
    expect(payload.filter).toBe("month");
    expect(payload.endDate).toBe("2024-01-31");
    expect(payload.startDate).toBe("2024-01-01");
  });

  it("reveals custom inputs without emitting when 'custom' is selected", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-05T00:00:00Z"));

    const wrapper = mount(DateRangeFilter);
    const emittedBefore = wrapper.emitted("filter-changed").length;
    const buttons = wrapper.findAll("button");

    await buttons[2].trigger("click"); // Custom -> setFilter custom branch: no applyFilter

    // No new emit because filter === 'custom'.
    expect(wrapper.emitted("filter-changed").length).toBe(emittedBefore);

    // v-if true branch: custom date inputs + Apply button now rendered.
    const dateInputs = wrapper.findAll("input[type='date']");
    expect(dateInputs).toHaveLength(2);
    expect(buttons[2].classes()).toContain("btn-success");
  });

  it("falls through the filter chain for an unknown initialFilter", () => {
    // An initialFilter that is neither week/month/custom drives the FALSE
    // edge of the `else if (activeFilter === 'custom')` branch in applyFilter:
    // start and end both remain `new Date()` (today).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-04T00:00:00Z"));

    const wrapper = mount(DateRangeFilter, { props: { initialFilter: "year" } });

    // No toggle button is active; custom panel stays hidden.
    const buttons = wrapper.findAll("button");
    buttons.forEach((b) => expect(b.classes()).toContain("btn-outline-success"));
    expect(wrapper.find("input[type='date']").exists()).toBe(false);

    const payload = lastEmit(wrapper);
    expect(payload.filter).toBe("year");
    expect(payload.startDate).toBe("2024-07-04");
    expect(payload.endDate).toBe("2024-07-04");
  });

  it("applies a custom range from the chosen dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-05T00:00:00Z"));

    const wrapper = mount(DateRangeFilter, { props: { initialFilter: "custom" } });

    // Custom view is shown immediately.
    const dateInputs = wrapper.findAll("input[type='date']");
    expect(dateInputs).toHaveLength(2);

    await dateInputs[0].setValue("2023-01-02");
    await dateInputs[1].setValue("2023-02-09");

    // Click Apply (the success button inside the custom panel) ->
    // applyCustomFilter -> applyFilter custom branch.
    const applyBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Apply");
    await applyBtn.trigger("click");

    const payload = lastEmit(wrapper);
    expect(payload.filter).toBe("custom");
    expect(payload.startDate).toBe("2023-01-02");
    expect(payload.endDate).toBe("2023-02-09");
  });
});

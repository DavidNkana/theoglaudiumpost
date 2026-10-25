import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Mocks for every external boundary Dashboard.vue imports.
//
//  - chart.js/auto  -> the default export is `new`ed in onMounted; replace it
//    with a spy constructor so we can assert it is invoked once per canvas and
//    so no real Canvas2D context is required under jsdom.
//  - vue-router     -> useRouter() is called at setup; expose a push spy.
//  - @/composables/useAuth -> auth boundary, returns a benign object.
// ---------------------------------------------------------------------------

const chartCtorSpy = vi.fn();
vi.mock("chart.js/auto", () => ({
  default: class {
    constructor(...args) {
      chartCtorSpy(...args);
    }
  },
}));

const pushSpy = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

const useAuthSpy = vi.fn(() => ({ user: { value: null } }));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => useAuthSpy(),
}));

import Dashboard from "@/views/Business/Dashboard.vue";

function factory() {
  return mount(Dashboard, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  chartCtorSpy.mockClear();
  pushSpy.mockClear();
  useAuthSpy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Business/Dashboard.vue", () => {
  it("calls useAuth and useRouter during setup", () => {
    const wrapper = factory();
    expect(useAuthSpy).toHaveBeenCalledTimes(1);
    // router.push not called on mount
    expect(pushSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("initialises both charts on mount when the canvas refs resolve", () => {
    const wrapper = factory();
    // Two canvases: performance (line) + distribution (doughnut).
    expect(chartCtorSpy).toHaveBeenCalledTimes(2);

    const [perfArgs, distArgs] = chartCtorSpy.mock.calls;
    // First call -> performance line chart on the performanceChart canvas.
    expect(perfArgs[0]).toBeInstanceOf(HTMLCanvasElement);
    expect(perfArgs[1].type).toBe("line");
    expect(perfArgs[1].data.datasets).toHaveLength(2);
    expect(perfArgs[1].data.datasets[0].label).toBe("Impressions");
    expect(perfArgs[1].data.datasets[1].label).toBe("Clicks");

    // Second call -> distribution doughnut chart.
    expect(distArgs[0]).toBeInstanceOf(HTMLCanvasElement);
    expect(distArgs[1].type).toBe("doughnut");
    expect(distArgs[1].data.labels).toEqual(["Desktop", "Mobile", "Tablet"]);

    wrapper.unmount();
  });

  it("renders the dashboard overview by default (activePage='dashboard')", () => {
    const wrapper = factory();

    expect(wrapper.find("h1.h2").text()).toBe("Dashboard");

    // Stats cards
    const text = wrapper.text();
    expect(text).toContain("Impressions (Monthly)");
    expect(text).toContain((125478).toLocaleString());
    expect(text).toContain("Clicks (Monthly)");
    expect(text).toContain((3842).toLocaleString());
    expect(text).toContain("CTR");
    expect(text).toContain(((3842 / 125478) * 100).toFixed(2));
    expect(text).toContain("Spending (Monthly)");
    expect(text).toContain(`R${(12500).toLocaleString()}`);

    // Campaigns + analytics sub-pages are hidden by default.
    expect(text).not.toContain("Your Advertising Campaigns");
    expect(text).not.toContain("Campaign Analytics");

    wrapper.unmount();
  });

  it("renders one table row per active campaign with the correct badge variant", () => {
    const wrapper = factory();

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(3);

    // Active campaigns -> bg-success badge; Scheduled -> bg-warning badge.
    const activeBadges = wrapper.findAll("td .badge.bg-success");
    const scheduledBadges = wrapper.findAll("td .badge.bg-warning");
    expect(activeBadges).toHaveLength(2);
    expect(scheduledBadges).toHaveLength(1);

    expect(activeBadges[0].text()).toBe("Active");
    expect(scheduledBadges[0].text()).toBe("Scheduled");

    // Spot-check rendered campaign data (name, budget formatting).
    expect(rows[0].text()).toContain("Summer Sale Promotion");
    expect(rows[0].text()).toContain(`R${(5000).toLocaleString()}`);

    wrapper.unmount();
  });

  it("navigates to the new-campaign route when New Campaign is clicked", async () => {
    const wrapper = factory();

    const newBtn = wrapper.find("button.btn-primary");
    expect(newBtn.text()).toContain("New Campaign");
    await newBtn.trigger("click");

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith("/business/campaigns/new");

    wrapper.unmount();
  });

  it("navigates to the edit route when a row edit button is clicked", async () => {
    const wrapper = factory();

    const editBtn = wrapper.find("tbody tr .btn-primary");
    await editBtn.trigger("click");

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith("/business/campaigns/1/edit");

    wrapper.unmount();
  });

  it("pauses a known campaign, flipping its badge to the scheduled variant", async () => {
    const wrapper = factory();

    // Row 0 is "Summer Sale Promotion" -> currently Active (bg-success).
    let firstRow = wrapper.findAll("tbody tr")[0];
    expect(firstRow.find(".badge.bg-success").exists()).toBe(true);

    const pauseBtn = firstRow.find(".btn-danger");
    await pauseBtn.trigger("click");
    await flushPromises();

    firstRow = wrapper.findAll("tbody tr")[0];
    // Status flipped to "Scheduled" => bg-warning badge.
    expect(firstRow.find(".badge.bg-warning").exists()).toBe(true);
    expect(firstRow.find(".badge.bg-success").exists()).toBe(false);
    expect(firstRow.find(".badge").text()).toBe("Scheduled");

    wrapper.unmount();
  });

  it("pauseCampaign is a no-op when the id does not match any campaign", () => {
    const wrapper = factory();

    // Snapshot statuses, call with an unknown id, assert nothing changed.
    const before = wrapper.findAll("tbody tr").map((r) => r.find(".badge").text());
    wrapper.vm.pauseCampaign(9999);
    const after = wrapper.findAll("tbody tr").map((r) => r.find(".badge").text());

    expect(after).toEqual(before);
    expect(after).toEqual(["Active", "Active", "Scheduled"]);

    wrapper.unmount();
  });

  it("renders the campaigns sub-page when activePage='campaigns'", async () => {
    const wrapper = factory();

    wrapper.vm.activePage = "campaigns";
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain("Your Advertising Campaigns");
    expect(text).toContain("Campaign management interface is loading");
    // Other sub-pages hidden.
    expect(text).not.toContain("Campaign Analytics");

    wrapper.unmount();
  });

  it("renders the analytics sub-page when activePage='analytics'", async () => {
    const wrapper = factory();

    wrapper.vm.activePage = "analytics";
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain("Campaign Analytics");
    expect(text).toContain("Analytics interface is loading");
    expect(text).not.toContain("Your Advertising Campaigns");

    wrapper.unmount();
  });
});

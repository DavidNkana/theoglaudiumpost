import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock bootstrap Modal (external boundary) ---------------------------------
const showSpy = vi.fn();
const hideSpy = vi.fn();
const ModalSpy = vi.fn();

vi.mock("bootstrap", () => ({
  Modal: class {
    constructor(el) {
      ModalSpy(el);
      this.show = showSpy;
      this.hide = hideSpy;
    }
  },
}));

// --- Mock lodash debounce: run synchronously so watchers are deterministic ----
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    wrapped.flush = vi.fn();
    return wrapped;
  },
}));

// --- Mock services ------------------------------------------------------------
const getCampaigns = vi.fn();
const removeCampaign = vi.fn();
vi.mock("@/features/ads/AdsService", () => ({
  removeCampaign: (...a) => removeCampaign(...a),
}));
vi.mock("@/features/businesses/BusinessesService", () => ({
  getCampaigns: (...a) => getCampaigns(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ query: routeQuery }),
}));

import Index from "./Index.vue";

const makeCampaign = (id, name = `Campaign ${id}`) => ({ id, name });

const okResponse = (overrides = {}) => ({
  status: 200,
  data: {
    page: 0,
    size: 10,
    totalPages: 3,
    ...overrides,
  },
});

// The component assigns campaigns.value = response.data, then later renders
// `campaigns ?? []`. response.data is an object (truthy) so to also have a list
// we attach array-index entries OR we mutate vm.campaigns after mount. We keep
// the response object shape for pagination and seed list entries via vm where a
// list is needed.

const mountView = () =>
  mount(Index, {
    global: {
      stubs: {
        CampaignsTable: true,
        CampaignForm: true,
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });

beforeEach(() => {
  vi.clearAllMocks();
  routeQuery = {};
  getCampaigns.mockResolvedValue(okResponse());
  removeCampaign.mockResolvedValue({});
  document.body.innerHTML = "";
  // Silence expected console.error noise from catch paths.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Business/Campaigns/Index.vue", () => {
  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches campaigns (success, defaults)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getCampaigns).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });
    expect(ModalSpy).toHaveBeenCalledTimes(2);

    expect(wrapper.findComponent({ name: "CampaignsTable" }).exists()).toBe(true);
    // totalPages (total) = 3 > 0 -> pagination nav visible
    expect(
      wrapper.find('nav[aria-label="campaigns pagination"]').exists()
    ).toBe(true);
    wrapper.unmount();
  });

  it("initializes from populated query params (truthy branches)", async () => {
    routeQuery = {
      search: "hello",
      status: "active",
      page: "2",
      size: "25",
    };
    const wrapper = mountView();
    await flushPromises();

    expect(getCampaigns).toHaveBeenCalledWith({
      page: 2,
      search: "hello",
      size: 25,
      status: "active",
    });
    expect(wrapper.vm.filters.search).toBe("hello");
    expect(wrapper.vm.filters.status).toBe("active");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCampaigns: non-200 -> throw -> catch
  // ---------------------------------------------------------------------------
  it("logs an error when response status is not 200", async () => {
    getCampaigns.mockResolvedValue({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching campaigns:",
      expect.any(Error)
    );
    expect(wrapper.vm.loading).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCampaigns: rejected promise -> catch
  // ---------------------------------------------------------------------------
  it("logs an error when getCampaigns rejects", async () => {
    getCampaigns.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching campaigns:",
      expect.any(Error)
    );
    expect(wrapper.vm.loading).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCampaigns: early return when already loading (loading guard)
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getCampaigns.mockImplementation(
      () => new Promise((res) => { resolveFn = res; })
    );
    const wrapper = mountView();
    await nextTick();
    expect(getCampaigns).toHaveBeenCalledTimes(1);

    // changeStatus -> fetchCampaigns while loading === true -> early return
    wrapper.vm.changeStatus("active");
    expect(getCampaigns).toHaveBeenCalledTimes(1);

    resolveFn(okResponse());
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete found + deleteCampaign success
  // ---------------------------------------------------------------------------
  it("confirms and deletes a campaign successfully", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(1), makeCampaign(2)];
    await nextTick();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedCampaign.id).toBe(1);

    await wrapper.vm.deleteCampaign();
    await flushPromises();

    expect(removeCampaign).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.campaigns.map((c) => c.id)).toEqual([2]);
    expect(wrapper.vm.selectedCampaign).toBe(null);
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete not found (selectedCampaign undefined -> show not called)
  // ---------------------------------------------------------------------------
  it("confirmDelete with unknown id does not open modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(1)];
    await nextTick();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(999);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteCampaign: reject -> catch -> alert
  // ---------------------------------------------------------------------------
  it("alerts when removeCampaign rejects", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(1)];
    wrapper.vm.selectedCampaign = makeCampaign(1);
    await nextTick();

    removeCampaign.mockRejectedValue(new Error("delete failed"));
    await wrapper.vm.deleteCampaign();
    await flushPromises();

    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete ad. Please try again."
    );
    expect(wrapper.vm.isDeleting).toBe(false);
    alertSpy.mockRestore();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // handlePreview: found + not found
  // ---------------------------------------------------------------------------
  it("handlePreview shows form modal when campaign exists and not otherwise", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(3)];
    await nextTick();
    showSpy.mockClear();

    wrapper.vm.handlePreview(3);
    expect(wrapper.vm.selectedCampaign.id).toBe(3);
    expect(showSpy).toHaveBeenCalled();

    showSpy.mockClear();
    wrapper.vm.handlePreview(404);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openCreateModal -> show
  // ---------------------------------------------------------------------------
  it("openCreateModal shows the form modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openCreateModal();
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openUpdateModal found + not found
  // ---------------------------------------------------------------------------
  it("openUpdateModal selects campaign and shows modal when it exists", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(2)];
    await nextTick();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(2);
    expect(wrapper.vm.selectedCampaign.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("openUpdateModal does nothing when campaign does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(2)];
    await nextTick();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(98765);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm via CampaignForm @close emit
  // ---------------------------------------------------------------------------
  it("closeForm hides modal and clears selection", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.findComponent({ name: "CampaignForm" }).vm.$emit("close");
    await nextTick();

    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedCampaign).toBe(null);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // addCampaign via CampaignForm @add-campaign emit -> prepends
  // ---------------------------------------------------------------------------
  it("addCampaign prepends a new campaign", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(1)];
    await nextTick();

    wrapper
      .findComponent({ name: "CampaignForm" })
      .vm.$emit("add-campaign", makeCampaign(99, "New"));
    await nextTick();

    expect(wrapper.vm.campaigns[0].id).toBe(99);
    expect(wrapper.vm.campaigns.map((c) => c.id)).toEqual([99, 1]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // updateCampaign via @update-campaign: matching + non-matching branches
  // ---------------------------------------------------------------------------
  it("updateCampaign updates the matching campaign and leaves others unchanged", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(1), makeCampaign(2)];
    await nextTick();

    wrapper
      .findComponent({ name: "CampaignForm" })
      .vm.$emit("update-campaign", { id: 2, name: "Updated 2" });
    await nextTick();

    const names = wrapper.vm.campaigns.map((c) => c.name);
    expect(names).toContain("Updated 2"); // matched branch
    expect(names).toContain("Campaign 1"); // non-matched branch
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: out of range (low + high) + valid
  // ---------------------------------------------------------------------------
  it("changePage ignores out-of-range pages and fetches for valid pages", async () => {
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();

    // last_page = totalPages - 1 = 3 - 1 = 2
    wrapper.vm.changePage(-1); // page < 0
    wrapper.vm.changePage(99); // page > last_page
    expect(getCampaigns).not.toHaveBeenCalled();

    getCampaigns.mockResolvedValue(okResponse({ page: 1, totalPages: 3 }));
    wrapper.vm.changePage(1); // valid
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // getPageNumbers: span >= 4 (no recompute) via clickable page links
  // ---------------------------------------------------------------------------
  it("renders page-number links and navigates via clicks", async () => {
    getCampaigns.mockResolvedValue(okResponse({ page: 5, totalPages: 10 }));
    routeQuery = { page: "5" };
    const wrapper = mountView();
    await flushPromises();

    const numbered = wrapper
      .findAll("ul.pagination li")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    expect(numbered.length).toBeGreaterThan(0);

    getCampaigns.mockClear();
    await numbered[0].find("a").trigger("click");
    await flushPromises();
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("covers getPageNumbers startPage recompute when near the end", async () => {
    // currentPage = page+1 = 10, lastPage(total) = 10
    // startPage = max(1, 8) = 8, endPage = min(10, 12) = 10, span = 2 < 4
    // -> startPage = max(1, 6) = 6
    getCampaigns.mockResolvedValue(okResponse({ page: 9, totalPages: 10 }));
    routeQuery = { page: "9" };
    const wrapper = mountView();
    await flushPromises();

    const numbered = wrapper
      .findAll("ul.pagination li")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    expect(numbered[numbered.length - 1]).toBe("10");
    expect(numbered[0]).toBe("6");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Pagination disabled / active class branches + Previous/Next clicks
  // ---------------------------------------------------------------------------
  it("renders Previous disabled on first page and active class on current page", async () => {
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // First li is Previous -> disabled because current_page === 0
    expect(items[0].classes()).toContain("disabled");

    // The numbered li for the current page carries the active class
    const activeLi = wrapper
      .findAll("ul.pagination li")
      .find((li) => li.classes().includes("active"));
    expect(activeLi).toBeTruthy();

    // Click Next (valid) to advance from page 0
    getCampaigns.mockClear();
    await items[items.length - 1].find("a").trigger("click");
    await flushPromises();
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders Next disabled on the last page and Previous click navigates", async () => {
    getCampaigns.mockResolvedValue(okResponse({ page: 2, totalPages: 3 }));
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // last_page = 3 - 1 = 2, current_page = 2 -> Next disabled
    expect(items[items.length - 1].classes()).toContain("disabled");

    getCampaigns.mockClear();
    getCampaigns.mockResolvedValue(okResponse({ page: 1, totalPages: 3 }));
    await items[0].find("a").trigger("click"); // Previous -> changePage(1)
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // total === 0 -> pagination hidden
  // ---------------------------------------------------------------------------
  it("hides pagination nav when total is 0", async () => {
    getCampaigns.mockResolvedValue(okResponse({ totalPages: 0 }));
    const wrapper = mountView();
    await flushPromises();

    expect(
      wrapper.find('nav[aria-label="campaigns pagination"]').exists()
    ).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // `campaigns ?? []` nullish fallback branch (campaigns null)
  // ---------------------------------------------------------------------------
  it("falls back to an empty array for CampaignsTable when campaigns is null", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.campaigns = null;
    await nextTick();

    const table = wrapper.findComponent({ name: "CampaignsTable" });
    expect(table.props("campaigns")).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // applyFilters via page-size <select> @change
  // ---------------------------------------------------------------------------
  it("applyFilters via page-size select resets to first page and refetches", async () => {
    getCampaigns.mockResolvedValue(okResponse({ page: 1, totalPages: 3 }));
    routeQuery = { page: "1" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);

    getCampaigns.mockClear();
    getCampaigns.mockResolvedValue(okResponse({ page: 0, totalPages: 3 }));
    const select = wrapper.find("#pageSizeSelect");
    await select.setValue("25");
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // clearFilters
  // ---------------------------------------------------------------------------
  it("clearFilters resets search/category and refetches", async () => {
    routeQuery = { search: "x", status: "active" };
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();

    wrapper.vm.clearFilters();
    await flushPromises();

    expect(wrapper.vm.filters.search).toBe("");
    expect(wrapper.vm.filters.category).toBe("");
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changeStatus toggle: set then unset (both ternary sides)
  // ---------------------------------------------------------------------------
  it("changeStatus toggles a status on then off", async () => {
    const wrapper = mountView();
    await flushPromises();

    getCampaigns.mockClear();
    wrapper.vm.changeStatus("active"); // '' -> 'active'
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("active");

    wrapper.vm.changeStatus("active"); // 'active' -> '' (other ternary side)
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete event from CampaignsTable + delete modal rendered state
  // ---------------------------------------------------------------------------
  it("wires CampaignsTable events and renders delete modal state", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.campaigns = [makeCampaign(1, "My Campaign")];
    await nextTick();

    const table = wrapper.findComponent({ name: "CampaignsTable" });
    // @handle-delete -> confirmDelete
    table.vm.$emit("handle-delete", 1);
    await nextTick();
    expect(wrapper.vm.selectedCampaign.id).toBe(1);
    expect(showSpy).toHaveBeenCalled();

    // @handle-edit -> openUpdateModal
    showSpy.mockClear();
    table.vm.$emit("handle-edit", 1);
    await nextTick();
    expect(showSpy).toHaveBeenCalled();

    // Delete modal: isDeleting true -> spinner text + selected name
    wrapper.vm.isDeleting = true;
    await nextTick();
    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Campaign");
    expect(modal.text()).toContain("Deleting...");

    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Campaign");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // isFetchingBusinesses v-if branch (spinner) vs v-else (CampaignForm)
  // ---------------------------------------------------------------------------
  it("renders the loading spinner when isFetchingBusinesses is true", async () => {
    const wrapper = mountView();
    await flushPromises();

    // v-else branch initially: CampaignForm present
    expect(wrapper.findComponent({ name: "CampaignForm" }).exists()).toBe(true);

    wrapper.vm.isFetchingBusinesses = true;
    await nextTick();

    const formModal = wrapper.find("#campaignFormModal");
    expect(formModal.find(".spinner-border").exists()).toBe(true);
    expect(formModal.text()).toContain("Loading data...");
    expect(wrapper.findComponent({ name: "CampaignForm" }).exists()).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced fetch) + route-query replace watcher (undefined
  // branches for falsy search/status, and populated branches)
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers debounced fetch and router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();
    routerReplace.mockClear();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("query");
    await flushPromises();

    expect(getCampaigns).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("route-query watcher omits search and status when both are falsy", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    // Mutate a watched source (current_page) to retrigger the watcher with
    // search === '' and status === '' -> both `|| undefined` branches taken.
    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBeUndefined();
    expect(lastCall.query.status).toBeUndefined();
    expect(lastCall.query.page).toBe(1);
    wrapper.unmount();
  });

  it("route-query watcher emits populated search and status keys", async () => {
    routeQuery = { search: "s", status: "active" };
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    wrapper.vm.pagination.current_page = 2;
    await flushPromises();

    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBe("s");
    expect(lastCall.query.status).toBe("active");
    expect(lastCall.query.page).toBe(2);
    wrapper.unmount();
  });
});

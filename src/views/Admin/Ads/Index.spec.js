import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock bootstrap Modal (external boundary) ---------------------------------
const showSpy = vi.fn();
const hideSpy = vi.fn();
const ModalSpy = vi.fn();

vi.mock("bootstrap", () => {
  return {
    Modal: class {
      constructor(el) {
        ModalSpy(el);
        this.show = showSpy;
        this.hide = hideSpy;
      }
    },
  };
});

// --- Mock lodash debounce: run synchronously so watchers are deterministic ----
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    wrapped.flush = vi.fn();
    return wrapped;
  },
}));

// --- Mock sweetalert2 ---------------------------------------------------------
const swalFire = vi.fn();
vi.mock("sweetalert2", () => ({
  default: { fire: (...a) => swalFire(...a) },
}));

// --- Mock ads service ---------------------------------------------------------
const getAds = vi.fn();
const removeAd = vi.fn();
vi.mock("@/features/ads/AdsService", () => ({
  getAds: (...a) => getAds(...a),
  removeAd: (...a) => removeAd(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ query: routeQuery }),
}));

import Index from "./Index.vue";

const makeAd = (id, title = `Ad ${id}`) => ({ id, title });

const okResponse = (overrides = {}) => ({
  status: 200,
  data: {
    ads: [makeAd(1), makeAd(2)],
    page: 0,
    size: 10,
    totalPages: 3,
    ...overrides,
  },
});

const mountView = () =>
  mount(Index, {
    global: {
      stubs: {
        AdsTable: true,
        AdForm: true,
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });

describe("Admin/Ads/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    routeQuery = {};
    getAds.mockResolvedValue(okResponse());
    removeAd.mockResolvedValue({});
    document.body.innerHTML = "";
    // Seed a leftover backdrop so onMounted's cleanup forEach callback runs.
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches ads (success path, default branches)", async () => {
    const wrapper = mountView();
    await flushPromises();

    // getAds called with defaults
    expect(getAds).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });
    expect(ModalSpy).toHaveBeenCalledTimes(2);

    // Ads rendered into the table
    expect(wrapper.findComponent({ name: "AdsTable" }).exists()).toBe(true);
    // Pagination visible because totalPages (total) > 0
    expect(wrapper.find('nav[aria-label="Ads pagination"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("initializes from populated query params (truthy branches)", async () => {
    routeQuery = {
      search: "hello",
      category: "cat",
      status: "active",
      page: "2",
      size: "25",
    };
    const wrapper = mountView();
    await flushPromises();

    expect(getAds).toHaveBeenCalledWith({
      page: 2,
      search: "hello",
      size: 25,
      status: "active",
    });

    // hasActiveFilters => Clear Filters button shows
    expect(wrapper.text()).toContain("Clear Filters");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: response.data.ads falsy fallback + pagination fallbacks
  // ---------------------------------------------------------------------------
  it("uses empty-list and pagination fallbacks when response data fields are missing", async () => {
    getAds.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mountView();
    await flushPromises();

    // total === 0 => pagination hidden
    expect(wrapper.find('nav[aria-label="Ads pagination"]').exists()).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: non-200 -> throw -> catch -> Swal error
  // ---------------------------------------------------------------------------
  it("shows error Swal when response status is not 200", async () => {
    getAds.mockResolvedValue({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", icon: "error" })
    );
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: rejected promise -> catch
  // ---------------------------------------------------------------------------
  it("shows error Swal when getAds rejects", async () => {
    getAds.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", icon: "error" })
    );
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: early return when already loading
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getAds.mockImplementation(
      () => new Promise((res) => { resolveFn = res; })
    );
    const wrapper = mountView();
    // onMounted fetch is pending (loading === true). Trigger applyFilters via select.
    await nextTick();
    expect(getAds).toHaveBeenCalledTimes(1);

    // Calling changeStatus while loading should early-return.
    await wrapper.vm.changeStatus("active");
    expect(getAds).toHaveBeenCalledTimes(1);

    resolveFn(okResponse());
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete found + deleteAd success (list NOT emptied)
  // ---------------------------------------------------------------------------
  it("confirms and deletes an ad successfully (list not emptied)", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAd.id).toBe(1);

    await wrapper.vm.deleteAd();
    await flushPromises();

    expect(removeAd).toHaveBeenCalledWith(1);
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Deleted!", icon: "success" })
    );
    expect(hideSpy).toHaveBeenCalled();
    // Ad 1 removed, ad 2 still present -> not empty -> no page decrement re-fetch
    expect(wrapper.vm.ads.map((a) => a.id)).toEqual([2]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete not found (selectedAd stays null -> show not called)
  // ---------------------------------------------------------------------------
  it("confirmDelete with unknown id does not open modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(999);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteAd early return when no selectedAd
  // ---------------------------------------------------------------------------
  it("deleteAd returns early when no ad is selected", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.selectedAd = null;

    await wrapper.vm.deleteAd();
    expect(removeAd).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteAd: list emptied on a page > 0 -> page decrement + refetch
  // ---------------------------------------------------------------------------
  it("decrements page and refetches when last ad on a non-first page is deleted", async () => {
    getAds.mockResolvedValue(
      okResponse({ ads: [makeAd(7)], page: 1 })
    );
    routeQuery = { page: "1" };
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(1);
    getAds.mockClear();
    // The refetch triggered by the page decrement resolves with page 0.
    getAds.mockResolvedValue(okResponse({ ads: [], page: 0 }));

    wrapper.vm.confirmDelete(7);
    await wrapper.vm.deleteAd();
    await flushPromises();

    // Page decremented (then refetched at page 0) and a new fetch fired
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteAd: reject -> catch -> Swal error
  // ---------------------------------------------------------------------------
  it("shows error Swal when removeAd rejects", async () => {
    const wrapper = mountView();
    await flushPromises();

    removeAd.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteAd();
    await flushPromises();

    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", icon: "error" })
    );
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openCreateModal: nextTick + setTimeout -> show
  // ---------------------------------------------------------------------------
  it("openCreateModal resets selection and shows form modal after timeout", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.openCreateModal();
    await nextTick();
    expect(wrapper.vm.isFormModalReady).toBe(true);
    expect(wrapper.vm.selectedAd).toBe(null);

    // AdForm rendered because isFormModalReady === true
    await nextTick();
    expect(wrapper.findComponent({ name: "AdForm" }).exists()).toBe(true);

    vi.advanceTimersByTime(100);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openUpdateModal found
  // ---------------------------------------------------------------------------
  it("openUpdateModal selects ad and shows form modal when ad exists", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.openUpdateModal(2);
    await nextTick();
    expect(wrapper.vm.selectedAd.id).toBe(2);
    expect(wrapper.vm.isFormModalReady).toBe(true);

    vi.advanceTimersByTime(100);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openUpdateModal not found
  // ---------------------------------------------------------------------------
  it("openUpdateModal does nothing when ad does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.openUpdateModal(12345);
    await nextTick();
    vi.advanceTimersByTime(200);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // addAd -> prepends and closes form
  // ---------------------------------------------------------------------------
  it("addAd prepends a new ad and closes the form", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.addAd(makeAd(99, "New"));
    expect(wrapper.vm.ads[0].id).toBe(99);
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAd).toBe(null);
    expect(wrapper.vm.isFormModalReady).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // updateAd -> updates matching ad (and leaves non-matching as-is)
  // ---------------------------------------------------------------------------
  it("updateAd updates the matching ad and leaves others unchanged", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.updateAd({ id: 2, title: "Updated 2" });
    const titles = wrapper.vm.ads.map((a) => a.title);
    expect(titles).toContain("Updated 2"); // matched branch
    expect(titles).toContain("Ad 1"); // non-matched branch
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm via AdForm @close emit
  // ---------------------------------------------------------------------------
  it("closeForm hides modal and clears state", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closeForm();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAd).toBe(null);
    expect(wrapper.vm.isFormModalReady).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: out of range (low + high) + valid
  // ---------------------------------------------------------------------------
  it("changePage ignores out-of-range pages and fetches for valid pages", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();

    // last_page = totalPages - 1 = 3 - 1 = 2
    wrapper.vm.changePage(-1); // page < 0
    wrapper.vm.changePage(99); // page > last_page
    expect(getAds).not.toHaveBeenCalled();

    wrapper.vm.changePage(1); // valid
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // getPageNumbers: drive the `endPage - startPage < 4` recompute branch
  // by rendering pagination with many pages and clicking page links.
  // ---------------------------------------------------------------------------
  it("renders page-number links and navigates via clicks (getPageNumbers branches)", async () => {
    getAds.mockResolvedValue(
      okResponse({ ads: [makeAd(1)], page: 5, totalPages: 10 })
    );
    routeQuery = { page: "5" };
    const wrapper = mountView();
    await flushPromises();

    // total = 10, current_page = 5 -> page numbers rendered
    const pageLinks = wrapper.findAll("ul.pagination li a.page-link");
    expect(pageLinks.length).toBeGreaterThan(0);

    getAds.mockClear();
    // Click a numbered page link (not Previous/Next which are first/last)
    const numbered = wrapper
      .findAll("ul.pagination li")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    expect(numbered.length).toBeGreaterThan(0);
    await numbered[0].find("a").trigger("click");
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("covers getPageNumbers when current page is near the end (startPage recompute)", async () => {
    // current_page + 1 = 10 (currentPage), lastPage(total) = 10 ->
    // startPage = max(1, 8) = 8, endPage = min(10, 12) = 10, span = 2 < 4 ->
    // startPage = max(1, 6) = 6.
    getAds.mockResolvedValue(
      okResponse({ ads: [makeAd(1)], page: 9, totalPages: 10 })
    );
    routeQuery = { page: "9" };
    const wrapper = mountView();
    await flushPromises();

    const numbered = wrapper
      .findAll("ul.pagination li")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    expect(numbered[numbered.length - 1]).toBe("10");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Previous / Next page link clicks (disabled-class branches)
  // ---------------------------------------------------------------------------
  it("renders Previous disabled on first page and Next disabled on last page", async () => {
    // first page
    const wrapper = mountView();
    await flushPromises();
    const items = wrapper.findAll("ul.pagination li.page-item");
    // First li is Previous -> disabled because current_page === 0
    expect(items[0].classes()).toContain("disabled");

    // Click Next (valid) to advance
    getAds.mockClear();
    const nextLink = items[items.length - 1].find("a");
    await nextLink.trigger("click");
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders Next disabled when on the last page", async () => {
    getAds.mockResolvedValue(
      okResponse({ ads: [makeAd(1)], page: 2, totalPages: 3 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // last_page = 3 - 1 = 2, current_page = 2 -> Next disabled
    expect(items[items.length - 1].classes()).toContain("disabled");

    // Click the Previous link (handler: changePage(current_page - 1)) -> valid nav
    getAds.mockClear();
    getAds.mockResolvedValue(okResponse({ ads: [makeAd(1)], page: 1, totalPages: 3 }));
    await items[0].find("a").trigger("click");
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // applyFilters via page-size <select> @change
  // ---------------------------------------------------------------------------
  it("applyFilters via page-size select resets to first page and refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();

    const select = wrapper.find("#pageSizeSelect");
    await select.setValue("25");
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // clearFilters via Clear Filters button
  // ---------------------------------------------------------------------------
  it("clearFilters resets all filters and refetches", async () => {
    routeQuery = { search: "x", category: "y", status: "active" };
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();

    const clearBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Clear Filters"));
    expect(clearBtn).toBeTruthy();
    await clearBtn.trigger("click");
    await flushPromises();

    expect(wrapper.vm.filters).toEqual({
      search: "",
      category: "",
      status: "",
    });
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changeStatus toggle: set then unset (both ternary sides), via status buttons
  // ---------------------------------------------------------------------------
  it("changeStatus toggles a status on then off and reflects active class", async () => {
    const wrapper = mountView();
    await flushPromises();

    const activeBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text().trim() === "Active");

    getAds.mockClear();
    await activeBtn.trigger("click"); // status '' -> 'active'
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("active");
    expect(activeBtn.classes()).toContain("active");

    await activeBtn.trigger("click"); // status 'active' -> '' (ternary other side)
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");

    // 'All' button active-class branch + click handler (changeStatus(''))
    const allBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text().trim() === "All");
    expect(allBtn.classes()).toContain("active");
    getAds.mockClear();
    await allBtn.trigger("click"); // status '' -> stays '' (ternary), refetch
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("changeStatus covers the Pending button active class", async () => {
    const wrapper = mountView();
    await flushPromises();
    const pendingBtn = wrapper
      .findAll(".btn-group button")
      .find((b) => b.text().trim() === "Pending");
    await pendingBtn.trigger("click");
    await flushPromises();
    expect(pendingBtn.classes()).toContain("active");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // hasActiveFilters: category-only branch (search & status falsy)
  // ---------------------------------------------------------------------------
  it("hasActiveFilters true via category only", async () => {
    routeQuery = { category: "cat" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.hasActiveFilters).toBe("cat");
    wrapper.unmount();
  });

  it("hasActiveFilters true via status only", async () => {
    routeQuery = { status: "active" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.hasActiveFilters).toBe("active");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced) + route-query replace watcher (undefined branches)
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers debounced fetch and router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();
    routerReplace.mockClear();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("query");
    await flushPromises();

    // debounced fetch (mocked to run sync) fired
    expect(getAds).toHaveBeenCalled();
    // router.replace called with search present, others undefined
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("route-query watcher emits all populated keys when every filter is set", async () => {
    routeQuery = { search: "s", category: "c", status: "active", page: "2", size: "25" };
    // Keep per_page at 25 after the fetch resolves (fetchAds overwrites it from
    // response.data.size).
    getAds.mockResolvedValue(okResponse({ size: 25 }));
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    // Mutate a watched source to retrigger the watcher with all keys truthy.
    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    expect(routerReplace).toHaveBeenCalledWith({
      query: {
        search: "s",
        category: "c",
        status: "active",
        page: 1,
        size: 25,
      },
    });
    wrapper.unmount();
  });

  it("route-query watcher omits page and size when they are falsy", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    // Drive per_page (size) to a falsy value -> `size: per_page || undefined`
    // takes the `undefined` branch. current_page is already 0 (page omitted).
    wrapper.vm.pagination.per_page = 0;
    await flushPromises();

    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.size).toBeUndefined();
    expect(lastCall.query.page).toBeUndefined();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal rendered state: isDeleting spinner + text + selectedAd?.title
  // ---------------------------------------------------------------------------
  it("renders deleting spinner and selected ad title in delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedAd = makeAd(1, "My Ad");
    wrapper.vm.isDeleting = true;
    await nextTick();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Ad");
    expect(modal.text()).toContain("Deleting...");
    expect(modal.find(".spinner-border").exists()).toBe(true);

    // Toggle back: not deleting -> "Delete Ad" label, no spinner
    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Ad");
    expect(modal.find(".spinner-border").exists()).toBe(false);
    wrapper.unmount();
  });
});

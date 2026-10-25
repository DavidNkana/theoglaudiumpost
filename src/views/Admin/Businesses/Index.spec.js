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

// --- Mock businesses service --------------------------------------------------
const getBusinesses = vi.fn();
const removeBusiness = vi.fn();
vi.mock("@/features/businesses/BusinessesService", () => ({
  getBusinesses: (...a) => getBusinesses(...a),
  removeBusiness: (...a) => removeBusiness(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ query: routeQuery }),
  createRouter: () => ({}),
  createWebHistory: () => ({}),
}));

// --- Mock useAuth composable (pulled in transitively by BusinessesTable) -------
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ hasRole: () => true }),
}));

import Index from "./Index.vue";

const makeBiz = (id, name = `Biz ${id}`) => ({ id, name });

const okResponse = (overrides = {}) => ({
  status: 200,
  data: {
    businesses: [makeBiz(1), makeBiz(2)],
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
        BusinessesTable: true,
        BusinessForm: true,
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });

describe("Admin/Businesses/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeQuery = {};
    getBusinesses.mockResolvedValue(okResponse());
    removeBusiness.mockResolvedValue({});
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches businesses (success, default branches)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getBusinesses).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });
    // Two modals constructed in onMounted (delete + form)
    expect(ModalSpy).toHaveBeenCalledTimes(2);

    // Table rendered with data
    expect(wrapper.findComponent({ name: "BusinessesTable" }).exists()).toBe(true);
    expect(wrapper.vm.businesses.map((b) => b.id)).toEqual([1, 2]);
    // Pagination visible because total (totalPages) > 0
    expect(
      wrapper.find('nav[aria-label="businesses pagination"]').exists()
    ).toBe(true);
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

    expect(getBusinesses).toHaveBeenCalledWith({
      page: 2,
      search: "hello",
      size: 25,
      status: "active",
    });
    expect(wrapper.vm.filters.search).toBe("hello");
    expect(wrapper.vm.filters.category).toBe("cat");
    expect(wrapper.vm.filters.status).toBe("active");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // template `businesses ?? []` nullish-fallback branch: response with null list
  // ---------------------------------------------------------------------------
  it("falls back to an empty array when businesses is null (template ?? branch)", async () => {
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: null, totalPages: 2 })
    );
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.businesses).toBe(null);
    const table = wrapper.findComponent({ name: "BusinessesTable" });
    expect(table.exists()).toBe(true);
    // ?? [] fallback applied -> prop is an empty array, not null
    expect(table.props("businesses")).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchBusinesses: non-200 -> throw -> catch (console.error)
  // ---------------------------------------------------------------------------
  it("handles non-200 response by going through the catch (loading reset)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getBusinesses.mockResolvedValue({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching businesses:",
      expect.any(Error)
    );
    expect(wrapper.vm.loading).toBe(false);
    // total stays 0 -> pagination hidden
    expect(
      wrapper.find('nav[aria-label="businesses pagination"]').exists()
    ).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchBusinesses: rejected promise -> catch
  // ---------------------------------------------------------------------------
  it("handles a rejected getBusinesses by going through the catch", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getBusinesses.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching businesses:",
      expect.any(Error)
    );
    expect(wrapper.vm.loading).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchBusinesses: early return when already loading
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getBusinesses.mockImplementation(
      () => new Promise((res) => { resolveFn = res; })
    );
    const wrapper = mountView();
    await nextTick();
    expect(getBusinesses).toHaveBeenCalledTimes(1);

    // changeStatus calls fetchBusinesses while loading -> early return
    wrapper.vm.changeStatus("active");
    expect(getBusinesses).toHaveBeenCalledTimes(1);

    resolveFn(okResponse());
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteBusiness success: filter, hide, reset selection
  // ---------------------------------------------------------------------------
  it("deletes the selected business successfully", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedBusiness.id).toBe(1);

    await wrapper.vm.deleteBusiness();
    await flushPromises();

    expect(removeBusiness).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    // Business 1 removed, business 2 remains
    expect(wrapper.vm.businesses.map((b) => b.id)).toEqual([2]);
    expect(wrapper.vm.selectedBusiness).toEqual({});
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteBusiness reject -> catch -> alert
  // ---------------------------------------------------------------------------
  it("alerts when removeBusiness rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();

    removeBusiness.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteBusiness();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error deleting ad:",
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete ad. Please try again."
    );
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete not found (selectedBusiness undefined -> show not called)
  // ---------------------------------------------------------------------------
  it("confirmDelete with unknown id does not open modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(999);
    expect(showSpy).not.toHaveBeenCalled();
    expect(wrapper.vm.selectedBusiness).toBeUndefined();
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
  // openUpdateModal found
  // ---------------------------------------------------------------------------
  it("openUpdateModal selects a business and shows the form modal when found", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(2);
    expect(wrapper.vm.selectedBusiness.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openUpdateModal not found
  // ---------------------------------------------------------------------------
  it("openUpdateModal does nothing when business does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(54321);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm via BusinessForm @close
  // ---------------------------------------------------------------------------
  it("closeForm hides modal and clears selection", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closeForm();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedBusiness).toBe(null);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // addBusiness -> prepends
  // ---------------------------------------------------------------------------
  it("addBusiness prepends a new business", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.addBusiness(makeBiz(99, "New"));
    expect(wrapper.vm.businesses[0].id).toBe(99);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // updateBusiness -> updates matching, leaves non-matching as-is (both branches)
  // ---------------------------------------------------------------------------
  it("updateBusiness updates the matching business and leaves others unchanged", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.updateBusiness({ id: 2, name: "Updated 2" });
    const names = wrapper.vm.businesses.map((b) => b.name);
    expect(names).toContain("Updated 2"); // matched branch
    expect(names).toContain("Biz 1"); // non-matched branch
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: out of range (low + high) + valid
  // ---------------------------------------------------------------------------
  it("changePage ignores out-of-range pages and fetches for valid pages", async () => {
    const wrapper = mountView();
    await flushPromises();
    getBusinesses.mockClear();

    // last_page = totalPages - 1 = 3 - 1 = 2
    wrapper.vm.changePage(-1); // page < 0
    wrapper.vm.changePage(99); // page > last_page
    expect(getBusinesses).not.toHaveBeenCalled();

    wrapper.vm.changePage(1); // valid
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // getPageNumbers: span branch -> render & click numbered link
  // ---------------------------------------------------------------------------
  it("renders page-number links and navigates via clicks (getPageNumbers branches)", async () => {
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 5, totalPages: 10 })
    );
    routeQuery = { page: "5" };
    const wrapper = mountView();
    await flushPromises();

    const pageLinks = wrapper.findAll("ul.pagination li a.page-link");
    expect(pageLinks.length).toBeGreaterThan(0);

    getBusinesses.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    expect(numbered.length).toBeGreaterThan(0);
    await numbered[0].find("a").trigger("click");
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("covers getPageNumbers when current page is near the end (startPage recompute)", async () => {
    // currentPage(1-based) = 10, lastPage(total) = 10 ->
    // startPage = max(1, 8) = 8, endPage = min(10, 12) = 10, span = 2 < 4 ->
    // startPage = max(1, 6) = 6.
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 9, totalPages: 10 })
    );
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
  // Previous / Next page link clicks (disabled-class branches)
  // ---------------------------------------------------------------------------
  it("renders Previous disabled on first page and navigates via Next", async () => {
    const wrapper = mountView();
    await flushPromises();
    const items = wrapper.findAll("ul.pagination li.page-item");
    // First li is Previous -> disabled because current_page === 0
    expect(items[0].classes()).toContain("disabled");

    getBusinesses.mockClear();
    const nextLink = items[items.length - 1].find("a");
    await nextLink.trigger("click");
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders Next disabled when on the last page and navigates via Previous", async () => {
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 2, totalPages: 3 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // last_page = 3 - 1 = 2, current_page = 2 -> Next disabled
    expect(items[items.length - 1].classes()).toContain("disabled");

    getBusinesses.mockClear();
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 1, totalPages: 3 })
    );
    await items[0].find("a").trigger("click"); // Previous
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // active-class branch on a numbered page (page - 1 === current_page)
  // ---------------------------------------------------------------------------
  it("marks the current page link active", async () => {
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 0, totalPages: 5 })
    );
    const wrapper = mountView();
    await flushPromises();

    const activeNumbered = wrapper
      .findAll("ul.pagination li.page-item")
      .find((li) => li.classes().includes("active"));
    expect(activeNumbered).toBeTruthy();
    expect(activeNumbered.text().trim()).toBe("1");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // applyFilters via page-size <select> @change
  // ---------------------------------------------------------------------------
  it("applyFilters via page-size select resets to first page and refetches", async () => {
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 3, totalPages: 8 })
    );
    routeQuery = { page: "3" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(3);

    getBusinesses.mockClear();
    // The refetch triggered by applyFilters resolves at page 0.
    getBusinesses.mockResolvedValue(
      okResponse({ businesses: [makeBiz(1)], page: 0, totalPages: 8 })
    );
    const select = wrapper.find("#pageSizeSelect");
    await select.setValue("25");
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // clearFilters
  // ---------------------------------------------------------------------------
  it("clearFilters resets search/category and refetches", async () => {
    routeQuery = { search: "x", category: "y", status: "active" };
    const wrapper = mountView();
    await flushPromises();
    getBusinesses.mockClear();

    wrapper.vm.clearFilters();
    await flushPromises();

    expect(wrapper.vm.filters.search).toBe("");
    expect(wrapper.vm.filters.category).toBe("");
    // status preserved by clearFilters
    expect(wrapper.vm.filters.status).toBe("active");
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changeStatus toggle: set then unset (both ternary sides)
  // ---------------------------------------------------------------------------
  it("changeStatus toggles a status on then off (both ternary sides)", async () => {
    const wrapper = mountView();
    await flushPromises();

    getBusinesses.mockClear();
    wrapper.vm.changeStatus("active"); // '' -> 'active'
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("active");

    wrapper.vm.changeStatus("active"); // 'active' -> '' (other ternary side)
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced) -> resets pagination.page and refetches
  // + route-query replace watcher (search present, others undefined)
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers debounced fetch and router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getBusinesses.mockClear();
    routerReplace.mockClear();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("query");
    await flushPromises();

    // search watcher set pagination.page = 0 then the (mocked-sync) debounced
    // fetch replaced the pagination object; assert the observable effects.
    expect(wrapper.vm.filters.search).toBe("query");
    expect(getBusinesses).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("route-query watcher emits all populated keys when every filter is set", async () => {
    routeQuery = {
      search: "s",
      category: "c",
      status: "active",
      page: "2",
      size: "25",
    };
    // Keep per_page at 25 after fetch (fetchBusinesses overwrites from response).
    getBusinesses.mockResolvedValue(okResponse({ size: 25 }));
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

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

  it("route-query watcher omits search/category/status when they are falsy", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBeUndefined();
    expect(lastCall.query.category).toBeUndefined();
    expect(lastCall.query.status).toBeUndefined();
    expect(lastCall.query.page).toBe(1);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal rendered state: isDeleting label + selectedBusiness?.name
  // ---------------------------------------------------------------------------
  it("renders deleting label and selected business name in delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedBusiness = makeBiz(1, "My Biz");
    wrapper.vm.isDeleting = true;
    await nextTick();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Biz");
    expect(modal.text()).toContain("Deleting...");
    // disabled attribute present while deleting
    expect(modal.find("button.btn-danger").attributes("disabled")).toBeDefined();

    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Business");

    // selectedBusiness null -> optional-chaining name branch (renders nothing)
    wrapper.vm.selectedBusiness = null;
    await nextTick();
    expect(modal.text()).not.toContain("My Biz");
    wrapper.unmount();
  });
});

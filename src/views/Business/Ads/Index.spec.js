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

// --- Mock ads service ---------------------------------------------------------
const removeAd = vi.fn();
vi.mock("@/features/ads/AdsService", () => ({
  removeAd: (...a) => removeAd(...a),
}));

// --- Mock businesses service (getAds lives here for this view) ----------------
const getAds = vi.fn();
vi.mock("@/features/businesses/BusinessesService", () => ({
  getAds: (...a) => getAds(...a),
}));

// --- Mock media service -------------------------------------------------------
const getMediaObjectUrl = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: (...a) => getMediaObjectUrl(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ query: routeQuery }),
}));

import Index from "./Index.vue";

const makeAd = (id, overrides = {}) => ({
  id,
  title: `Ad ${id}`,
  description: `Desc ${id}`,
  status: "active",
  ...overrides,
});

const okResponse = (data = {}) => ({
  status: 200,
  data: {
    page: 0,
    size: 10,
    totalPages: 3,
    ...data,
  },
});

const mountView = (stubs = {}) =>
  mount(Index, {
    global: {
      stubs: {
        AdsTable: true,
        AdForm: true,
        ImageWithPlaceholder: true,
        RouterLink: RouterLinkStub,
        ...stubs,
      },
    },
    attachTo: document.body,
  });

describe("Business/Ads/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    routeQuery = {};
    // getAds resolves to an array (component sets ads.value = response.data which
    // is treated as a list by the table / .filter / .find / .map usage).
    getAds.mockResolvedValue({
      ...okResponse(),
      data: Object.assign([makeAd(1), makeAd(2)], {
        page: 0,
        size: 10,
        totalPages: 3,
      }),
    });
    removeAd.mockResolvedValue({});
    getMediaObjectUrl.mockResolvedValue("blob:url");
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: build a getAds response whose data is an array carrying pagination
  // fields, matching how the real backend payload is consumed.
  const listResponse = (ads, { page = 0, size = 10, totalPages = 3 } = {}) => ({
    status: 200,
    data: Object.assign([...ads], { page, size, totalPages }),
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches ads (success, default branches)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getAds).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });
    expect(ModalSpy).toHaveBeenCalledTimes(3);

    expect(wrapper.findComponent({ name: "AdsTable" }).exists()).toBe(true);
    // total = totalPages = 3 > 0 -> pagination visible
    expect(wrapper.find('nav[aria-label="ads pagination"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("initializes from populated query params (truthy onMounted branches)", async () => {
    routeQuery = {
      search: "hello",
      category: "cat",
      status: "active",
      page: "2",
      size: "25",
    };
    getAds.mockResolvedValue(
      listResponse([makeAd(1)], { page: 2, size: 25, totalPages: 3 })
    );
    const wrapper = mountView();
    await flushPromises();

    expect(getAds).toHaveBeenCalledWith({
      page: 2,
      search: "hello",
      size: 25,
      status: "active",
    });
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: non-200 -> throw -> catch (no crash)
  // ---------------------------------------------------------------------------
  it("handles a non-200 response by hitting the catch branch", async () => {
    getAds.mockResolvedValue({ status: 500, data: [] });
    const wrapper = mountView();
    await flushPromises();

    // loading reset, ads stayed empty, no crash
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.ads).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: rejected promise -> catch
  // ---------------------------------------------------------------------------
  it("handles a rejected getAds by hitting the catch branch", async () => {
    getAds.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.loading).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAds: early return when already loading
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getAds.mockImplementation(
      () => new Promise((res) => {
        resolveFn = res;
      })
    );
    const wrapper = mountView();
    await nextTick();
    expect(getAds).toHaveBeenCalledTimes(1);

    // Calling changeStatus while loading should early-return (loading guard).
    wrapper.vm.changeStatus("active");
    expect(getAds).toHaveBeenCalledTimes(1);

    resolveFn(listResponse([makeAd(1)]));
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete found + deleteAd success
  // ---------------------------------------------------------------------------
  it("confirms and deletes an ad successfully", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAd.id).toBe(1);

    await wrapper.vm.deleteAd();
    await flushPromises();

    expect(removeAd).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    // ad 1 removed, ad 2 still present
    expect(wrapper.vm.ads.map((a) => a.id)).toEqual([2]);
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete not found (selectedAd undefined -> show not called)
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
  // deleteAd: reject -> catch -> alert
  // ---------------------------------------------------------------------------
  it("alerts when removeAd rejects", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();

    removeAd.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteAd();
    await flushPromises();

    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete ad. Please try again."
    );
    expect(wrapper.vm.isDeleting).toBe(false);
    alertSpy.mockRestore();
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
  // getPageNumbers: many pages + near-end startPage recompute branch
  // ---------------------------------------------------------------------------
  it("renders page-number links and navigates via clicks", async () => {
    getAds.mockResolvedValue(
      listResponse([makeAd(1)], { page: 5, totalPages: 10 })
    );
    routeQuery = { page: "5" };
    const wrapper = mountView();
    await flushPromises();

    const pageLinks = wrapper.findAll("ul.pagination li a.page-link");
    expect(pageLinks.length).toBeGreaterThan(0);

    getAds.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    expect(numbered.length).toBeGreaterThan(0);
    await numbered[0].find("a").trigger("click");
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("covers getPageNumbers near the end (startPage recompute branch)", async () => {
    // currentPage = 10, lastPage(total) = 10 -> startPage = 8, endPage = 10,
    // span = 2 < 4 -> startPage recomputed to max(1, 6) = 6.
    getAds.mockResolvedValue(
      listResponse([makeAd(1)], { page: 9, totalPages: 10 })
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
  // Previous / Next disabled-class branches + clicks
  // ---------------------------------------------------------------------------
  it("renders Previous disabled on first page and navigates Next", async () => {
    const wrapper = mountView();
    await flushPromises();
    const items = wrapper.findAll("ul.pagination li.page-item");
    expect(items[0].classes()).toContain("disabled"); // current_page === 0

    getAds.mockClear();
    const nextLink = items[items.length - 1].find("a");
    await nextLink.trigger("click");
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders Next disabled when on the last page", async () => {
    getAds.mockResolvedValue(
      listResponse([makeAd(1)], { page: 2, totalPages: 3 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // last_page = 3 - 1 = 2, current_page = 2 -> Next disabled
    expect(items[items.length - 1].classes()).toContain("disabled");

    getAds.mockClear();
    getAds.mockResolvedValue(
      listResponse([makeAd(1)], { page: 1, totalPages: 3 })
    );
    await items[0].find("a").trigger("click"); // Previous -> valid nav
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
  // clearFilters
  // ---------------------------------------------------------------------------
  it("clearFilters resets search/category and refetches", async () => {
    routeQuery = { search: "x", category: "y", status: "active" };
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();

    wrapper.vm.clearFilters();
    await flushPromises();

    expect(wrapper.vm.filters.search).toBe("");
    expect(wrapper.vm.filters.category).toBe("");
    // status preserved by clearFilters
    expect(wrapper.vm.filters.status).toBe("active");
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changeStatus toggle (both ternary sides)
  // ---------------------------------------------------------------------------
  it("changeStatus toggles a status on then off (both ternary branches)", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();

    wrapper.vm.changeStatus("active"); // '' -> 'active'
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("active");

    wrapper.vm.changeStatus("active"); // 'active' -> '' (other ternary side)
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");
    expect(getAds).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // handlePreview: found WITH images -> loadAdImages + show
  // ---------------------------------------------------------------------------
  it("handlePreview loads images for an ad that has images and shows preview", async () => {
    getAds.mockResolvedValue(
      listResponse([
        makeAd(1, {
          images: [{ image_id: "m1" }, { image_id: "m2" }],
          placement: { location: "home_banner" },
          placement_date: "2026-01-01T00:00:00",
          expiry_date: "2026-02-01T00:00:00",
          total_cost: 100,
          impressions: 5,
          clicks: 2,
        }),
      ])
    );
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.handlePreview(1);
    await flushPromises();

    expect(getMediaObjectUrl).toHaveBeenCalledWith("m1");
    expect(getMediaObjectUrl).toHaveBeenCalledWith("m2");
    expect(showSpy).toHaveBeenCalled();
    await nextTick();

    // imageCache populated -> img branch renders
    expect(wrapper.vm.imageCache.m1).toBe("blob:url");
    const previewModal = wrapper.find("#previewModal");
    expect(previewModal.text()).toContain("Ad 1");
    expect(previewModal.text()).toContain("Impressions");
    expect(previewModal.text()).toContain("Clicks");
    expect(previewModal.find("img").exists()).toBe(true);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // handlePreview: found WITHOUT images
  // ---------------------------------------------------------------------------
  it("handlePreview shows preview for an ad without images (no-images branch)", async () => {
    getAds.mockResolvedValue(listResponse([makeAd(1, { images: [] })]));
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.handlePreview(1);
    await flushPromises();
    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalled();

    await nextTick();
    const previewModal = wrapper.find("#previewModal");
    expect(previewModal.text()).toContain("No images available for this ad");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // handlePreview: not found -> show not called
  // ---------------------------------------------------------------------------
  it("handlePreview with unknown id does not open the preview", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.handlePreview(424242);
    await flushPromises();
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // loadAdImages: empty input early return
  // ---------------------------------------------------------------------------
  it("loadAdImages returns early for empty/undefined input", async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper.vm.loadAdImages([]);
    await wrapper.vm.loadAdImages(undefined);
    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    expect(wrapper.vm.loadingImages).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // loadAdImages: all already cached -> early return after uncachedIds check
  // ---------------------------------------------------------------------------
  it("loadAdImages returns early when all ids are already cached", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.imageCache.cached1 = "blob:cached";
    await wrapper.vm.loadAdImages(["cached1"]);
    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    expect(wrapper.vm.loadingImages).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // loadAdImages: per-image getMediaObjectUrl reject -> inner catch
  // ---------------------------------------------------------------------------
  it("loadAdImages handles a per-image fetch rejection (inner catch)", async () => {
    const wrapper = mountView();
    await flushPromises();

    getMediaObjectUrl.mockRejectedValueOnce(new Error("img fail"));
    await wrapper.vm.loadAdImages(["bad"]);
    await flushPromises();

    // failed image not cached, loading flag reset
    expect(wrapper.vm.imageCache.bad).toBeUndefined();
    expect(wrapper.vm.loadingImages).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // loadAdImages: outer catch -> synchronous throw before Promise.all
  // ---------------------------------------------------------------------------
  it("loadAdImages hits the outer catch when filtering throws", async () => {
    const wrapper = mountView();
    await flushPromises();

    // Array-like that passes the length guard but throws on .filter, so the
    // synchronous error lands in the outer try/catch (not a per-image catch).
    const exploding = {
      length: 1,
      filter() {
        throw new Error("filter blew up");
      },
    };
    await wrapper.vm.loadAdImages(exploding);
    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    expect(wrapper.vm.loadingImages).toBe(false);
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
  // openUpdateModal found / not found
  // ---------------------------------------------------------------------------
  it("openUpdateModal selects ad and shows the form modal when found", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(2);
    expect(wrapper.vm.selectedAd.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("openUpdateModal does nothing when ad does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(99999);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm + closePeview
  // ---------------------------------------------------------------------------
  it("closeForm hides modal and clears selection", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closeForm();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAd).toBe(null);
    wrapper.unmount();
  });

  it("closePeview hides preview modal and clears selection", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closePeview();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAd).toBe(null);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // addAd / updateAd
  // ---------------------------------------------------------------------------
  it("addAd prepends a new ad", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.addAd(makeAd(99, { title: "New" }));
    expect(wrapper.vm.ads[0].id).toBe(99);
    wrapper.unmount();
  });

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
  // AdForm emitted events wire to addAd/updateAd/closeForm
  // ---------------------------------------------------------------------------
  it("wires AdForm emitted events to handlers", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    const adForm = wrapper.findComponent({ name: "AdForm" });
    adForm.vm.$emit("add-ad", makeAd(123, { title: "Emitted" }));
    adForm.vm.$emit("update-ad", { id: 1, title: "Edited 1" });
    adForm.vm.$emit("close");
    await nextTick();

    expect(wrapper.vm.ads.some((a) => a.id === 123)).toBe(true);
    expect(wrapper.vm.ads.find((a) => a.id === 1).title).toBe("Edited 1");
    expect(hideSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // AdsTable emitted events wire to confirmDelete/handlePreview/openUpdateModal
  // ---------------------------------------------------------------------------
  it("wires AdsTable emitted events to handlers", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    const table = wrapper.findComponent({ name: "AdsTable" });
    table.vm.$emit("handle-delete", 1);
    expect(wrapper.vm.selectedAd.id).toBe(1);

    table.vm.$emit("handle-edit", 2);
    expect(wrapper.vm.selectedAd.id).toBe(2);

    table.vm.$emit("handle-preview", 2);
    await flushPromises();
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced) + route-query replace watcher (truthy branches)
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers debounced fetch and router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAds.mockClear();
    routerReplace.mockClear();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("query");
    await flushPromises();

    expect(getAds).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("route-query watcher emits all keys when every filter is set", async () => {
    routeQuery = {
      search: "s",
      category: "c",
      status: "active",
      page: "2",
      size: "25",
    };
    getAds.mockResolvedValue(
      listResponse([makeAd(1)], { page: 2, size: 25, totalPages: 3 })
    );
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

  it("route-query watcher omits search/category/status when falsy", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    wrapper.vm.pagination.current_page = 2;
    await flushPromises();

    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBeUndefined();
    expect(lastCall.query.category).toBeUndefined();
    expect(lastCall.query.status).toBeUndefined();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal rendered state: isDeleting label/spinner + selectedAd?.title
  // ---------------------------------------------------------------------------
  it("renders deleting label and selected ad title in the delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedAd = makeAd(1, { title: "My Ad" });
    wrapper.vm.isDeleting = true;
    await nextTick();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Ad");
    expect(modal.text()).toContain("Deleting...");

    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Ad");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Preview modal: loadingImages spinner branch + no-selectedAd spinner branch
  // ---------------------------------------------------------------------------
  it("renders the loading-images spinner while images load", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedAd = makeAd(1, { images: [{ image_id: "x" }] });
    wrapper.vm.loadingImages = true;
    await nextTick();

    const previewModal = wrapper.find("#previewModal");
    expect(previewModal.text()).toContain("Loading images...");
    wrapper.unmount();
  });

  it("renders the no-selectedAd spinner in the preview modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    // closePeview sets selectedAd to null -> the !selectedAd spinner branch
    wrapper.vm.closePeview();
    await nextTick();
    const previewModal = wrapper.find("#previewModal");
    expect(previewModal.find(".spinner-border").exists()).toBe(true);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Preview modal: image WITHOUT cache hit -> ImageWithPlaceholder branch +
  // placement/dates fallbacks (undefined optional chains) + missing cost/impr/clk
  // ---------------------------------------------------------------------------
  it("renders ImageWithPlaceholder when an image is not yet cached and uses fallbacks", async () => {
    getAds.mockResolvedValue(
      listResponse([
        makeAd(1, {
          // No placement/placement_date/expiry_date/total_cost ->
          // optional-chaining + nullish fallbacks ('-') branches.
          images: [{ image_id: "uncached" }],
        }),
      ])
    );
    // Prevent the cache from being populated so imageCache[image_id] is falsy.
    getMediaObjectUrl.mockRejectedValue(new Error("no cache"));
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.handlePreview(1);
    await flushPromises();
    await nextTick();

    const previewModal = wrapper.find("#previewModal");
    expect(
      previewModal.findComponent({ name: "ImageWithPlaceholder" }).exists()
    ).toBe(true);
    // total_cost undefined -> "- ZAR"; placement location undefined -> "-"
    expect(previewModal.text()).toContain("ZAR");
    expect(previewModal.text()).toContain("-");
    // impressions/clicks undefined -> rows hidden
    expect(previewModal.text()).not.toContain("Impressions");
    expect(previewModal.text()).not.toContain("Clicks");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Preview modal close buttons trigger closePeview
  // ---------------------------------------------------------------------------
  it("preview modal close buttons call closePeview", async () => {
    getAds.mockResolvedValue(listResponse([makeAd(1, { images: [] })]));
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.handlePreview(1);
    await flushPromises();
    await nextTick();
    hideSpy.mockClear();

    const previewModal = wrapper.find("#previewModal");
    // header close (btn-close) + footer Close button both bound to closePeview
    await previewModal.find("button.btn-close").trigger("click");
    expect(hideSpy).toHaveBeenCalled();

    hideSpy.mockClear();
    const footerClose = previewModal
      .findAll("button")
      .find((b) => b.text().trim() === "Close");
    await footerClose.trigger("click");
    expect(hideSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // AdsTable :ads nullish-coalescing fallback (ads ?? []) -> right-hand branch
  // ---------------------------------------------------------------------------
  it("passes [] to AdsTable when ads is nullish (?? fallback branch)", async () => {
    const wrapper = mountView();
    await flushPromises();

    // Force ads to null so the `ads ?? []` template expression takes its
    // right-hand branch when re-rendering.
    wrapper.vm.ads = null;
    await nextTick();

    const table = wrapper.findComponent({ name: "AdsTable" });
    expect(table.props("ads")).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal: clicking the Delete button triggers deleteAd
  // ---------------------------------------------------------------------------
  it("clicking the Delete button in the modal triggers deleteAd", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    await nextTick();
    removeAd.mockClear();

    const deleteBtn = wrapper
      .find("#deleteModal")
      .findAll("button")
      .find((b) => b.text().includes("Delete Ad"));
    await deleteBtn.trigger("click");
    await flushPromises();
    expect(removeAd).toHaveBeenCalledWith(1);
    wrapper.unmount();
  });
});

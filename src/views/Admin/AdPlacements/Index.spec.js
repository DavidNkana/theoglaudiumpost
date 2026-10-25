import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the ads service boundary ---
const { getAdPlacements, removeAdPlacement } = vi.hoisted(() => ({
  getAdPlacements: vi.fn(),
  removeAdPlacement: vi.fn(),
}));

vi.mock("@/features/ads/AdsService", () => ({
  getAdPlacements,
  removeAdPlacement,
}));

// --- Mock bootstrap's Modal so we control instances and assert show/hide ---
const { modalShow, modalHide, ModalCtor } = vi.hoisted(() => {
  const modalShow = vi.fn();
  const modalHide = vi.fn();
  const ModalCtor = vi.fn(function (el) {
    this.el = el;
    this.show = modalShow;
    this.hide = modalHide;
  });
  return { modalShow, modalHide, ModalCtor };
});

vi.mock("bootstrap", () => ({ Modal: ModalCtor }));

// --- Mock lodash debounce to invoke synchronously (deterministic) ---
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    return wrapped;
  },
}));

// --- Mock vue-router ---
const { routerReplace, routerPush, routeRef } = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  routerPush: vi.fn(),
  routeRef: { query: {} },
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  useRoute: () => routeRef,
}));

import Index from "./Index.vue";

const okResponse = (placements = [], page = 0, size = 10, totalPages = 3) => ({
  status: 200,
  data: { placements, page, size, totalPages },
});

const sampleAds = [
  { id: 1, title: "Home Banner", location: "home_banner", status: "active" },
  { id: 2, title: "Footer", location: "footer", status: "inactive" },
];

function factory() {
  return mount(Index, {
    global: {
      stubs: {
        AdPlacementsTable: {
          name: "AdPlacementsTable",
          props: ["adPlacements", "isLoading", "page", "pageSize"],
          emits: ["handle-delete", "handle-preview", "handle-edit"],
          template: `<div class="ad-table">{{ adPlacements.length }}</div>`,
        },
        AdForm: {
          name: "AdForm",
          props: ["adPlacement"],
          emits: ["close", "add-ad-placement", "update-ad-placement"],
          template: `<div class="ad-form"></div>`,
        },
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });
}

beforeEach(() => {
  getAdPlacements.mockReset();
  removeAdPlacement.mockReset();
  modalShow.mockClear();
  modalHide.mockClear();
  ModalCtor.mockClear();
  routerReplace.mockClear();
  routerPush.mockClear();
  routeRef.query = {};
  // default success
  getAdPlacements.mockResolvedValue(okResponse(sampleAds));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Admin/AdPlacements/Index.vue", () => {
  it("mounts, reads empty route query defaults, fetches ads and renders results", async () => {
    const wrapper = factory();
    await flushPromises();

    // onMounted -> two Modal instances constructed (delete + form)
    expect(ModalCtor).toHaveBeenCalledTimes(2);
    // fetch resolved with 2 ads
    expect(getAdPlacements).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });
    expect(wrapper.find(".ad-table").text()).toBe("2");
    // pagination.total = totalPages = 3 -> nav rendered (v-if true)
    expect(wrapper.find("nav").exists()).toBe(true);
    wrapper.unmount();
  });

  it("hydrates filters and pagination from populated route query on mount", async () => {
    routeRef.query = {
      search: "shoes",
      category: "cat1",
      status: "active",
      page: "2",
      size: "25",
    };
    const wrapper = factory();
    await flushPromises();

    expect(getAdPlacements).toHaveBeenCalledWith({
      page: 2,
      search: "shoes",
      size: 25,
      status: "active",
    });
    // query watcher fired with defined values (first call reflects hydrated route)
    expect(routerReplace).toHaveBeenCalled();
    const firstCall = routerReplace.mock.calls[0][0];
    expect(firstCall.query.search).toBe("shoes");
    expect(firstCall.query.status).toBe("active");
    expect(firstCall.query.category).toBe("cat1");
    expect(firstCall.query.page).toBe(2);
    expect(firstCall.query.size).toBe(25);
    wrapper.unmount();
  });

  it("renders no pagination nav when total is 0 (empty list)", async () => {
    getAdPlacements.mockResolvedValue(okResponse([], 0, 10, 0));
    const wrapper = factory();
    await flushPromises();

    expect(wrapper.find(".ad-table").text()).toBe("0");
    expect(wrapper.find("nav").exists()).toBe(false);
    wrapper.unmount();
  });

  it("handles non-200 response by throwing into catch (loading reset, data unchanged)", async () => {
    getAdPlacements.mockResolvedValue({ status: 500, data: {} });
    const wrapper = factory();
    await flushPromises();

    // catch path: adPlacements stays empty, no nav
    expect(wrapper.find(".ad-table").text()).toBe("0");
    expect(wrapper.find("nav").exists()).toBe(false);
    wrapper.unmount();
  });

  it("handles rejected fetch (catch branch resets loading)", async () => {
    getAdPlacements.mockRejectedValue(new Error("network"));
    const wrapper = factory();
    await flushPromises();

    expect(wrapper.find(".ad-table").text()).toBe("0");
    wrapper.unmount();
  });

  it("guards concurrent fetch: returns early when already loading", async () => {
    // first call never resolves to keep loading=true
    let resolveFirst;
    getAdPlacements.mockReturnValueOnce(
      new Promise((res) => {
        resolveFirst = res;
      })
    );
    const wrapper = factory();
    // onMounted fetch is in-flight (loading=true). Trigger another via applyFilters
    // by changing page size select -> applyFilters -> fetchAds guarded out.
    const callsBefore = getAdPlacements.mock.calls.length;

    // changing search triggers watcher -> debouncedFetchAds -> fetchAds (guarded)
    await wrapper.find('input[type="text"]').setValue("abc");
    await flushPromises();

    // still only the initial in-flight call (guard returned early)
    expect(getAdPlacements.mock.calls.length).toBe(callsBefore);

    // let the first finish
    resolveFirst(okResponse(sampleAds));
    await flushPromises();
    wrapper.unmount();
  });

  it("search watcher triggers a (debounced, here synchronous) refetch", async () => {
    const wrapper = factory();
    await flushPromises();
    getAdPlacements.mockClear();

    await wrapper.find('input[type="text"]').setValue("query");
    await flushPromises();

    expect(getAdPlacements).toHaveBeenCalledWith(
      expect.objectContaining({ search: "query" })
    );
    wrapper.unmount();
  });

  it("changePage ignores out-of-range pages and navigates valid ones", async () => {
    const wrapper = factory();
    await flushPromises();
    getAdPlacements.mockClear();

    const links = wrapper.findAll(".pagination .page-link");
    // "Previous" at index 0 -> changePage(-1) -> out of range (page<0), no fetch
    await links[0].trigger("click");
    await flushPromises();
    expect(getAdPlacements).not.toHaveBeenCalled();

    // a numbered page link -> valid changePage
    const numbered = wrapper
      .findAll(".pagination .page-item")
      .find((li) => /^\d+$/.test(li.text().trim()));
    await numbered.find(".page-link").trigger("click");
    await flushPromises();
    expect(getAdPlacements).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it("changePage ignores page beyond last_page via Next when on last page", async () => {
    // last_page = totalPages-1. Set current_page === last_page so Next is out of range.
    getAdPlacements.mockResolvedValue(okResponse(sampleAds, 1, 10, 2));
    // last_page = 2-1 = 1; need current_page=1 to be on last page
    routeRef.query = { page: "1" };
    const wrapper = factory();
    await flushPromises();
    getAdPlacements.mockClear();

    // Next link is the last page-link
    const links = wrapper.findAll(".pagination .page-link");
    const nextLink = links[links.length - 1];
    await nextLink.trigger("click");
    await flushPromises();
    // current_page(1) === last_page(1) -> changePage(2) out of range -> no fetch
    expect(getAdPlacements).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("getPageNumbers compresses the start window when near the end", async () => {
    // total large, current near the end so endPage-startPage<4 triggers re-clamp
    getAdPlacements.mockResolvedValue(okResponse(sampleAds, 9, 10, 10));
    routeRef.query = { page: "9" };
    const wrapper = factory();
    await flushPromises();

    const pageNums = wrapper
      .findAll(".pagination .page-item")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    // should be 5 numbered pages ending at 10
    expect(pageNums.length).toBe(5);
    expect(pageNums[pageNums.length - 1]).toBe("10");
    wrapper.unmount();
  });

  it("getPageNumbers keeps the full window mid-range (endPage-startPage >= 4 branch)", async () => {
    // total=10, current_page=4 -> startPage=3, endPage=7 -> diff=4 (NOT < 4)
    getAdPlacements.mockResolvedValue(okResponse(sampleAds, 4, 10, 10));
    routeRef.query = { page: "4" };
    const wrapper = factory();
    await flushPromises();

    const pageNums = wrapper
      .findAll(".pagination .page-item")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    expect(pageNums).toEqual(["3", "4", "5", "6", "7"]);
    wrapper.unmount();
  });

  it("passes [] to the table when the API returns null placements (?? [] branch)", async () => {
    getAdPlacements.mockResolvedValue({
      status: 200,
      data: { placements: null, page: 0, size: 10, totalPages: 3 },
    });
    const wrapper = factory();
    await flushPromises();

    // adPlacements.value === null -> template coalesces to [] -> table renders length 0
    expect(wrapper.find(".ad-table").text()).toBe("0");
    wrapper.unmount();
  });

  it("changing page size select calls applyFilters and refetches from page 0", async () => {
    const wrapper = factory();
    await flushPromises();
    getAdPlacements.mockClear();

    const select = wrapper.find("#pageSizeSelect");
    await select.setValue(25);
    await flushPromises();

    expect(getAdPlacements).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 25 })
    );
    wrapper.unmount();
  });

  it("confirmDelete shows modal when ad is found", async () => {
    const wrapper = factory();
    await flushPromises();

    wrapper.findComponent({ name: "AdPlacementsTable" }).vm.$emit("handle-delete", 1);
    await flushPromises();

    expect(modalShow).toHaveBeenCalled();
    // selected title rendered in delete modal
    expect(wrapper.find("#deleteModal .fw-bold").text()).toBe("Home Banner");
    wrapper.unmount();
  });

  it("confirmDelete does not show modal when ad is not found", async () => {
    const wrapper = factory();
    await flushPromises();
    modalShow.mockClear();

    wrapper
      .findComponent({ name: "AdPlacementsTable" })
      .vm.$emit("handle-delete", 999);
    await flushPromises();

    expect(modalShow).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("deleteAd success: removes ad, hides modal, resets selection", async () => {
    removeAdPlacement.mockResolvedValue({ status: 200 });
    const wrapper = factory();
    await flushPromises();

    // select an ad first
    wrapper.findComponent({ name: "AdPlacementsTable" }).vm.$emit("handle-delete", 1);
    await flushPromises();

    await wrapper.find("#deleteModal .btn-danger").trigger("click");
    await flushPromises();

    expect(removeAdPlacement).toHaveBeenCalledWith(1);
    expect(modalHide).toHaveBeenCalled();
    // ad with id 1 removed -> table now shows 1
    expect(wrapper.find(".ad-table").text()).toBe("1");
    wrapper.unmount();
  });

  it("deleteAd failure: alerts and resets isDeleting (catch branch)", async () => {
    removeAdPlacement.mockRejectedValue(new Error("boom"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = factory();
    await flushPromises();

    wrapper.findComponent({ name: "AdPlacementsTable" }).vm.$emit("handle-delete", 1);
    await flushPromises();

    await wrapper.find("#deleteModal .btn-danger").trigger("click");
    await flushPromises();

    expect(alertSpy).toHaveBeenCalledWith("Failed to delete ad. Please try again.");
    // delete button no longer disabled (isDeleting reset)
    expect(wrapper.find("#deleteModal .btn-danger").attributes("disabled")).toBeUndefined();
    wrapper.unmount();
  });

  it("toggles isDeleting text on the delete button while deleting", async () => {
    let resolveRemove;
    removeAdPlacement.mockReturnValue(
      new Promise((res) => {
        resolveRemove = res;
      })
    );
    const wrapper = factory();
    await flushPromises();

    wrapper.findComponent({ name: "AdPlacementsTable" }).vm.$emit("handle-delete", 1);
    await flushPromises();

    const btn = wrapper.find("#deleteModal .btn-danger");
    await btn.trigger("click");
    await wrapper.vm.$nextTick();
    // while in-flight isDeleting=true
    expect(btn.text()).toBe("Deleting...");
    expect(btn.attributes("disabled")).toBeDefined();

    resolveRemove({ status: 200 });
    await flushPromises();
    expect(wrapper.find("#deleteModal .btn-danger").text()).toBe("Delete");
    wrapper.unmount();
  });

  it("handle-preview sets selected ad (found and not-found)", async () => {
    const wrapper = factory();
    await flushPromises();
    const table = wrapper.findComponent({ name: "AdPlacementsTable" });

    // not found -> selectedAdPlacement undefined -> delete modal title empty
    table.vm.$emit("handle-preview", 999);
    await flushPromises();
    expect(wrapper.find("#deleteModal .fw-bold").text()).toBe("");

    // found -> title set
    table.vm.$emit("handle-preview", 2);
    await flushPromises();
    expect(wrapper.find("#deleteModal .fw-bold").text()).toBe("Footer");
    wrapper.unmount();
  });

  it("openUpdateModal shows form modal when ad found, ignores when not found", async () => {
    const wrapper = factory();
    await flushPromises();
    const table = wrapper.findComponent({ name: "AdPlacementsTable" });

    // not found
    table.vm.$emit("handle-edit", 999);
    await flushPromises();
    expect(modalShow).not.toHaveBeenCalled();

    // found
    table.vm.$emit("handle-edit", 1);
    await flushPromises();
    expect(modalShow).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("AdForm close event hides form modal and clears selection", async () => {
    const wrapper = factory();
    await flushPromises();

    // select something first
    wrapper.findComponent({ name: "AdPlacementsTable" }).vm.$emit("handle-edit", 1);
    await flushPromises();
    modalHide.mockClear();

    wrapper.findComponent({ name: "AdForm" }).vm.$emit("close");
    await flushPromises();

    expect(modalHide).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("AdForm add-ad-placement prepends a new placement", async () => {
    const wrapper = factory();
    await flushPromises();

    wrapper
      .findComponent({ name: "AdForm" })
      .vm.$emit("add-ad-placement", { id: 99, title: "New", location: "x", status: "active" });
    await flushPromises();

    expect(wrapper.find(".ad-table").text()).toBe("3");
    wrapper.unmount();
  });

  it("AdForm update-ad-placement updates matching ad and leaves others (both map branches)", async () => {
    const wrapper = factory();
    await flushPromises();

    wrapper
      .findComponent({ name: "AdForm" })
      .vm.$emit("update-ad-placement", { id: 1, title: "Updated Banner" });
    await flushPromises();

    // length unchanged (update, not add) -> exercises both map branches
    expect(wrapper.find(".ad-table").text()).toBe("2");

    // select id 1 via delete to read the updated title
    wrapper.findComponent({ name: "AdPlacementsTable" }).vm.$emit("handle-delete", 1);
    await flushPromises();
    expect(wrapper.find("#deleteModal .fw-bold").text()).toBe("Updated Banner");
    wrapper.unmount();
  });

  it("changeStatus toggles status filter on and off (both ternary branches)", async () => {
    const wrapper = factory();
    await flushPromises();

    // Invoke via exposed function path: trigger through the query watcher.
    // changeStatus isn't bound in template, so call through component internals.
    const vm = wrapper.vm;
    // first call sets status to 'active'
    getAdPlacements.mockClear();
    vm.changeStatus("active");
    await flushPromises();
    expect(getAdPlacements).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active" })
    );
    // second call with same value toggles back to ""
    vm.changeStatus("active");
    await flushPromises();
    expect(getAdPlacements).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "" })
    );
    wrapper.unmount();
  });

  it("clearFilters resets search/category and refetches from page 0", async () => {
    routeRef.query = { search: "shoes", category: "cat1" };
    const wrapper = factory();
    await flushPromises();
    getAdPlacements.mockClear();

    wrapper.vm.clearFilters();
    await flushPromises();

    expect(getAdPlacements).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0, search: "" })
    );
    wrapper.unmount();
  });

  it("openCreateModal shows the form modal", async () => {
    const wrapper = factory();
    await flushPromises();
    modalShow.mockClear();

    await wrapper.vm.openCreateModal();
    await flushPromises();
    expect(modalShow).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("query watcher serializes empty filters to undefined (|| undefined branch)", async () => {
    // start with non-empty filters so clearing them is a real change that fires the watcher
    routeRef.query = { search: "shoes", category: "cat1", status: "active" };
    const wrapper = factory();
    await flushPromises();
    routerReplace.mockClear();

    // clear search + category (changeStatus toggles status off)
    wrapper.vm.changeStatus("active");
    wrapper.vm.clearFilters();
    await flushPromises();

    expect(routerReplace).toHaveBeenCalled();
    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBeUndefined();
    expect(lastCall.query.category).toBeUndefined();
    expect(lastCall.query.status).toBeUndefined();
    expect(lastCall.query.page).toBe(0);
    expect(lastCall.query.size).toBe(10);
    wrapper.unmount();
  });
});

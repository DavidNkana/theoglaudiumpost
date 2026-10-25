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

// --- Mock lodash debounce: run synchronously so the search watch is deterministic
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    wrapped.flush = vi.fn();
    return wrapped;
  },
}));

// --- Mock the SweetAlert composable (external boundary -> sweetalert2) ---------
const showToast = vi.fn();
vi.mock("@/composables/useSweetAlert", () => ({
  useSweetAlert: () => ({ showToast }),
}));

// --- Mock devLog (external boundary -> @/config/env) --------------------------
vi.mock("@/utils/devLog", () => ({
  devLog: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), success: vi.fn(), debug: vi.fn() },
}));

// --- Mock announcements service ----------------------------------------------
const getAnnouncements = vi.fn();
const getCategories = vi.fn();
const removeAnnouncement = vi.fn();
vi.mock("@/features/announcements/AnnouncementsService", () => ({
  getAnnouncements: (...a) => getAnnouncements(...a),
  getCategories: (...a) => getCategories(...a),
  removeAnnouncement: (...a) => removeAnnouncement(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ query: routeQuery }),
}));

import Index from "./Index.vue";

const makeNotice = (id, name = `Notice ${id}`) => ({ id, name });

const okResponse = (overrides = {}) => ({
  status: 200,
  data: {
    announcements: [makeNotice(1), makeNotice(2)],
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
        NoticesTable: true,
        AnnouncementForm: true,
        Preview: true,
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });

describe("Admin/Announcements/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeQuery = {};
    getAnnouncements.mockResolvedValue(okResponse());
    getCategories.mockResolvedValue({
      data: { categories: [{ id: 7, name: "Events" }] },
    });
    removeAnnouncement.mockResolvedValue({});
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches announcements + categories (success, default branches)", async () => {
    const wrapper = mountView();
    await flushPromises();

    // getAnnouncements called with defaults; status is "" (not nullish) so the
    // "?? ' '" left operand is kept.
    expect(getAnnouncements).toHaveBeenCalledWith({
      page: 0,
      search: "",
      category: "",
      priority: "",
      size: 10,
      status: "",
    });
    // 3 modal instances created (delete, form, preview)
    expect(ModalSpy).toHaveBeenCalledTimes(3);

    // categories loaded -> v-for non-empty renders the option
    expect(wrapper.find("select.form-select").text()).toContain("Events");

    // NoticesTable rendered, pagination visible because total (totalPages) > 0
    expect(wrapper.findComponent({ name: "NoticesTable" }).exists()).toBe(true);
    expect(
      wrapper.find('nav[aria-label="announcements pagination"]').exists()
    ).toBe(true);

    // No active filters -> Clear Filters button hidden
    expect(wrapper.text()).not.toContain("Clear Filters");
    wrapper.unmount();
  });

  it("initializes from populated query params (truthy onMounted branches + Clear Filters shown)", async () => {
    routeQuery = {
      search: "hello",
      category: "cat",
      status: "active",
      priority: "high",
      page: "2",
      size: "25",
    };
    const wrapper = mountView();
    await flushPromises();

    // status truthy -> "?? ' '" left branch keeps "active"
    expect(getAnnouncements).toHaveBeenCalledWith({
      page: 2,
      search: "hello",
      category: "cat",
      priority: "high",
      size: 25,
      status: "active",
    });

    // v-if="filters.search || ..." -> Clear Filters visible
    expect(wrapper.text()).toContain("Clear Filters");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCategories: data?.categories ?? [] fallback (no categories key)
  // ---------------------------------------------------------------------------
  it("falls back to empty categories list when response data lacks categories", async () => {
    getCategories.mockResolvedValue({ data: {} });
    const wrapper = mountView();
    await flushPromises();

    // category select has only the "All Categories" option (v-for empty)
    const options = wrapper.find("select.form-select").findAll("option");
    expect(options).toHaveLength(1);
    expect(options[0].text()).toBe("All Categories");
    wrapper.unmount();
  });

  it("falls back to empty categories when response has no data (optional chaining)", async () => {
    getCategories.mockResolvedValue({});
    const wrapper = mountView();
    await flushPromises();

    const options = wrapper.find("select.form-select").findAll("option");
    expect(options).toHaveLength(1);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCategories: early return when already populated
  // ---------------------------------------------------------------------------
  it("does not re-fetch categories when already loaded (length != 0 guard)", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(getCategories).toHaveBeenCalledTimes(1);

    await wrapper.vm.fetchCategories();
    // early return -> still only the initial call
    expect(getCategories).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCategories: reject -> catch
  // ---------------------------------------------------------------------------
  it("logs and swallows category fetch errors (catch branch)", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    getCategories.mockRejectedValue(new Error("cat boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(consoleErr).toHaveBeenCalledWith(
      "Error fetching categories:",
      expect.any(Error)
    );
    consoleErr.mockRestore();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAnnouncements: non-200 -> throw -> catch
  // ---------------------------------------------------------------------------
  it("handles non-200 status by entering the catch branch (announcements unchanged)", async () => {
    getAnnouncements.mockResolvedValue({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    // catch ran -> loading false, announcements stayed empty
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.announcements).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAnnouncements: rejected promise -> catch
  // ---------------------------------------------------------------------------
  it("handles a rejected announcements fetch (catch branch)", async () => {
    getAnnouncements.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.loading).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAnnouncements: early return while loading
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getAnnouncements.mockImplementation(
      () => new Promise((res) => { resolveFn = res; })
    );
    const wrapper = mountView();
    await nextTick();
    expect(getAnnouncements).toHaveBeenCalledTimes(1);

    // changeStatus while loading -> fetchAnnouncements early-returns
    wrapper.vm.changeStatus("published");
    expect(getAnnouncements).toHaveBeenCalledTimes(1);

    resolveFn(okResponse());
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete found + deleteAnnouncement success
  // ---------------------------------------------------------------------------
  it("confirms and deletes a notice successfully", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAnnouncement.id).toBe(1);

    await wrapper.vm.deleteAnnouncement();
    await flushPromises();

    expect(removeAnnouncement).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Notice deleted successfully"
    );
    // notice 1 removed, notice 2 remains
    expect(wrapper.vm.announcements.map((a) => a.id)).toEqual([2]);
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete not found -> show not called
  // ---------------------------------------------------------------------------
  it("confirmDelete with unknown id does not open the modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(9999);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteAnnouncement reject -> catch -> error toast
  // ---------------------------------------------------------------------------
  it("shows an error toast when removeAnnouncement rejects", async () => {
    const wrapper = mountView();
    await flushPromises();

    removeAnnouncement.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteAnnouncement();
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith("error", "Error deleting Notice");
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // handlePreview found + not found
  // ---------------------------------------------------------------------------
  it("handlePreview opens the preview modal and renders Preview when notice exists", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.handlePreview(2);
    await nextTick();
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAnnouncement.id).toBe(2);
    // v-if="selectedAnnouncement" -> Preview rendered
    expect(wrapper.findComponent({ name: "Preview" }).exists()).toBe(true);
    wrapper.unmount();
  });

  it("handlePreview does nothing when the notice does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.handlePreview(424242);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closePeview
  // ---------------------------------------------------------------------------
  it("closePeview hides preview modal and clears selection (Preview unrendered)", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.handlePreview(1);
    await nextTick();
    hideSpy.mockClear();

    wrapper.vm.closePeview();
    await nextTick();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAnnouncement).toBe(null);
    // v-if false -> Preview no longer rendered
    expect(wrapper.findComponent({ name: "Preview" }).exists()).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openCreateModal
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
  it("openUpdateModal selects the notice and shows the form modal when it exists", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(2);
    expect(wrapper.vm.selectedAnnouncement.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("openUpdateModal does nothing when the notice does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(123456);
    expect(showSpy).not.toHaveBeenCalled();
    // selectedAnnouncement falls back to undefined (find returned nothing)
    expect(wrapper.vm.selectedAnnouncement).toBeUndefined();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm
  // ---------------------------------------------------------------------------
  it("closeForm hides the form modal and clears selection", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closeForm();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedAnnouncement).toBe(null);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // addAnnouncement -> prepends
  // ---------------------------------------------------------------------------
  it("addAnnouncement prepends a new notice", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.addAnnouncement(makeNotice(99, "Fresh"));
    expect(wrapper.vm.announcements[0].id).toBe(99);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // updateAnnouncement -> matched + non-matched branches
  // ---------------------------------------------------------------------------
  it("updateAnnouncement updates the matching notice and leaves others unchanged", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.updateAnnouncement({ id: 2, name: "Updated 2" });
    const names = wrapper.vm.announcements.map((a) => a.name);
    expect(names).toContain("Updated 2"); // matched branch
    expect(names).toContain("Notice 1"); // non-matched branch
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: out of range (low + high) + valid
  // ---------------------------------------------------------------------------
  it("changePage ignores out-of-range pages and fetches for valid pages", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();

    // last_page = totalPages - 1 = 3 - 1 = 2
    wrapper.vm.changePage(-1); // page < 0
    wrapper.vm.changePage(99); // page > last_page
    expect(getAnnouncements).not.toHaveBeenCalled();

    wrapper.vm.changePage(1); // valid
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // getPageNumbers branches + pagination link clicks (Prev/Next/numbered)
  // ---------------------------------------------------------------------------
  it("renders page-number links and navigates via clicks", async () => {
    getAnnouncements.mockResolvedValue(
      okResponse({ announcements: [makeNotice(1)], page: 5, totalPages: 10 })
    );
    routeQuery = { page: "5" };
    const wrapper = mountView();
    await flushPromises();

    const pageLinks = wrapper.findAll("ul.pagination li a.page-link");
    expect(pageLinks.length).toBeGreaterThan(0);

    getAnnouncements.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    expect(numbered.length).toBeGreaterThan(0);
    await numbered[0].find("a").trigger("click");
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("covers getPageNumbers startPage recompute near the end of the range", async () => {
    // current_page + 1 = 10, total = 10 -> startPage=8, endPage=10, span=2<4 ->
    // startPage recomputed to max(1, 10-4)=6.
    getAnnouncements.mockResolvedValue(
      okResponse({ announcements: [makeNotice(1)], page: 9, totalPages: 10 })
    );
    routeQuery = { page: "9" };
    const wrapper = mountView();
    await flushPromises();

    const numbered = wrapper
      .findAll("ul.pagination li")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    expect(numbered[0]).toBe("6");
    expect(numbered[numbered.length - 1]).toBe("10");
    wrapper.unmount();
  });

  it("renders Previous disabled on the first page and navigates Next", async () => {
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // current_page === 0 -> Previous (first li) disabled, active class on page 1
    expect(items[0].classes()).toContain("disabled");
    const activeItem = wrapper.find("ul.pagination li.page-item.active");
    expect(activeItem.exists()).toBe(true);

    getAnnouncements.mockClear();
    const nextLink = items[items.length - 1].find("a");
    await nextLink.trigger("click");
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders Next disabled when on the last page", async () => {
    getAnnouncements.mockResolvedValue(
      okResponse({ announcements: [makeNotice(1)], page: 2, totalPages: 3 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // last_page = 3 - 1 = 2, current_page = 2 -> Next disabled
    expect(items[items.length - 1].classes()).toContain("disabled");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // pagination hidden when total === 0
  // ---------------------------------------------------------------------------
  it("hides pagination when total is 0", async () => {
    getAnnouncements.mockResolvedValue(
      okResponse({ announcements: [], totalPages: 0 })
    );
    const wrapper = mountView();
    await flushPromises();

    expect(
      wrapper.find('nav[aria-label="announcements pagination"]').exists()
    ).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // applyFilters via page-size select @change
  // ---------------------------------------------------------------------------
  it("applyFilters via the page-size select resets to first page and refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();

    // applyFilters -> fetchAnnouncements overwrites pagination from the response;
    // echo size: 25 so the post-fetch per_page stays 25.
    getAnnouncements.mockResolvedValue(okResponse({ page: 0, size: 25 }));

    const select = wrapper.find("#pageSizeSelect");
    // The option values are numbers (:value="25"); select the "25" option element
    // and trigger change so v-model writes the numeric value and @change fires.
    const option25 = select.findAll("option").find((o) => o.text().trim() === "25");
    option25.element.selected = true;
    await select.trigger("change");
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(wrapper.vm.pagination.per_page).toBe(25);
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("applyFilters via the Apply Filters button refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();

    const applyBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Apply Filters"));
    await applyBtn.trigger("click");
    await flushPromises();
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // clearFilters via Clear Filters button
  // ---------------------------------------------------------------------------
  it("clearFilters resets category/priority/search and refetches", async () => {
    routeQuery = { search: "x", category: "y", priority: "high", status: "published" };
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();

    const clearBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Clear Filters"));
    expect(clearBtn).toBeTruthy();
    await clearBtn.trigger("click");
    await flushPromises();

    // status preserved (spread), the rest cleared
    expect(wrapper.vm.filters).toEqual({
      search: "",
      category: "",
      priority: "",
      status: "published",
    });
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Clear Filters visibility: each OR operand alone
  // ---------------------------------------------------------------------------
  it("shows Clear Filters when only category is set (OR middle operand)", async () => {
    routeQuery = { category: "cat" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Clear Filters");
    wrapper.unmount();
  });

  it("shows Clear Filters when only priority is set (OR last operand)", async () => {
    routeQuery = { priority: "low" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Clear Filters");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // category + priority <select> v-model update handlers
  // ---------------------------------------------------------------------------
  it("selecting a category and a priority updates the bound filters (v-model handlers)", async () => {
    const wrapper = mountView();
    await flushPromises();

    const selects = wrapper.findAll("select.form-select");
    const categorySelect = selects[0]; // first form-select is category
    const prioritySelect = selects[1]; // second is priority

    // category options: "All Categories" + the loaded "Events" (value 7)
    const eventsOption = categorySelect
      .findAll("option")
      .find((o) => o.text().trim() === "Events");
    eventsOption.element.selected = true;
    await categorySelect.trigger("change");
    expect(wrapper.vm.filters.category).toBe(7);

    // priority options: All Priorities + high/medium/low
    const highOption = prioritySelect
      .findAll("option")
      .find((o) => o.text().trim() === "high");
    highOption.element.selected = true;
    await prioritySelect.trigger("change");
    expect(wrapper.vm.filters.priority).toBe("high");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Previous page link click from a non-first page (line 394 handler)
  // ---------------------------------------------------------------------------
  it("clicking Previous on a non-first page navigates back a page", async () => {
    getAnnouncements.mockResolvedValue(
      okResponse({ announcements: [makeNotice(1)], page: 2, totalPages: 5 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(2);

    // The refetch overwrites pagination from the response; echo page: 1.
    getAnnouncements.mockClear();
    getAnnouncements.mockResolvedValue(
      okResponse({ announcements: [makeNotice(1)], page: 1, totalPages: 5 })
    );
    const items = wrapper.findAll("ul.pagination li.page-item");
    const prevLink = items[0].find("a"); // first li is Previous
    await prevLink.trigger("click");
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getAnnouncements).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changeStatus toggle: set then unset (both ternary sides)
  // ---------------------------------------------------------------------------
  it("changeStatus toggles a status on then off (both ternary sides)", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();

    wrapper.vm.changeStatus("published"); // "" -> "published"
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("published");

    wrapper.vm.changeStatus("published"); // "published" -> "" (other ternary side)
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced, mocked sync) + router.replace watcher
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers the debounced fetch and a router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();
    routerReplace.mockClear();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("query");
    await flushPromises();

    expect(getAnnouncements).toHaveBeenCalled();
    // router.replace called with search present; category/priority/status undefined
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("router-query watcher emits all populated keys when every filter is set", async () => {
    routeQuery = {
      search: "s",
      category: "c",
      priority: "high",
      status: "published",
      page: "2",
      size: "25",
    };
    // fetchAnnouncements success overwrites pagination from the response, so echo
    // size: 25 to keep per_page truthy in the emitted query.
    getAnnouncements.mockResolvedValue(okResponse({ page: 0, size: 25 }));
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    // Mutate a watched source -> watcher fires with all keys truthy.
    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    expect(routerReplace).toHaveBeenCalledWith({
      query: {
        search: "s",
        category: "c",
        priority: "high",
        status: "published",
        page: 1,
        size: 25,
      },
    });
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal rendered state: selectedAnnouncement?.name + isDeleting ternary
  // ---------------------------------------------------------------------------
  it("renders the selected notice name and the deleting label in the delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedAnnouncement = makeNotice(1, "My Notice");
    wrapper.vm.isDeleting = true;
    await nextTick();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Notice"); // selectedAnnouncement?.name truthy
    expect(modal.text()).toContain("Deleting..."); // isDeleting true branch

    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Announcement"); // isDeleting false branch
    wrapper.unmount();
  });

  it("renders an empty name when no notice is selected (optional chaining falsy)", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedAnnouncement = null;
    await nextTick();
    const nameP = wrapper.find("#deleteModal .fw-bold");
    expect(nameP.text()).toBe(""); // selectedAnnouncement?.name -> undefined render
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchAnnouncements: status nullish -> "?? ' '" right branch
  // ---------------------------------------------------------------------------
  it("passes ' ' as status when filters.status is nullish (?? right branch)", async () => {
    const wrapper = mountView();
    await flushPromises();
    getAnnouncements.mockClear();

    wrapper.vm.filters.status = null;
    wrapper.vm.applyFilters();
    await flushPromises();

    expect(getAnnouncements).toHaveBeenCalledWith(
      expect.objectContaining({ status: " " })
    );
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // NoticesTable :announcements="announcements ?? []" -> right branch
  // ---------------------------------------------------------------------------
  it("passes an empty array to NoticesTable when announcements is nullish (?? right branch)", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.announcements = null;
    await nextTick();

    const table = wrapper.findComponent({ name: "NoticesTable" });
    expect(table.props("announcements")).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // NoticesTable emitted events wired to handlers
  // ---------------------------------------------------------------------------
  it("wires NoticesTable emitted events to confirmDelete/handlePreview/openUpdateModal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    const table = wrapper.findComponent({ name: "NoticesTable" });

    table.vm.$emit("handle-delete", 1);
    await nextTick();
    expect(wrapper.vm.selectedAnnouncement.id).toBe(1);

    table.vm.$emit("handle-preview", 2);
    await nextTick();
    expect(wrapper.vm.selectedAnnouncement.id).toBe(2);

    table.vm.$emit("handle-edit", 1);
    await nextTick();
    expect(wrapper.vm.selectedAnnouncement.id).toBe(1);

    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });
});

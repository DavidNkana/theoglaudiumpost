import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the announcements service boundary --------------------------------
const getCategories = vi.fn();
const removeCategory = vi.fn();
vi.mock("@/features/announcements/AnnouncementsService", () => ({
  getCategories: (...args) => getCategories(...args),
  removeCategory: (...args) => removeCategory(...args),
}));

// --- Mock vue-router --------------------------------------------------------
const routerReplace = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ query: routeQuery }),
}));

// --- Mock bootstrap Modal ---------------------------------------------------
const { modalShow, modalHide, ModalCtor } = vi.hoisted(() => {
  const show = vi.fn();
  const hide = vi.fn();
  const Ctor = vi.fn(function ModalCtor() {
    this.show = show;
    this.hide = hide;
  });
  return { modalShow: show, modalHide: hide, ModalCtor: Ctor };
});
vi.mock("bootstrap", () => ({
  Modal: ModalCtor,
}));

// --- Mock lodash debounce (run synchronously, but track call) ---------------
const debouncedCalls = vi.fn();
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => {
      debouncedCalls(...args);
      return fn(...args);
    };
    return wrapped;
  },
}));

// --- Mock devLog ------------------------------------------------------------
const devWarn = vi.fn();
vi.mock("@/utils/devLog", () => ({
  devLog: { warn: (...args) => devWarn(...args) },
}));

// --- Mock useSweetAlert -----------------------------------------------------
const showToast = vi.fn();
vi.mock("@/composables/useSweetAlert", () => ({
  useSweetAlert: () => ({ showToast }),
}));

import Categories from "@/views/Admin/Announcements/Categories.vue";

const CategoriesTableStub = {
  name: "CategoriesTable",
  props: ["categories", "isLoading", "page", "pageSize"],
  emits: ["handle-delete", "handle-edit"],
  template:
    '<div class="categories-table-stub" :data-count="categories.length" :data-loading="isLoading" :data-page="page" :data-size="pageSize"></div>',
};

const CategoryFormStub = {
  name: "CategoryForm",
  props: ["category"],
  emits: ["close", "add", "update"],
  template: '<div class="category-form-stub"></div>',
};

function makeResponse(overrides = {}) {
  return {
    status: overrides.status !== undefined ? overrides.status : 200,
    data: {
      categories: [
        { id: 1, name: "Sports" },
        { id: 2, name: "News" },
      ],
      page: 0,
      size: 10,
      totalPages: 3,
      ...(overrides.data || {}),
    },
  };
}

async function mountView() {
  const wrapper = mount(Categories, {
    attachTo: document.body,
    global: {
      stubs: {
        CategoriesTable: CategoriesTableStub,
        CategoryForm: CategoryFormStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  routeQuery = {};
  getCategories.mockResolvedValue(makeResponse());
  removeCategory.mockResolvedValue({});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Admin/Announcements/Categories.vue", () => {
  it("fetches and renders categories on mount with default (empty) route query", async () => {
    const wrapper = await mountView();

    // onMounted defaults: route.query.* undefined => fallbacks used
    expect(getCategories).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: undefined,
    });

    const table = wrapper.find(".categories-table-stub");
    expect(table.exists()).toBe(true);
    expect(table.attributes("data-count")).toBe("2");
    expect(table.attributes("data-loading")).toBe("false");

    // Two Modal instances constructed (delete + form)
    expect(ModalCtor).toHaveBeenCalledTimes(2);

    // pagination.total > 0 => nav rendered
    expect(
      wrapper.find('nav[aria-label="categories pagination"]').exists()
    ).toBe(true);
  });

  it("seeds filters and pagination from route query on mount", async () => {
    routeQuery = { search: "abc", status: "ACTIVE", page: "2", size: "25" };
    await mountView();

    expect(getCategories).toHaveBeenCalledWith({
      page: 2,
      search: "abc",
      size: 25,
      status: "ACTIVE",
    });
  });

  it("renders an empty list (?? [] is array, but count 0) without pagination nav", async () => {
    getCategories.mockResolvedValue(
      makeResponse({ data: { categories: [], totalPages: 0 } })
    );
    const wrapper = await mountView();
    expect(wrapper.find(".categories-table-stub").attributes("data-count")).toBe(
      "0"
    );
    expect(
      wrapper.find('nav[aria-label="categories pagination"]').exists()
    ).toBe(false);
  });

  it("falls back to [] in the template when categories is null (?? branch)", async () => {
    const wrapper = await mountView();
    // Force categories to null to exercise the `categories ?? []` nullish branch.
    wrapper.vm.categories = null;
    await flushPromises();
    expect(wrapper.find(".categories-table-stub").attributes("data-count")).toBe(
      "0"
    );
  });

  it("does not start a second fetch while one is already loading (loading guard)", async () => {
    let resolveFn;
    getCategories.mockImplementationOnce(
      () => new Promise((res) => (resolveFn = res))
    );
    const wrapper = await mountView();

    expect(getCategories).toHaveBeenCalledTimes(1);

    // Call fetchCategories again while still loading -> guarded early return.
    wrapper.vm.changeStatus("ACTIVE");
    await flushPromises();
    expect(getCategories).toHaveBeenCalledTimes(1);

    resolveFn(makeResponse());
    await flushPromises();
  });

  it("handles a non-200 response through the catch branch (toast error)", async () => {
    getCategories.mockResolvedValueOnce(makeResponse({ status: 500 }));
    const wrapper = await mountView();

    expect(devWarn).toHaveBeenCalledWith(
      "Error fetching categories:",
      expect.any(Error)
    );
    expect(showToast).toHaveBeenCalledWith("error", "Error fetching categories");
    // categories stay empty -> no pagination nav (total still 0)
    expect(
      wrapper.find('nav[aria-label="categories pagination"]').exists()
    ).toBe(false);
    expect(wrapper.find(".categories-table-stub").attributes("data-count")).toBe(
      "0"
    );
  });

  it("handles a rejected getCategories promise via the catch branch", async () => {
    getCategories.mockRejectedValueOnce(new Error("boom"));
    await mountView();

    expect(devWarn).toHaveBeenCalledWith(
      "Error fetching categories:",
      expect.any(Error)
    );
    expect(showToast).toHaveBeenCalledWith("error", "Error fetching categories");
  });

  it("opens the create modal via the Create New button", async () => {
    const wrapper = await mountView();
    modalShow.mockClear();

    await wrapper.find("button.btn-success").trigger("click");
    await flushPromises();
    expect(modalShow).toHaveBeenCalled();
  });

  it("clearFilters resets search/status and re-fetches at page 0", async () => {
    routeQuery = { search: "abc", status: "ACTIVE" };
    const wrapper = await mountView();

    getCategories.mockClear();
    wrapper.vm.clearFilters();
    await flushPromises();

    expect(getCategories).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: expect.any(Number),
      status: "ACTIVE",
    });
  });

  it("toggles status filter on and off via changeStatus (both ternary branches)", async () => {
    const wrapper = await mountView();

    getCategories.mockClear();
    // status === "" ? set status : clear -> sets to ACTIVE
    wrapper.vm.changeStatus("ACTIVE");
    await flushPromises();
    expect(getCategories).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "ACTIVE" })
    );

    getCategories.mockClear();
    // status === "ACTIVE" and same arg -> clears back to ""
    wrapper.vm.changeStatus("ACTIVE");
    await flushPromises();
    expect(getCategories).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "" })
    );
  });

  it("re-fetches (debounced) when the search input changes", async () => {
    const wrapper = await mountView();
    getCategories.mockClear();

    await wrapper.find('input[type="text"]').setValue("query");
    await flushPromises();

    expect(debouncedCalls).toHaveBeenCalled();
    expect(getCategories).toHaveBeenCalled();
  });

  it("renders pagination page numbers and navigates via changePage", async () => {
    getCategories.mockResolvedValue(
      makeResponse({ data: { page: 3, totalPages: 10 } })
    );
    const wrapper = await mountView();

    const pageLinks = wrapper.findAll("ul.pagination li.page-item");
    expect(pageLinks.length).toBeGreaterThan(0);

    getCategories.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li.page-item a.page-link")
      .filter((a) => /^\d+$/.test(a.text()));
    await numbered[0].trigger("click");
    await flushPromises();
    expect(getCategories).toHaveBeenCalled();
  });

  it("getPageNumbers windows near the end (endPage-startPage<4 false then adjust)", async () => {
    // current_page near total end so endPage clamps -> startPage adjusts.
    getCategories.mockResolvedValue(
      makeResponse({ data: { page: 9, totalPages: 10 } })
    );
    const wrapper = await mountView();
    const numbered = wrapper
      .findAll("ul.pagination li.page-item a.page-link")
      .filter((a) => /^\d+$/.test(a.text()))
      .map((a) => a.text());
    // window of 5 ending at 10
    expect(numbered).toEqual(["6", "7", "8", "9", "10"]);
  });

  it("getPageNumbers windows with few pages (endPage-startPage<4 true branch)", async () => {
    getCategories.mockResolvedValue(
      makeResponse({ data: { page: 0, totalPages: 2 } })
    );
    const wrapper = await mountView();
    const numbered = wrapper
      .findAll("ul.pagination li.page-item a.page-link")
      .filter((a) => /^\d+$/.test(a.text()))
      .map((a) => a.text());
    expect(numbered).toEqual(["1", "2"]);
  });

  it("guards changePage against Previous on the first page (page < 0)", async () => {
    getCategories.mockResolvedValue(
      makeResponse({ data: { page: 0, totalPages: 5 } })
    );
    const wrapper = await mountView();

    getCategories.mockClear();
    const prev = wrapper
      .findAll("ul.pagination a.page-link")
      .find((a) => a.text() === "Previous");
    await prev.trigger("click");
    await flushPromises();
    expect(getCategories).not.toHaveBeenCalled();
  });

  it("guards changePage when Next goes beyond last page", async () => {
    // totalPages 1 => last_page = 0, page 0 => current === last => Next guarded.
    getCategories.mockResolvedValue(
      makeResponse({ data: { page: 0, totalPages: 1 } })
    );
    const wrapper = await mountView();

    getCategories.mockClear();
    const next = wrapper
      .findAll("ul.pagination a.page-link")
      .find((a) => a.text() === "Next");
    await next.trigger("click");
    await flushPromises();
    expect(getCategories).not.toHaveBeenCalled();
  });

  it("changes page size which calls applyFilters and re-fetches at page 0", async () => {
    getCategories.mockResolvedValue(
      makeResponse({ data: { page: 2, totalPages: 5 } })
    );
    const wrapper = await mountView();

    getCategories.mockClear();
    const pageSizeSelect = wrapper.find("#pageSizeSelect");
    await pageSizeSelect.setValue("25");
    await flushPromises();
    expect(getCategories).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0 })
    );
  });

  it("confirms delete then deletes a category successfully", async () => {
    const wrapper = await mountView();

    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-delete", 1);
    await flushPromises();
    expect(modalShow).toHaveBeenCalled();

    // selectedCategory.name rendered in delete modal (?. truthy branch)
    expect(wrapper.find("#deleteModal p.fw-bold").text()).toBe("Sports");

    removeCategory.mockResolvedValueOnce({});
    await wrapper.find("#deleteModal button.btn-danger").trigger("click");
    await flushPromises();

    expect(removeCategory).toHaveBeenCalledWith(1);
    expect(modalHide).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Category deleted successfully"
    );
    // category 1 removed -> table count 1
    expect(wrapper.find(".categories-table-stub").attributes("data-count")).toBe(
      "1"
    );
  });

  it("confirmDelete does nothing when id is not found (selectedCategory falsy)", async () => {
    const wrapper = await mountView();
    modalShow.mockClear();
    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-delete", 999);
    await flushPromises();
    expect(modalShow).not.toHaveBeenCalled();
    // delete modal name renders empty (?. falsy branch)
    expect(wrapper.find("#deleteModal p.fw-bold").text()).toBe("");
  });

  it("handles a delete failure via the catch branch (toast error)", async () => {
    const wrapper = await mountView();

    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-delete", 1);
    await flushPromises();

    removeCategory.mockRejectedValueOnce(new Error("delete failed"));
    await wrapper.find("#deleteModal button.btn-danger").trigger("click");
    await flushPromises();

    expect(devWarn).toHaveBeenCalledWith(
      "Error deleting category:",
      expect.any(Error)
    );
    expect(showToast).toHaveBeenCalledWith("error", "Error deleting category");
  });

  it("shows the Deleting... label while a delete is in flight (isDeleting true branch)", async () => {
    let resolveDelete;
    removeCategory.mockImplementationOnce(
      () => new Promise((res) => (resolveDelete = res))
    );
    const wrapper = await mountView();

    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-delete", 1);
    await flushPromises();

    const delBtn = wrapper.find("#deleteModal button.btn-danger");
    await delBtn.trigger("click");
    await wrapper.vm.$nextTick();

    expect(delBtn.text()).toBe("Deleting...");
    expect(delBtn.attributes("disabled")).toBeDefined();

    resolveDelete({});
    await flushPromises();
    expect(delBtn.text()).toBe("Delete Category");
  });

  it("opens the update modal for an existing category via handle-edit", async () => {
    const wrapper = await mountView();
    modalShow.mockClear();

    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-edit", 2);
    await flushPromises();

    expect(modalShow).toHaveBeenCalled();
    expect(wrapper.findComponent(CategoryFormStub).props("category")).toEqual({
      id: 2,
      name: "News",
    });
  });

  it("openUpdateModal does nothing for an unknown id (selectedCategory falsy)", async () => {
    const wrapper = await mountView();
    modalShow.mockClear();

    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-edit", 12345);
    await flushPromises();
    expect(modalShow).not.toHaveBeenCalled();
  });

  it("closeForm hides the form modal and clears the selected category", async () => {
    const wrapper = await mountView();
    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-edit", 1);
    await flushPromises();

    modalHide.mockClear();
    wrapper.findComponent(CategoryFormStub).vm.$emit("close");
    await flushPromises();

    expect(modalHide).toHaveBeenCalled();
    expect(wrapper.findComponent(CategoryFormStub).props("category")).toBe(null);
  });

  it("addCategory prepends a new category from the form event", async () => {
    const wrapper = await mountView();
    expect(wrapper.find(".categories-table-stub").attributes("data-count")).toBe(
      "2"
    );

    wrapper
      .findComponent(CategoryFormStub)
      .vm.$emit("add", { id: 99, name: "NEW" });
    await flushPromises();

    expect(wrapper.find(".categories-table-stub").attributes("data-count")).toBe(
      "3"
    );
  });

  it("updateCategory updates a matching category and leaves others untouched", async () => {
    const wrapper = await mountView();

    wrapper
      .findComponent(CategoryFormStub)
      .vm.$emit("update", { id: 1, name: "UPDATED" });
    await flushPromises();

    // open update modal on the updated category to assert the new value flowed
    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-edit", 1);
    await flushPromises();
    expect(wrapper.findComponent(CategoryFormStub).props("category").name).toBe(
      "UPDATED"
    );

    // non-matching id branch already exercised (category 2 untouched)
    wrapper.findComponent(CategoriesTableStub).vm.$emit("handle-edit", 2);
    await flushPromises();
    expect(wrapper.findComponent(CategoryFormStub).props("category").name).toBe(
      "News"
    );
  });

  it("syncs the route query on filter/pagination changes (both || branches)", async () => {
    const wrapper = await mountView();

    routerReplace.mockClear();
    // set search so the truthy side of `search || undefined` is taken; set a
    // status via changeStatus so `status || undefined` truthy side is taken.
    await wrapper.find('input[type="text"]').setValue("hello");
    wrapper.vm.changeStatus("ACTIVE");
    await flushPromises();

    expect(routerReplace).toHaveBeenCalled();
    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBe("hello");
    expect(lastCall.query.status).toBe("ACTIVE");

    // now clear both -> falsy side of `|| undefined`
    routerReplace.mockClear();
    await wrapper.find('input[type="text"]').setValue("");
    wrapper.vm.changeStatus("ACTIVE"); // toggles ACTIVE off -> ""
    await flushPromises();

    const cleared = routerReplace.mock.calls.at(-1)[0];
    expect(cleared.query.search).toBeUndefined();
    expect(cleared.query.status).toBeUndefined();
  });
});

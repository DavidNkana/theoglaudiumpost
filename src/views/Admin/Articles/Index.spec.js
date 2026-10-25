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

// --- Mock dayjs (external boundary) ------------------------------------------
vi.mock("dayjs", () => ({
  default: (d) => ({ format: () => `FMT(${d})` }),
}));

// --- Mock the SweetAlert composable (external boundary -> sweetalert2) ---------
const showToast = vi.fn();
vi.mock("@/composables/useSweetAlert", () => ({
  useSweetAlert: () => ({ showToast }),
}));

// --- Mock the Auth composable (external boundary -> localStorage/jwt) ----------
const hasRole = vi.fn();
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ hasRole }),
}));

// --- Mock devLog (external boundary -> @/config/env) --------------------------
vi.mock("@/utils/devLog", () => ({
  devLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Mock articles + categories services -------------------------------------
const getArticles = vi.fn();
const removeArticle = vi.fn();
const publishScheduled = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticles: (...a) => getArticles(...a),
  removeArticle: (...a) => removeArticle(...a),
  publishScheduled: (...a) => publishScheduled(...a),
}));

const getCategories = vi.fn();
vi.mock("@/features/categories/CategoriesService", () => ({
  getCategories: (...a) => getCategories(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
const routerPush = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  useRoute: () => ({ query: routeQuery }),
}));

import Index from "./Index.vue";

const makeArticle = (id, overrides = {}) => ({
  id,
  title: `Article ${id}`,
  status: "published",
  ...overrides,
});

const okResponse = (overrides = {}) => ({
  status: 200,
  data: {
    articles: [makeArticle(1), makeArticle(2)],
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
        Stats: true,
        ArticlesTable: true,
        ArticlePreview: true,
        DatePicker: true,
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });

describe("Admin/Articles/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeQuery = {};
    hasRole.mockReturnValue(false);
    getArticles.mockResolvedValue(okResponse());
    getCategories.mockResolvedValue({ data: [{ id: 7, name: "Events" }] });
    removeArticle.mockResolvedValue({});
    publishScheduled.mockResolvedValue({});
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches posts + categories (default branches)", async () => {
    const wrapper = mountView();
    await flushPromises();

    // dateRange = ["", ""] -> formatDate("") falsy -> null on both ends
    expect(getArticles).toHaveBeenCalledWith({
      category: "",
      page: 0,
      search: "",
      size: 10,
      status: "",
      startDate: null,
      endDate: null,
      excludeIds: null,
    });
    // 2 modal instances created (delete + preview)
    expect(ModalSpy).toHaveBeenCalledTimes(2);

    // categories loaded -> v-for non-empty renders the option
    expect(wrapper.find("select.categories-select").text()).toContain("Events");

    // ArticlesTable rendered, pagination visible because total (totalPages) > 0
    expect(wrapper.findComponent({ name: "ArticlesTable" }).exists()).toBe(true);
    expect(
      wrapper.find('nav[aria-label="Posts pagination"]').exists()
    ).toBe(true);

    // No active filters -> Clear Filters button hidden
    expect(wrapper.text()).not.toContain("Clear Filters");
    // superadmin false -> Manage AI Prompts hidden
    expect(wrapper.text()).not.toContain("Manage AI Prompts");
    wrapper.unmount();
  });

  it("initializes from populated query params (truthy onMounted + Clear Filters + dates)", async () => {
    routeQuery = {
      search: "hello",
      category: "cat",
      status: "draft",
      from: "2024-01-01",
      to: "2024-02-01",
      page: "2",
      size: "25",
    };
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1, { status: "draft" })] })
    );
    const wrapper = mountView();
    await flushPromises();

    // dateRange truthy -> formatDate runs dayjs().format() branch
    expect(getArticles).toHaveBeenCalledWith({
      category: "cat",
      page: 2,
      search: "hello",
      size: 25,
      status: "draft",
      startDate: "FMT(2024-01-01)",
      endDate: "FMT(2024-02-01)",
      excludeIds: null,
    });

    // v-if="filters.search || filters.category" -> Clear Filters visible
    expect(wrapper.text()).toContain("Clear Filters");
    wrapper.unmount();
  });

  it("shows Clear Filters when only category is set (OR second operand)", async () => {
    routeQuery = { category: "cat" };
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Clear Filters");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // client-side status filter: status set -> filter applied
  // ---------------------------------------------------------------------------
  it("applies client-side status filter and handles missing status field", async () => {
    routeQuery = { status: "published" };
    getArticles.mockResolvedValue(
      okResponse({
        articles: [
          makeArticle(1, { status: "Published" }), // matches (case-insensitive)
          makeArticle(2, { status: "draft" }), // filtered out
          makeArticle(3, { status: undefined }), // (a.status || "") falsy side
        ],
      })
    );
    const wrapper = mountView();
    await flushPromises();

    // Only the Published article survives the client-side filter.
    expect(wrapper.vm.posts.map((p) => p.id)).toEqual([1]);
    wrapper.unmount();
  });

  it("falls back to empty list when response has no articles key", async () => {
    getArticles.mockResolvedValue(okResponse({ articles: undefined }));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.posts).toEqual([]);
    wrapper.unmount();
  });

  it("passes [] to ArticlesTable when posts is null (?? fallback branch)", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.posts = null; // drive `posts ?? []` right operand
    await nextTick();
    const table = wrapper.findComponent({ name: "ArticlesTable" });
    expect(table.props("articles")).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchPosts: non-200 -> throw -> catch
  // ---------------------------------------------------------------------------
  it("enters the catch branch on a non-200 status (posts unchanged)", async () => {
    getArticles.mockResolvedValue({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.posts).toEqual([]);
    wrapper.unmount();
  });

  it("enters the catch branch on a rejected fetch", async () => {
    getArticles.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchPosts: early return while loading (loading guard)
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getArticles.mockImplementation(
      () => new Promise((res) => { resolveFn = res; })
    );
    const wrapper = mountView();
    await nextTick();
    expect(getArticles).toHaveBeenCalledTimes(1);

    wrapper.vm.changeStatus("published"); // fetchPosts early-returns (loading)
    expect(getArticles).toHaveBeenCalledTimes(1);

    resolveFn(okResponse());
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCategories branches
  // ---------------------------------------------------------------------------
  it("does not re-fetch categories when already loaded (length != 0 guard)", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(getCategories).toHaveBeenCalledTimes(1);

    await wrapper.vm.fetchCategories();
    expect(getCategories).toHaveBeenCalledTimes(1); // early return
    wrapper.unmount();
  });

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
  // confirmDelete + deleteArticle success/reject
  // ---------------------------------------------------------------------------
  it("confirms and deletes an article successfully", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedArticle.id).toBe(1);

    await wrapper.vm.deleteArticle();
    await flushPromises();

    expect(removeArticle).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.posts.map((a) => a.id)).toEqual([2]);
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  it("confirmDelete with unknown id does not open the modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(9999); // find -> undefined -> if(falsy) skip show
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("alerts and resets isDeleting when removeArticle rejects (catch + finally)", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();

    removeArticle.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteArticle();
    await flushPromises();

    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete article. Please try again."
    );
    expect(wrapper.vm.isDeleting).toBe(false);
    consoleErr.mockRestore();
    alertSpy.mockRestore();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // handlePreview + closePeview + ArticlePreview v-if
  // ---------------------------------------------------------------------------
  it("handlePreview opens the preview and renders ArticlePreview when found", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.handlePreview(2);
    await nextTick();
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedArticle.id).toBe(2);
    expect(wrapper.findComponent({ name: "ArticlePreview" }).exists()).toBe(true);
    wrapper.unmount();
  });

  it("handlePreview does nothing when the article does not exist", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.handlePreview(424242);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("closePeview hides preview modal, clears selection and unrenders ArticlePreview", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.handlePreview(1);
    await nextTick();
    hideSpy.mockClear();

    wrapper.vm.closePeview();
    await nextTick();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedArticle).toBe(null);
    expect(wrapper.findComponent({ name: "ArticlePreview" }).exists()).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // ArticlePreview emitted events: close / edit / update-props
  // ---------------------------------------------------------------------------
  it("wires ArticlePreview close/edit/update-props events", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.handlePreview(1);
    await nextTick();
    const preview = wrapper.findComponent({ name: "ArticlePreview" });

    // update-props -> updatePost
    preview.vm.$emit("update-props", { id: 99, title: "X" });
    await nextTick();
    expect(wrapper.vm.selectedArticle).toEqual({ id: 99, title: "X" });

    // edit -> editPost (post truthy) -> closePeview + router.push
    routerPush.mockClear();
    preview.vm.$emit("edit", { id: 5 });
    await nextTick();
    expect(routerPush).toHaveBeenCalledWith("/admin/articles/edit/5");
    wrapper.unmount();
  });

  it("editPost with a falsy post closes preview without navigating", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerPush.mockClear();

    wrapper.vm.editPost(null); // post falsy -> no router.push
    expect(routerPush).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // ArticlesTable emitted events
  // ---------------------------------------------------------------------------
  it("wires ArticlesTable handle-delete and handle-preview", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    const table = wrapper.findComponent({ name: "ArticlesTable" });
    table.vm.$emit("handle-delete", 1);
    await nextTick();
    expect(wrapper.vm.selectedArticle.id).toBe(1);

    table.vm.$emit("handle-preview", 2);
    await nextTick();
    expect(wrapper.vm.selectedArticle.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: out of range (low + high) + valid
  // ---------------------------------------------------------------------------
  it("changePage ignores out-of-range pages and fetches for valid pages", async () => {
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();

    // last_page = totalPages - 1 = 3 - 1 = 2
    wrapper.vm.changePage(-1); // page < 0
    wrapper.vm.changePage(99); // page > last_page
    expect(getArticles).not.toHaveBeenCalled();

    // The next fetch overwrites pagination from the response; echo page 1 back.
    getArticles.mockResolvedValue(okResponse({ page: 1 }));
    wrapper.vm.changePage(1); // valid
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getArticles).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // pagination link clicks + getPageNumbers
  // ---------------------------------------------------------------------------
  it("renders Previous disabled on the first page and navigates Next", async () => {
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    expect(items[0].classes()).toContain("disabled"); // current_page === 0
    expect(wrapper.find("ul.pagination li.page-item.active").exists()).toBe(true);

    getArticles.mockClear();
    await items[items.length - 1].find("a").trigger("click"); // Next
    await flushPromises();
    expect(getArticles).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("navigates Previous and a numbered page via clicks", async () => {
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1)], page: 1, totalPages: 5 })
    );
    routeQuery = { page: "1" };
    const wrapper = mountView();
    await flushPromises();

    getArticles.mockClear();
    const items = wrapper.findAll("ul.pagination li.page-item");
    await items[0].find("a").trigger("click"); // Previous (current 1 -> 0)
    await flushPromises();
    expect(getArticles).toHaveBeenCalled();

    getArticles.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li.page-item")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    await numbered[0].find("a").trigger("click");
    await flushPromises();
    expect(getArticles).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders Next disabled when on the last page", async () => {
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1)], page: 2, totalPages: 3 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    expect(items[items.length - 1].classes()).toContain("disabled");
    wrapper.unmount();
  });

  it("covers getPageNumbers startPage recompute near the end of the range", async () => {
    // current_page + 1 = 10, total = 10 -> startPage=8, endPage=10, span=2<4 ->
    // startPage recomputed to max(1, 10-4)=6.
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1)], page: 9, totalPages: 10 })
    );
    routeQuery = { page: "9" };
    const wrapper = mountView();
    await flushPromises();

    const numbered = wrapper
      .findAll("ul.pagination li.page-item")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    expect(numbered[0]).toBe("6");
    expect(numbered[numbered.length - 1]).toBe("10");
    wrapper.unmount();
  });

  it("hides pagination when total is 0", async () => {
    getArticles.mockResolvedValue(
      okResponse({ articles: [], totalPages: 0 })
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find('nav[aria-label="Posts pagination"]').exists()).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // applyFilters / clearFilters / changeStatus
  // ---------------------------------------------------------------------------
  it("applyFilters via the page-size select resets page and refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();
    // Echo size 25 back so the post-fetch pagination overwrite keeps per_page.
    getArticles.mockResolvedValue(okResponse({ size: 25 }));

    await wrapper.find("#pageSizeSelect").setValue("25");
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(wrapper.vm.pagination.per_page).toBe(25);
    // size 25 carried into the service call before the response overwrite
    expect(getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ size: 25 })
    );
    wrapper.unmount();
  });

  it("applyFilters via the Apply Filters button refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();

    const applyBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Apply Filters"));
    await applyBtn.trigger("click");
    await flushPromises();
    expect(getArticles).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("clearFilters resets category/search/dateRange and refetches", async () => {
    routeQuery = { search: "x", category: "y", status: "published" };
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();

    const clearBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Clear Filters"));
    await clearBtn.trigger("click");
    await flushPromises();

    expect(wrapper.vm.filters).toEqual({
      search: "",
      category: "",
      status: "published", // preserved by spread
      dateRange: [],
    });
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getArticles).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("changeStatus via the status tabs updates filters and refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();

    const draftTab = wrapper
      .findAll(".status-filter")
      .find((el) => el.text() === "Draft");
    await draftTab.trigger("click");
    await flushPromises();

    expect(wrapper.vm.filters.status).toBe("draft");
    expect(getArticles).toHaveBeenCalled();
    // active class moved to the Draft tab
    expect(draftTab.classes()).toContain("active");
    wrapper.unmount();
  });

  it("each status tab click invokes changeStatus with its own value", async () => {
    const wrapper = mountView();
    await flushPromises();

    const cases = [
      ["All", ""],
      ["Published", "published"],
      ["Scheduled", "scheduled"],
      ["Archived", "archived"],
    ];
    for (const [label, value] of cases) {
      getArticles.mockClear();
      const tab = wrapper
        .findAll(".status-filter")
        .find((el) => el.text() === label);
      await tab.trigger("click");
      await flushPromises();
      expect(wrapper.vm.filters.status).toBe(value);
      expect(getArticles).toHaveBeenCalled();
      expect(tab.classes()).toContain("active");
    }
    wrapper.unmount();
  });

  it("category select v-model and DatePicker v-model update the filters", async () => {
    const wrapper = mountView();
    await flushPromises();

    // category <select> v-model write
    await wrapper.find("select.categories-select").setValue("7");
    // option :value is the numeric category.id, so v-model receives 7 (number)
    expect(wrapper.vm.filters.category).toBe(7);

    // DatePicker emits update:modelValue -> filters.dateRange v-model write
    const dp = wrapper.findComponent({ name: "DatePicker" });
    dp.vm.$emit("update:modelValue", ["2024-01-01", "2024-02-01"]);
    await nextTick();
    expect(wrapper.vm.filters.dateRange).toEqual(["2024-01-01", "2024-02-01"]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced, mocked sync) + router.replace watcher
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers the debounced fetch and router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();
    routerReplace.mockClear();

    await wrapper.find('input[type="text"]').setValue("query");
    await flushPromises();

    expect(getArticles).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("router-query watcher emits all populated keys when every filter is set", async () => {
    routeQuery = {
      search: "s",
      category: "c",
      status: "published",
      from: "2024-01-01",
      to: "2024-02-01",
      page: "2",
      size: "25",
    };
    // Echo size 25 so the post-fetch pagination overwrite keeps per_page=25.
    getArticles.mockResolvedValue(okResponse({ size: 25, page: 2 }));
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    wrapper.vm.pagination.current_page = 1; // mutate a watched source
    await flushPromises();

    expect(routerReplace).toHaveBeenCalledWith({
      query: {
        search: "s",
        category: "c",
        status: "published",
        from: "2024-01-01",
        to: "2024-02-01",
        page: 1,
        size: 25,
      },
    });
    wrapper.unmount();
  });

  it("router-query watcher emits undefined for empty filters", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    expect(routerReplace).toHaveBeenCalledWith({
      query: {
        search: undefined,
        category: undefined,
        status: undefined,
        from: undefined,
        to: undefined,
        page: 1,
        size: 10,
      },
    });
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // superadmin router-link (hasRole truthy branch)
  // ---------------------------------------------------------------------------
  it("renders Manage AI Prompts link for superadmins", async () => {
    hasRole.mockReturnValue(true);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Manage AI Prompts");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // publishAll: button visibility + success + reject + publishing spinner
  // ---------------------------------------------------------------------------
  it("publishAll button hidden unless status=scheduled and posts present", async () => {
    const wrapper = mountView();
    await flushPromises();
    // default status "" -> button hidden
    expect(
      wrapper.findAll("button").some((b) => b.text().includes("Publish All"))
    ).toBe(false);
    wrapper.unmount();
  });

  it("publishAll succeeds with publishAll=true when no date range", async () => {
    routeQuery = { status: "scheduled" };
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1, { status: "scheduled" })] })
    );
    // Replace location so the success-path assignment is harmless and observable.
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: "", pathname: "/admin/articles", search: "?x=1" };

    const wrapper = mountView();
    await flushPromises();

    const publishBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Publish All"));
    expect(publishBtn).toBeTruthy();

    await publishBtn.trigger("click");
    await flushPromises();

    expect(publishScheduled).toHaveBeenCalledWith({
      startDate: null,
      endDate: null,
      publishAll: true, // !from && !to
    });
    expect(showToast).toHaveBeenCalledWith("success", "Published Successfully");
    expect(window.location.href).toBe("/admin/articles?x=1");
    expect(wrapper.vm.publishing).toBe(false);

    window.location = originalLocation;
    wrapper.unmount();
  });

  it("publishAll uses the date range (publishAll=false) and shows the spinner while publishing", async () => {
    routeQuery = { status: "scheduled", from: "2024-01-01", to: "2024-02-01" };
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1, { status: "scheduled" })] })
    );
    let resolvePublish;
    publishScheduled.mockImplementation(
      () => new Promise((res) => { resolvePublish = res; })
    );
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: "", pathname: "/admin/articles", search: "" };

    const wrapper = mountView();
    await flushPromises();

    const publishBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Publish All"));
    await publishBtn.trigger("click");
    await nextTick();

    // publishing true -> spinner + "Publishing..." label
    expect(wrapper.vm.publishing).toBe(true);
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Publishing...");

    resolvePublish({});
    await flushPromises();

    expect(publishScheduled).toHaveBeenCalledWith({
      startDate: "2024-01-01",
      endDate: "2024-01-01", // source uses `from` for both ends
      publishAll: false, // from truthy
    });

    window.location = originalLocation;
    wrapper.unmount();
  });

  it("publishAll shows an error toast when publishScheduled rejects", async () => {
    routeQuery = { status: "scheduled" };
    getArticles.mockResolvedValue(
      okResponse({ articles: [makeArticle(1, { status: "scheduled" })] })
    );
    publishScheduled.mockRejectedValue(new Error("publish boom"));

    const wrapper = mountView();
    await flushPromises();

    const publishBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Publish All"));
    await publishBtn.trigger("click");
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith("error", "Error publishing");
    expect(wrapper.vm.publishing).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal render: selectedArticle?.title ?? "" + isDeleting ternary
  // ---------------------------------------------------------------------------
  it("renders the selected title and the deleting label in the delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedArticle = makeArticle(1, { title: "My Article" });
    wrapper.vm.isDeleting = true;
    await nextTick();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Article");
    expect(modal.text()).toContain("Deleting...");

    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Article");
    wrapper.unmount();
  });

  it("renders an empty title when no article is selected (?? fallback)", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.selectedArticle = null;
    await nextTick();
    expect(wrapper.find("#deleteModal .fw-bold").text()).toBe("");
    wrapper.unmount();
  });

  it("triggers deleteArticle from the modal Delete button", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.confirmDelete(1);
    await nextTick();
    removeArticle.mockClear();

    const deleteBtn = wrapper
      .findAll("#deleteModal button")
      .find((b) => b.text().includes("Delete Article"));
    await deleteBtn.trigger("click");
    await flushPromises();
    expect(removeArticle).toHaveBeenCalledWith(1);
    wrapper.unmount();
  });
});

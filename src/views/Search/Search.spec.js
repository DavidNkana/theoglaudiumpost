import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// vue-router -> useRoute / useRouter return controllable mocks
const push = vi.fn();
let routeMock;
vi.mock("vue-router", () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ push }),
}));

// services
const getArticles = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticles: (...args) => getArticles(...args),
}));

const getCategories = vi.fn();
vi.mock("@/features/categories/CategoriesService", () => ({
  getCategories: (...args) => getCategories(...args),
}));

// Heavy child component -> stub
vi.mock("@/components/NewsCard.vue", () => ({
  default: {
    name: "NewsCard",
    props: ["article"],
    template: '<div class="news-card-stub">{{ article.title }}</div>',
  },
}));

import Search from "@/views/Search/Search.vue";

function makeArticles(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    title: `Article ${i + 1}`,
  }));
}

function mountSearch() {
  return mount(Search, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMock = { query: {} };
  // Default service resolutions
  getArticles.mockResolvedValue({
    status: 200,
    data: { articles: makeArticles(2), total: 25 },
  });
  getCategories.mockResolvedValue({ data: [{ id: 1, name: "News" }] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Search.vue", () => {
  it("renders the search prompt (initial !searchPerformed branch) and fetches categories on mount", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    // onMounted: route.query.q falsy -> performSearch NOT called for results
    expect(getArticles).not.toHaveBeenCalled();
    // fetchCategories runs on mount (success path)
    expect(getCategories).toHaveBeenCalledTimes(1);

    // Initial template state: search-prompt branch (v-else-if="!searchPerformed")
    expect(wrapper.find(".search-prompt").exists()).toBe(true);
    expect(wrapper.text()).toContain("Start searching");
    // Stats hidden when no search performed
    expect(wrapper.find(".search-stats").exists()).toBe(false);
    // loading + no-results + results-grid all absent
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".no-results").exists()).toBe(false);
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
  });

  it("logs and swallows error when fetchCategories rejects (catch branch)", async () => {
    const err = new Error("cats down");
    getCategories.mockRejectedValueOnce(err);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const wrapper = mountSearch();
    await flushPromises();

    expect(logSpy).toHaveBeenCalledWith(err);
    // Component still renders fine after fetchCategories failure
    expect(wrapper.find(".search-prompt").exists()).toBe(true);
  });

  it("submitting an empty query resets state and pushes route without fetching (early-return branch)", async () => {
    const wrapper = mountSearch();
    await flushPromises();
    getCategories.mockClear();

    // searchQuery is empty + resetPage true => reset() + router.push + return
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();

    expect(getArticles).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      path: "/search",
      query: { q: "", filter: "", page: 1 },
    });
    // reset() keeps searchPerformed false -> prompt still visible
    expect(wrapper.find(".search-prompt").exists()).toBe(true);
  });

  it("performs a successful search: loading -> results grid + pagination + stats", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("vue");
    // Submit triggers performSearch(resetPage=true)
    const submit = wrapper.find("form.search-form").trigger("submit.prevent");

    // Synchronously after submit: loading === true branch is rendered
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".visually-hidden").text()).toBe("Loading...");
    expect(wrapper.text()).toContain("Searching...");

    await submit;
    await flushPromises();

    // getArticles called with page 0 (currentPage 1 -> 1-1=0, not < 0)
    expect(getArticles).toHaveBeenCalledWith({
      page: 0,
      search: "vue",
      category: "",
      size: 10,
    });
    // router push with the search query
    expect(push).toHaveBeenCalledWith({
      path: "/search",
      query: { q: "vue", filter: "", page: 1 },
    });

    // Loading gone, results grid present (v-else branch)
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    const cards = wrapper.findAll(".news-card-stub");
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toBe("Article 1");

    // Stats visible (searchPerformed true)
    expect(wrapper.find(".search-stats").text()).toContain('2 results for "vue"');

    // Pagination: totalPages = ceil(25/10) = 3 page-number items + prev + next
    const pageItems = wrapper.findAll(".pagination .page-item");
    // 3 numbered + prev + next = 5
    expect(pageItems).toHaveLength(5);
    // First numbered page active (currentPage === 1)
    const numbered = wrapper.findAll(".pagination .page-item .page-link");
    // prev link is index 0; numbered start at index 1
    expect(wrapper.findAll(".page-item.active")).toHaveLength(1);
    // prev disabled (currentPage === 1)
    expect(pageItems[0].classes()).toContain("disabled");
  });

  it("renders no-results state when search returns empty array", async () => {
    getArticles.mockResolvedValueOnce({
      status: 200,
      data: { articles: [], total: 0 },
    });
    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("nothinghere");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".no-results").exists()).toBe(true);
    expect(wrapper.text()).toContain("No results found");
    expect(wrapper.text()).toContain(
      'We couldn\'t find any matches for "nothinghere"'
    );
    // results grid + prompt absent
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
    expect(wrapper.find(".search-prompt").exists()).toBe(false);
    // stats still show 0 results
    expect(wrapper.find(".search-stats").text()).toContain('0 results for');
  });

  it("handles non-200 response by throwing -> catch branch clears results", async () => {
    getArticles.mockResolvedValueOnce({ status: 500, data: {} });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("boom");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();

    expect(errSpy).toHaveBeenCalled();
    // searchPerformed true + empty results -> no-results branch
    expect(wrapper.find(".no-results").exists()).toBe(true);
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
  });

  it("handles rejected getArticles -> catch branch", async () => {
    getArticles.mockRejectedValueOnce(new Error("network"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("boom2");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith("Search error:", expect.any(Error));
    expect(wrapper.find(".no-results").exists()).toBe(true);
  });

  it("initializes from URL query params on mount (route.query.q truthy + page parse)", async () => {
    routeMock = { query: { q: "fromurl", page: "2" } };
    const wrapper = mountSearch();
    await flushPromises();

    // performSearch(false) called -> getArticles with page index 1 (currentPage 2 -> 1)
    expect(getArticles).toHaveBeenCalledWith({
      page: 1,
      search: "fromurl",
      category: "",
      size: 10,
    });
    // results rendered
    expect(wrapper.findAll(".news-card-stub")).toHaveLength(2);
    // input reflects the URL query
    expect(wrapper.find("input.search-input").element.value).toBe("fromurl");
  });

  it("defaults page to 1 when route.query.page is missing (|| 1 branch)", async () => {
    routeMock = { query: { q: "noPage" } };
    mountSearch();
    await flushPromises();

    // currentPage defaults to 1 -> page index 0
    expect(getArticles).toHaveBeenCalledWith({
      page: 0,
      search: "noPage",
      category: "",
      size: 10,
    });
  });

  it("changePage navigates to a valid page, calls performSearch(false) and scrolls", async () => {
    const scrollIntoView = vi.fn();
    const wrapper = mountSearch();
    await flushPromises();

    // First perform a search so totalPages = 3 and results grid is rendered
    await wrapper.find("input.search-input").setValue("vue");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();
    getArticles.mockClear();

    // querySelector returns a truthy element -> scroll branch taken
    const qsSpy = vi
      .spyOn(document, "querySelector")
      .mockReturnValue({ scrollIntoView });

    // Click a valid numbered page (page 2). Numbered links are after the prev arrow.
    const links = wrapper.findAll(".pagination .page-item .page-link");
    // links[0] = prev arrow, links[1] = page 1, links[2] = page 2 ...
    await links[2].trigger("click");
    await flushPromises();

    // performSearch(false) -> getArticles with page index 1 (currentPage 2)
    expect(getArticles).toHaveBeenCalledWith({
      page: 1,
      search: "vue",
      category: "",
      size: 10,
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    // active class moved to page 2
    expect(wrapper.findAll(".page-item.active")).toHaveLength(1);
    qsSpy.mockRestore();
  });

  it("changePage ignores out-of-range pages (page < 1 and page > totalPages)", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("vue");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();
    getArticles.mockClear();

    const links = wrapper.findAll(".pagination .page-item .page-link");
    // prev arrow at currentPage 1 -> changePage(0) -> page < 1 -> early return
    await links[0].trigger("click");
    // next arrow -> changePage(currentPage + 1). currentPage is 1, totalPages 3 -> valid,
    // so to hit page > totalPages we go to last page then click next.
    expect(getArticles).not.toHaveBeenCalled();
  });

  it("changePage returns early when clicking next beyond last page (page > totalPages)", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("vue");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();

    // Navigate to last page (3) via numbered link
    let links = wrapper.findAll(".pagination .page-item .page-link");
    await links[3].trigger("click"); // page 3 (links[1]=p1, [2]=p2, [3]=p3)
    await flushPromises();
    getArticles.mockClear();

    // Now currentPage === totalPages (3); the next arrow is the LAST link
    links = wrapper.findAll(".pagination .page-item .page-link");
    const nextArrow = links[links.length - 1];
    await nextArrow.trigger("click"); // changePage(4) -> 4 > 3 -> early return
    await flushPromises();

    expect(getArticles).not.toHaveBeenCalled();
    // next page-item disabled (currentPage === totalPages)
    const pageItems = wrapper.findAll(".pagination .page-item");
    expect(pageItems[pageItems.length - 1].classes()).toContain("disabled");
  });

  it("changePage does not scroll when container is absent (if(resultsContainer) false branch)", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    await wrapper.find("input.search-input").setValue("vue");
    await wrapper.find("form.search-form").trigger("submit.prevent");
    await flushPromises();
    getArticles.mockClear();

    // Force querySelector to return null so the scroll branch is skipped
    const qsSpy = vi
      .spyOn(document, "querySelector")
      .mockReturnValue(null);

    const links = wrapper.findAll(".pagination .page-item .page-link");
    await links[2].trigger("click"); // valid page 2
    await flushPromises();

    expect(getArticles).toHaveBeenCalledWith({
      page: 1,
      search: "vue",
      category: "",
      size: 10,
    });
    qsSpy.mockRestore();
  });

  it("performSearch() with the resetPage argument omitted uses the default (true) and resets page", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    // Seed a non-default page so we can observe the reset to 1
    wrapper.vm.currentPage = 5;
    wrapper.vm.searchQuery = "defaulted";
    await flushPromises();
    getArticles.mockClear();

    // Call with NO argument -> resetPage default = true branch -> currentPage = 1
    await wrapper.vm.performSearch();
    await flushPromises();

    expect(wrapper.vm.currentPage).toBe(1);
    expect(getArticles).toHaveBeenCalledWith({
      page: 0,
      search: "defaulted",
      category: "",
      size: 10,
    });
  });

  it("performSearch clamps negative page index to 0 (ternary true branch)", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    // Force currentPage to 0 and search without resetting (resetPage=false keeps page)
    wrapper.vm.searchQuery = "edge";
    wrapper.vm.currentPage = 0;
    await flushPromises();
    getArticles.mockClear();

    // resetPage false so currentPage stays 0 -> 0 - 1 = -1 < 0 -> page clamped to 0
    await wrapper.vm.performSearch(false);
    await flushPromises();

    expect(getArticles).toHaveBeenCalledWith({
      page: 0,
      search: "edge",
      category: "",
      size: 10,
    });
  });

  it("watch(sortOrder) triggers performSearch(false) when sortOrder changes", async () => {
    const wrapper = mountSearch();
    await flushPromises();

    // Seed a query so performSearch actually hits getArticles
    wrapper.vm.searchQuery = "watched";
    await flushPromises();
    getArticles.mockClear();

    // Mutate sortOrder to fire the watcher
    wrapper.vm.sortOrder = "newest";
    await flushPromises();

    expect(getArticles).toHaveBeenCalledWith({
      page: 0,
      search: "watched",
      category: "",
      size: 10,
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { createStore } from "vuex";
import FeaturedArticles from "@/views/News/Partials/FeaturedArticles.vue";

// Stub the heavy child components so this spec only instruments
// FeaturedArticles.vue itself.
const NewsCardStub = {
  name: "NewsCard",
  props: ["article", "featured", "minDetails"],
  template: `<div class="news-card-stub">{{ article.title }}</div>`,
};

const StandardCardStub = {
  name: "StandardCard",
  props: ["article", "isFeatured"],
  template: `<div class="standard-card-stub">{{ article.title }}</div>`,
};

/**
 * Build a vuex store whose `articles/featuredArticles` getter returns the
 * supplied list and whose dispatch is a spy that resolves, rejects, or stays
 * pending (to exercise the loading branch).
 */
function makeStore({ articles = [], dispatchImpl } = {}) {
  const dispatch = vi.fn(dispatchImpl || (() => Promise.resolve()));
  const store = createStore({
    getters: {
      "articles/featuredArticles": () => articles,
    },
  });
  // Override dispatch with our spy (keep real getters).
  store.dispatch = dispatch;
  return { store, dispatch };
}

function mountComponent({ articles, dispatchImpl } = {}) {
  const { store, dispatch } = makeStore({ articles, dispatchImpl });
  const wrapper = mount(FeaturedArticles, {
    global: {
      plugins: [store],
      stubs: {
        NewsCard: NewsCardStub,
        StandardCard: StandardCardStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
  return { wrapper, store, dispatch };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeaturedArticles.vue (views/News/Partials)", () => {
  it("dispatches fetchArticlesByType on mount with featured/size args", async () => {
    const { dispatch } = mountComponent({ articles: [] });
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "featured",
      size: 3,
    });
  });

  it("shows the loading skeleton while the dispatch is pending (v-if isLoading branch)", async () => {
    // Keep dispatch pending so isLoading stays true.
    let resolveDispatch;
    const pending = new Promise((res) => {
      resolveDispatch = res;
    });
    const { wrapper } = mountComponent({
      articles: [{ id: 1, title: "x" }],
      dispatchImpl: () => pending,
    });

    // onMounted set isLoading=true; let Vue flush that reactive update while
    // the dispatch promise stays pending.
    await nextTick();
    expect(wrapper.find(".skeleton-large").exists()).toBe(true);
    expect(wrapper.findAll(".standard-card .skeleton-small").length).toBe(2);
    // Content grid items must NOT render while loading.
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
    expect(wrapper.find(".standard-card-stub").exists()).toBe(false);

    // Resolve so the component flips out of the loading state.
    resolveDispatch();
    await flushPromises();
    expect(wrapper.find(".skeleton-large").exists()).toBe(false);
  });

  it("renders the content grid with no cards when featuredArticles is empty (v-for empty branch)", async () => {
    const { wrapper } = mountComponent({ articles: [] });
    await flushPromises();

    // v-else content grid is shown after loading completes.
    expect(wrapper.find(".skeleton-large").exists()).toBe(false);
    expect(wrapper.find(".featured-grid").exists()).toBe(true);
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
    expect(wrapper.find(".standard-card-stub").exists()).toBe(false);
    expect(wrapper.findAll(".featured-grid > div").length).toBe(0);
  });

  it("renders NewsCard for index 0 and StandardCard for the rest (v-if/v-else + ternary class)", async () => {
    const articles = [
      { id: 1, title: "Featured One" },
      { id: 2, title: "Second" },
      { id: 3, title: "Third" },
    ];
    const { wrapper } = mountComponent({ articles });
    await flushPromises();

    // index 0 -> NewsCard stub, featured prop true, on a .featured-card cell.
    const newsCard = wrapper.findComponent(NewsCardStub);
    expect(newsCard.exists()).toBe(true);
    expect(newsCard.props("featured")).toBe(true);
    expect(newsCard.props("article")).toEqual(articles[0]);

    const cells = wrapper.findAll(".featured-grid > div");
    expect(cells.length).toBe(3);
    // ternary: index 0 -> featured-card, others -> standard-card
    expect(cells[0].classes()).toContain("featured-card");
    expect(cells[1].classes()).toContain("standard-card");
    expect(cells[2].classes()).toContain("standard-card");

    // index 1 & 2 -> StandardCard (v-else) with isFeatured true.
    const standardCards = wrapper.findAllComponents(StandardCardStub);
    expect(standardCards.length).toBe(2);
    expect(standardCards[0].props("isFeatured")).toBe(true);
    expect(standardCards[0].props("article")).toEqual(articles[1]);
    expect(standardCards[1].props("article")).toEqual(articles[2]);

    // Only one NewsCard (index 0 only).
    expect(wrapper.findAllComponents(NewsCardStub).length).toBe(1);
  });

  it("logs and recovers when the dispatch rejects (catch branch)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rejection = new Error("boom");

    const { wrapper, dispatch } = mountComponent({
      articles: [],
      dispatchImpl: () => Promise.reject(rejection),
    });

    await flushPromises();

    expect(dispatch).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", rejection);
    // catch sets isLoading=false -> content grid is shown, not the skeleton.
    expect(wrapper.find(".skeleton-large").exists()).toBe(false);
    expect(wrapper.find(".featured-grid").exists()).toBe(true);

    errorSpy.mockRestore();
  });
});

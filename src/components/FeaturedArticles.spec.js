import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import { createStore } from "vuex";
import FeaturedArticles from "@/components/FeaturedArticles.vue";

// Mock @/utils so we control formatDateToLongString / setDefaultImage and can
// assert they are invoked with the right args from the template.
vi.mock("@/utils", () => ({
  formatDateToLongString: vi.fn((d) => `formatted:${d}`),
  setDefaultImage: vi.fn(),
}));

import { formatDateToLongString, setDefaultImage } from "@/utils";

// Stub the NewsCard child so this spec only instruments FeaturedArticles.vue.
const NewsCardStub = {
  name: "NewsCard",
  props: ["article", "featured", "minDetails"],
  template: `<div class="news-card-stub">{{ article.title }}</div>`,
};

/**
 * Build a vuex store whose `articles/featuredArticles` getter returns the
 * supplied list and whose dispatch is a spy that resolves or rejects.
 */
function makeStore({ articles = [], dispatchImpl } = {}) {
  const dispatch = vi.fn(
    dispatchImpl || (() => Promise.resolve())
  );
  const store = createStore({
    getters: {
      "articles/featuredArticles": () => articles,
    },
  });
  // Override dispatch with our spy (keep getters from the real store).
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
        RouterLink: RouterLinkStub,
      },
    },
  });
  return { wrapper, store, dispatch };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeaturedArticles.vue", () => {
  it("dispatches fetchArticlesByType on mount with featured/size args", async () => {
    const { dispatch } = mountComponent({ articles: [] });
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "featured",
      size: 10,
    });
  });

  it("renders nothing in the grid when featuredArticles is empty (v-for empty branch)", async () => {
    const { wrapper } = mountComponent({ articles: [] });
    await Promise.resolve();

    expect(wrapper.find(".custom-grid").exists()).toBe(true);
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
    expect(wrapper.find(".row-article").exists()).toBe(false);
  });

  it("renders NewsCard for index 0 and standard card for the rest (both v-if/v-else branches)", async () => {
    const articles = [
      {
        id: 1,
        title: "Featured One",
        slug: "featured-one",
        summary: "first summary",
      },
      {
        id: 2,
        title: "Second",
        slug: "second-slug",
        summary: "second summary",
        cover: { file: "https://img/second.jpg" },
        scheduledFor: "2025-01-02",
        created_at: "2025-01-01",
      },
    ];
    const { wrapper } = mountComponent({ articles });
    await Promise.resolve();

    // index 0 -> NewsCard stub
    const newsCard = wrapper.findComponent(NewsCardStub);
    expect(newsCard.exists()).toBe(true);
    expect(newsCard.props("featured")).toBe(true);
    expect(newsCard.props("article")).toEqual(articles[0]);

    // featured-card class on the index-0 wrapper, standard-card on others
    const cells = wrapper.findAll(".custom-grid > div");
    expect(cells[0].classes()).toContain("featured-card");
    expect(cells[1].classes()).toContain("standard-card");

    // index 1 -> standard (else) block rendered
    const rowArticle = wrapper.find(".row-article");
    expect(rowArticle.exists()).toBe(true);

    // image src bound from cover?.file (truthy optional-chaining branch)
    const img = rowArticle.find("img.article-img");
    expect(img.attributes("src")).toBe("https://img/second.jpg");

    // title + summary rendered
    expect(rowArticle.text()).toContain("Second");
    expect(rowArticle.text()).toContain("second summary");

    // scheduledFor preferred over created_at (left side of ||)
    expect(formatDateToLongString).toHaveBeenCalledWith("2025-01-02");
    expect(rowArticle.text()).toContain("formatted:2025-01-02");

    // router-links target the slug
    const links = rowArticle.findAllComponents(RouterLinkStub);
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links[0].props("to")).toBe("/news/second-slug");
  });

  it("falls back to created_at when scheduledFor is absent and src is undefined when cover missing", async () => {
    const articles = [
      { id: 10, title: "Lead", slug: "lead", summary: "lead summary" },
      {
        id: 11,
        title: "NoCover",
        slug: "no-cover",
        summary: "no cover summary",
        // no cover -> cover?.file is undefined (falsy optional-chaining branch)
        // no scheduledFor -> created_at used (right side of ||)
        created_at: "2024-12-31",
      },
    ];
    const { wrapper } = mountComponent({ articles });
    await Promise.resolve();

    const img = wrapper.find(".row-article img.article-img");
    // src bound to undefined -> attribute not present
    expect(img.attributes("src")).toBeUndefined();

    expect(formatDateToLongString).toHaveBeenCalledWith("2024-12-31");
    expect(wrapper.find(".row-article").text()).toContain(
      "formatted:2024-12-31"
    );
  });

  it("invokes setDefaultImage on image error", async () => {
    const articles = [
      { id: 1, title: "Lead", slug: "lead", summary: "s" },
      {
        id: 2,
        title: "Img",
        slug: "img",
        summary: "s2",
        cover: { file: "bad.jpg" },
        created_at: "2025-01-01",
      },
    ];
    const { wrapper } = mountComponent({ articles });
    await Promise.resolve();

    const img = wrapper.find(".row-article img.article-img");
    await img.trigger("error");

    expect(setDefaultImage).toHaveBeenCalledTimes(1);
  });

  it("logs and recovers when the dispatch rejects (catch branch)", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const rejection = new Error("boom");

    const { dispatch } = mountComponent({
      articles: [],
      dispatchImpl: () => Promise.reject(rejection),
    });

    // allow the rejected promise + catch to settle
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Error fetching posts:",
      rejection
    );

    errorSpy.mockRestore();
  });
});

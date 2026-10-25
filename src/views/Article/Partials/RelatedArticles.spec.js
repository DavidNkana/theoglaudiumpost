import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import RelatedArticles from "@/views/Article/Partials/RelatedArticles.vue";

// Stub the NewsCard child so this spec only instruments RelatedArticles.vue and
// does not pull in NewsCard's heavy deps (vuex, MediaService, etc.).
const NewsCardStub = {
  name: "NewsCard",
  props: ["article"],
  template: `<div class="news-card-stub">{{ article.title }}</div>`,
};

function mountComponent(articles) {
  return mount(RelatedArticles, {
    props: { articles },
    global: {
      stubs: {
        NewsCard: NewsCardStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
}

describe("RelatedArticles.vue", () => {
  it("renders the section header", () => {
    const wrapper = mountComponent([]);
    const title = wrapper.get(".section-title");
    expect(title.text()).toBe("Related Articles");
  });

  it("renders no NewsCards for an empty articles list (v-for empty branch)", () => {
    const wrapper = mountComponent([]);
    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(0);
    expect(wrapper.findAll(".col-8.col-md-4")).toHaveLength(0);
  });

  it("renders one NewsCard per article and passes the article prop (v-for non-empty branch)", () => {
    const articles = [
      { id: 1, title: "First Story" },
      { id: 2, title: "Second Story" },
      { id: 3, title: "Third Story" },
    ];
    const wrapper = mountComponent(articles);

    const cards = wrapper.findAllComponents(NewsCardStub);
    expect(cards).toHaveLength(3);

    // Each card receives the matching article object as its `article` prop and
    // is wrapped in the responsive column div.
    const cols = wrapper.findAll(".col-8.col-md-4");
    expect(cols).toHaveLength(3);

    expect(cards[0].props("article")).toEqual(articles[0]);
    expect(cards[1].props("article")).toEqual(articles[1]);
    expect(cards[2].props("article")).toEqual(articles[2]);

    expect(cards[0].text()).toBe("First Story");
    expect(cards[1].text()).toBe("Second Story");
    expect(cards[2].text()).toBe("Third Story");
  });
});

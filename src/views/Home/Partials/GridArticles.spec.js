import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import GridArticles from "@/views/Home/Partials/GridArticles.vue";

// Stub the only external boundary the component imports: the Article child.
// It is replaced with a lightweight stub so this spec exercises GridArticles
// in isolation (the v-for rendering + prop wiring), not Article's internals.
const ArticleStub = {
  name: "Article",
  props: ["article", "layout"],
  template:
    '<div class="article-stub" :data-id="article.id" :data-layout="layout">{{ article.title }}</div>',
};

function mountGrid() {
  return mount(GridArticles, {
    global: {
      stubs: {
        Article: ArticleStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
}

describe("GridArticles", () => {
  it("renders both category sections with their headings and See All text", async () => {
    const wrapper = mountGrid();
    await flushPromises();

    const headings = wrapper.findAll("h3.heading56");
    expect(headings).toHaveLength(2);
    expect(headings[0].text()).toContain("Category 1");
    expect(headings[0].text()).toContain("See All");
    expect(headings[1].text()).toContain("Category 2");
    expect(headings[1].text()).toContain("See All");
  });

  it("renders an Article for every item in both v-for loops (non-empty branch)", () => {
    const wrapper = mountGrid();

    // 5 sample articles rendered twice (Category 1 + Category 2) = 10 stubs.
    const articles = wrapper.findAllComponents(ArticleStub);
    expect(articles).toHaveLength(10);

    // Each article column wraps a stub and is keyed/positioned correctly.
    const columns = wrapper.findAll(".col-6.col-md-4");
    expect(columns).toHaveLength(10);
  });

  it("passes the article object and the verticle layout prop to each Article", () => {
    const wrapper = mountGrid();
    const articles = wrapper.findAllComponents(ArticleStub);

    articles.forEach((a) => {
      expect(a.props("layout")).toBe("verticle");
      const article = a.props("article");
      expect(article).toBeTruthy();
      expect(article).toHaveProperty("id");
      expect(article).toHaveProperty("title");
      expect(article).toHaveProperty("imageUrl");
      expect(article).toHaveProperty("date");
    });

    // First section's first article matches the first sample record.
    const first = articles[0];
    expect(first.props("article").id).toBe("1");
    expect(first.props("article").title).toBe("This is my 2024 unwrapped");
    expect(first.attributes("data-id")).toBe("1");
    expect(first.attributes("data-layout")).toBe("verticle");
  });

  it("renders both sections with the responsive sidebar columns", () => {
    const wrapper = mountGrid();

    // Two main article columns (col-md-9) and two sidebar columns (col-md-3).
    expect(wrapper.findAll(".col-12.col-md-9")).toHaveLength(2);
    expect(wrapper.findAll(".col-12.col-md-3")).toHaveLength(2);
  });

  it("renders the same set of article ids in both category sections", () => {
    const wrapper = mountGrid();
    const ids = wrapper
      .findAllComponents(ArticleStub)
      .map((a) => a.props("article").id);

    // 5 distinct ids, repeated for the second section.
    expect(ids).toEqual(["1", "2", "3", "4", "5", "1", "2", "3", "4", "5"]);
  });
});

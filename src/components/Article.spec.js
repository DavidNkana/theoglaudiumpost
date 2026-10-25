import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import Article from "@/components/Article.vue";

const article = {
  title: "Headline Story",
  imageUrl: "https://cdn.example.com/img.jpg",
  date: "08 Jan, 2025",
};

function mountArticle(props = {}) {
  return mount(Article, {
    props: { article, ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("Article", () => {
  it("renders the article title, date and image from the article prop", () => {
    const wrapper = mountArticle();
    expect(wrapper.find("h3").text()).toBe(article.title);
    expect(wrapper.find(".meta56__date").text()).toBe(article.date);

    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe(article.imageUrl);
    expect(img.attributes("srcset")).toBe(
      `${article.imageUrl} 150w, ${article.imageUrl} 480w`
    );

    // Both RouterLinks point at the article route.
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links).toHaveLength(2);
    links.forEach((l) => expect(l.props("to")).toBe("/article/2"));
  });

  it("applies the horizontal flex classes by default", () => {
    const wrapper = mountArticle();
    const cls = wrapper.find("article").classes();
    expect(cls).toContain("d-flex");
    expect(cls).toContain("valign-top");
  });

  it("applies the horizontal flex classes when layout is explicitly 'horizontal'", () => {
    const wrapper = mountArticle({ layout: "horizontal" });
    const cls = wrapper.find("article").classes();
    expect(cls).toContain("d-flex");
    expect(cls).toContain("valign-top");
  });

  it("omits the flex classes for a non-horizontal (vertical) layout", () => {
    const wrapper = mountArticle({ layout: "vertical" });
    const cls = wrapper.find("article").classes();
    expect(cls).not.toContain("d-flex");
    expect(cls).not.toContain("valign-top");
  });
});

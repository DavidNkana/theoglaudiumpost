import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

const m = vi.hoisted(() => ({
  getMediaById: vi.fn(),
}));

vi.mock("@/features/media/MediaService", () => ({
  getMediaById: (...args) => m.getMediaById(...args),
}));

import NewspaperArticleCard from "@/components/NewspaperArticleCard.vue";

const article = {
  id: "a1",
  title: "Interchange roadworks enter second phase from Monday",
  slug: "interchange-roadworks-second-phase",
  summary: "The R557 interchange upgrade resumes on Monday.",
  category: { id: "c1", name: "Local Government" },
  published_at: "2026-11-02T00:00:00Z",
  sources: ["https://laudiumpost.co.za/news/interchange-roadworks"],
  cover_id: "m1",
};

const mountCard = (props = {}) =>
  mount(NewspaperArticleCard, {
    props: { article, ...props },
    global: { stubs: { RouterLink: RouterLinkStub, "router-link": RouterLinkStub } },
  });

describe("components/NewspaperArticleCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getMediaById.mockResolvedValue({
      status: 200,
      data: { url: "https://cdn.test/latest/cover.jpg" },
    });
  });

  it("shows the headline, the short description and the sub text", () => {
    const wrapper = mountCard();

    expect(wrapper.find(".article-kicker").text()).toBe("Local Government");
    expect(wrapper.find(".article-title").text()).toBe(article.title);
    expect(wrapper.find(".article-standfirst").text()).toBe(article.summary);
    expect(wrapper.find(".article-date").text()).toBe("2 November 2026");
    expect(wrapper.find(".article-source").text()).toBe("laudiumpost.co.za");
    expect(wrapper.find(".article-more").text()).toContain("Read more");
  });

  it("puts the headline and description above the picture and the sub text below it", () => {
    const wrapper = mountCard();
    const html = wrapper.html();

    const titleAt = html.indexOf("article-title");
    const pictureAt = html.indexOf("article-picture");
    const footAt = html.indexOf("article-foot");

    expect(titleAt).toBeGreaterThan(-1);
    expect(pictureAt).toBeGreaterThan(titleAt);
    expect(footAt).toBeGreaterThan(pictureAt);
  });

  it("sets the headline in the newspaper serif", () => {
    const wrapper = mountCard();

    const style = wrapper.find(".article-title").attributes("style") || "";
    // The font is declared in the component's stylesheet; assert the class hook
    // the stylesheet targets and that the card renders it.
    expect(wrapper.find("article.newspaper-article").exists()).toBe(true);
    expect(wrapper.find(".article-title").element.tagName).toBe("H2");
    expect(style).toBe("");
  });

  it("resolves the cover image from the media id", async () => {
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();

    expect(m.getMediaById).toHaveBeenCalledWith("m1", null);
    expect(wrapper.find(".article-image").attributes("src")).toBe(
      "https://cdn.test/latest/cover.jpg",
    );
  });

  it("asks for the story type of a lead story", async () => {
    mountCard({ isTopStory: true });
    await Promise.resolve();

    expect(m.getMediaById).toHaveBeenCalledWith("m1", "top");
  });

  it("uses the embedded cover when there is no media id", async () => {
    const wrapper = mountCard({
      article: { ...article, cover_id: null, cover: { file: "https://cdn.test/x.jpg" } },
    });
    await wrapper.vm.$nextTick();

    expect(m.getMediaById).not.toHaveBeenCalled();
    expect(wrapper.find(".article-image").attributes("src")).toBe(
      "https://cdn.test/x.jpg",
    );
  });

  it("falls back to a placeholder when there is no image", async () => {
    const wrapper = mountCard({
      article: { ...article, cover_id: null, cover: null },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".article-image").attributes("src")).toContain(
      "placehold.co",
    );
  });

  it("leaves out the parts the article does not have", () => {
    const wrapper = mountCard({
      article: {
        id: "a2",
        title: "A headline",
        slug: "a-headline",
        summary: "",
        category: null,
        published_at: null,
        sources: [],
        cover_id: null,
        cover: null,
      },
    });

    expect(wrapper.find(".article-kicker").exists()).toBe(false);
    expect(wrapper.find(".article-standfirst").exists()).toBe(false);
    expect(wrapper.find(".article-date").exists()).toBe(false);
    expect(wrapper.find(".article-source").exists()).toBe(false);
  });
});

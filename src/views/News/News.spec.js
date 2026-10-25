import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { ref } from "vue";

// --- Mock the only external boundary the file imports: the useMobile composable.
// Every other import is a child Vue component, which we neutralise via global.stubs
// so none of their own service/store imports ever execute.
const isMobileRef = ref(false);
vi.mock("@/composables/useMobile.js", () => ({
  useMobile: () => ({ isMobile: isMobileRef }),
}));

import News from "@/views/News/News.vue";
import {
  HOME_BANNER,
  IN_ARTICLE_MID,
  IN_ARTICLE_BOTTOM,
  SIDEBAR_TOP,
  SIDEBAR_MID,
  SIDEBAR_BOTTOM,
} from "@/utils";

// Stub every child component so the unit stays isolated to News.vue's own template.
const AdBannerStub = {
  name: "AdBanner",
  props: ["size", "placement"],
  template: `<div class="ad-banner-stub" :data-size="size" :data-placement="placement"></div>`,
};
const FeaturedArticlesStub = {
  name: "FeaturedArticles",
  template: `<div class="featured-articles-stub"></div>`,
};
const TopStoriesStub = {
  name: "TopStories",
  props: ["page"],
  template: `<div class="top-stories-stub" :data-page="page"></div>`,
};
const LatestNewsStub = {
  name: "LatestNews",
  props: ["page", "showTitle"],
  template: `<div class="latest-news-stub" :data-page="page" :data-show-title="String(showTitle)"></div>`,
};
const PopularStoriesStub = {
  name: "PopularStories",
  props: ["page"],
  template: `<div class="popular-stories-stub" :data-page="page"></div>`,
};
const TagsStub = {
  name: "Tags",
  props: ["page"],
  template: `<div class="tags-stub" :data-page="page"></div>`,
};
const NewspaperViewStub = {
  name: "NewspaperView",
  template: `<div class="newspaper-view-stub"></div>`,
};

const mountNews = () =>
  mount(News, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        AdBanner: AdBannerStub,
        FeaturedArticles: FeaturedArticlesStub,
        TopStories: TopStoriesStub,
        LatestNews: LatestNewsStub,
        PopularStories: PopularStoriesStub,
        Tags: TagsStub,
        NewspaperView: NewspaperViewStub,
      },
    },
  });

beforeEach(() => {
  isMobileRef.value = false;
});

describe("News.vue", () => {
  describe("mobile branch (v-if=isMobile)", () => {
    it("renders only the NewspaperView and none of the desktop layout", async () => {
      isMobileRef.value = true;
      const wrapper = mountNews();
      await flushPromises();

      expect(wrapper.find(".newspaper-view-stub").exists()).toBe(true);
      // Desktop layout must be entirely absent on the mobile branch.
      expect(wrapper.find(".news-page").exists()).toBe(false);
      expect(wrapper.find(".featured-articles-stub").exists()).toBe(false);
      expect(wrapper.find(".top-stories-stub").exists()).toBe(false);
      expect(wrapper.find(".ad-banner-stub").exists()).toBe(false);
    });
  });

  describe("desktop branch (v-else)", () => {
    it("renders the full desktop layout and not the NewspaperView", async () => {
      const wrapper = mountNews();
      await flushPromises();

      expect(wrapper.find(".newspaper-view-stub").exists()).toBe(false);
      expect(wrapper.find(".news-page").exists()).toBe(true);
      expect(wrapper.find(".page-container").exists()).toBe(true);
      expect(wrapper.find(".main-layout").exists()).toBe(true);
      expect(wrapper.find("main.content-column").exists()).toBe(true);
      expect(wrapper.find("aside.sidebar-column").exists()).toBe(true);
    });

    it("renders the featured, top stories and latest news sections", () => {
      const wrapper = mountNews();

      expect(wrapper.find(".featured-articles-stub").exists()).toBe(true);

      const top = wrapper.find(".top-stories-stub");
      expect(top.exists()).toBe(true);
      expect(top.attributes("data-page")).toBe("news");

      const latest = wrapper.find(".latest-news-stub");
      expect(latest.exists()).toBe(true);
      expect(latest.attributes("data-page")).toBe("news");
      // show-title is bound to the literal false.
      expect(latest.attributes("data-show-title")).toBe("false");
    });

    it("renders the sidebar Popular Stories and Tags with the news page prop", () => {
      const wrapper = mountNews();

      const popular = wrapper.find(".popular-stories-stub");
      expect(popular.exists()).toBe(true);
      expect(popular.attributes("data-page")).toBe("news");

      const tags = wrapper.find(".tags-stub");
      expect(tags.exists()).toBe(true);
      expect(tags.attributes("data-page")).toBe("news");
    });

    it("renders every AdBanner with the correct placement constant", () => {
      const wrapper = mountNews();

      const placements = wrapper
        .findAll(".ad-banner-stub")
        .map((el) => el.attributes("data-placement"));

      expect(placements).toEqual([
        HOME_BANNER,
        IN_ARTICLE_MID,
        IN_ARTICLE_BOTTOM,
        SIDEBAR_TOP,
        SIDEBAR_MID,
        SIDEBAR_BOTTOM,
      ]);
    });

    it("renders the section titles for the desktop layout", () => {
      const wrapper = mountNews();
      const text = wrapper.text();

      expect(text).toContain("Top Stories");
      expect(text).toContain("Latest News");
      expect(text).toContain("Popular Stories");
      expect(text).toContain("Popular Tags");
    });
  });
});

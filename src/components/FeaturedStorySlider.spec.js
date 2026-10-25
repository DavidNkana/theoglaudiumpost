import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import { createStore } from "vuex";
import FeaturedStorySlider from "@/components/FeaturedStorySlider.vue";

// Stub the media-loading children so this spec only instruments
// FeaturedStorySlider.vue (and not the real MediaService boundary they import).
const SliderImageStub = {
  name: "SliderImageWithPlaceholder",
  props: ["mediaId"],
  template: `<div class="slider-image-stub" :data-media-id="mediaId"></div>`,
};
const ImageWithPlaceholderStub = {
  name: "ImageWithPlaceholder",
  props: ["mediaId"],
  template: `<div class="image-with-placeholder-stub"></div>`,
};

/**
 * Build a vuex store whose `articles/featuredArticles` getter returns the
 * supplied list and whose dispatch is a spy that resolves, rejects, or stays
 * pending (to exercise the loading/shimmer branch).
 */
function makeStore({ stories = [], dispatchImpl } = {}) {
  const dispatch = vi.fn(dispatchImpl || (() => Promise.resolve()));
  const store = createStore({
    getters: {
      "articles/featuredArticles": () => stories,
    },
  });
  // Override dispatch with our spy (keep getters from the real store).
  store.dispatch = dispatch;
  return { store, dispatch };
}

function mountComponent({ stories, dispatchImpl } = {}) {
  const { store, dispatch } = makeStore({ stories, dispatchImpl });
  const wrapper = mount(FeaturedStorySlider, {
    global: {
      plugins: [store],
      stubs: {
        SliderImageWithPlaceholder: SliderImageStub,
        ImageWithPlaceholder: ImageWithPlaceholderStub,
        RouterLink: RouterLinkStub,
        "router-link": RouterLinkStub,
      },
    },
  });
  return { wrapper, store, dispatch };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeaturedStorySlider.vue", () => {
  it("dispatches fetchArticlesByType on mount with featured/size args", async () => {
    const { dispatch } = mountComponent({ stories: [] });
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "featured",
      size: 3,
    });
  });

  it("renders the carousel with no slides when featuredArticles is empty (v-for empty branch)", async () => {
    const { wrapper } = mountComponent({ stories: [] });
    await Promise.resolve();
    await Promise.resolve();

    // not loading -> carousel shown, shimmer hidden
    expect(wrapper.find("#featuredCarousel").exists()).toBe(true);
    expect(wrapper.find(".featured-img.shimmer").exists()).toBe(false);

    // empty v-for -> no indicators, no slides
    expect(wrapper.find(".carousel-indicators button").exists()).toBe(false);
    expect(wrapper.findComponent(SliderImageStub).exists()).toBe(false);
    expect(wrapper.find(".carousel-item").exists()).toBe(false);

    // static prev/next controls always rendered
    expect(wrapper.find(".carousel-control-prev").exists()).toBe(true);
    expect(wrapper.find(".carousel-control-next").exists()).toBe(true);
  });

  it("renders slides/indicators and drives active vs non-active and category present/absent + scheduledFor branch", async () => {
    const stories = [
      {
        slug: "lead-story",
        cover_id: 11,
        title: "Lead Story",
        summary: "lead summary",
        category: { name: "Politics" },
        scheduledFor: "2025-01-02",
        created_at: "2025-01-01",
      },
      {
        slug: "second-story",
        cover_id: 22,
        title: "Second Story",
        summary: "second summary",
        // no category -> category?.name is undefined (falsy optional-chaining branch)
        // no scheduledFor -> created_at used (right side of ||)
        created_at: "2024-12-31",
      },
    ];
    const { wrapper } = mountComponent({ stories });
    await Promise.resolve();
    await Promise.resolve();

    // indicators: one button per story, only index 0 is active / aria-current
    const indicators = wrapper.findAll(".carousel-indicators button");
    expect(indicators).toHaveLength(2);
    expect(indicators[0].classes()).toContain("active");
    expect(indicators[1].classes()).not.toContain("active");
    expect(indicators[0].attributes("aria-current")).toBe("true");
    expect(indicators[1].attributes("aria-current")).toBe("false");
    expect(indicators[0].attributes("data-bs-slide-to")).toBe("0");
    expect(indicators[1].attributes("aria-label")).toBe("Slide 2");

    // slides: one router-link per story, only index 0 active
    const slides = wrapper.findAllComponents(RouterLinkStub);
    // RouterLinkStub used both for the slide wrapper and the inner title link
    const slideWrappers = wrapper.findAll(".carousel-item");
    expect(slideWrappers).toHaveLength(2);
    expect(slideWrappers[0].classes()).toContain("active");
    expect(slideWrappers[1].classes()).not.toContain("active");

    // SliderImage child receives cover_id
    const images = wrapper.findAllComponents(SliderImageStub);
    expect(images).toHaveLength(2);
    expect(images[0].props("mediaId")).toBe(11);
    expect(images[1].props("mediaId")).toBe(22);

    // category present (truthy optional-chaining branch) vs absent (falsy)
    const badges = wrapper.findAll(".badge.bg-success");
    expect(badges[0].text()).toBe("Politics");
    expect(badges[1].text()).toBe("");

    // titles + summaries
    expect(slideWrappers[0].text()).toContain("Lead Story");
    expect(slideWrappers[0].text()).toContain("lead summary");
    expect(slideWrappers[1].text()).toContain("Second Story");

    // router-link "to" targets the slug (slide wrapper + inner title link)
    expect(slides.some((l) => l.props("to") === "/news/lead-story")).toBe(true);
    expect(slides.some((l) => l.props("to") === "/news/second-story")).toBe(
      true
    );

    // formatDate: scheduledFor preferred for story 0, created_at for story 1
    const captions = wrapper.findAll(".carousel-caption .small.text-light");
    const expected0 = new Date("2025-01-02").toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const expected1 = new Date("2024-12-31").toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(captions[0].text()).toBe(expected0);
    expect(captions[1].text()).toBe(expected1);
  });

  it("shows the shimmer placeholder while loading (v-else branch)", async () => {
    // Keep the dispatch pending so isLoading stays true.
    let resolveDispatch;
    const pending = new Promise((res) => {
      resolveDispatch = res;
    });
    const { wrapper } = mountComponent({
      stories: [],
      dispatchImpl: () => pending,
    });
    await Promise.resolve();

    // loading -> carousel hidden, shimmer shown (v-else)
    expect(wrapper.find("#featuredCarousel").exists()).toBe(false);
    expect(wrapper.find(".featured-img.shimmer").exists()).toBe(true);

    // settle so no unhandled pending promise leaks
    resolveDispatch();
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.find("#featuredCarousel").exists()).toBe(true);
  });

  it("logs and recovers when the dispatch rejects (catch branch) and still leaves loading false", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rejection = new Error("boom");

    const { wrapper, dispatch } = mountComponent({
      stories: [],
      dispatchImpl: () => Promise.reject(rejection),
    });

    // allow the rejected promise + catch to settle
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", rejection);

    // catch sets isLoading=false -> carousel rendered (not shimmer)
    expect(wrapper.find("#featuredCarousel").exists()).toBe(true);
    expect(wrapper.find(".featured-img.shimmer").exists()).toBe(false);

    errorSpy.mockRestore();
  });
});

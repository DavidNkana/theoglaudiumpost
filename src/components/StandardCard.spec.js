import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock the media service boundary ---
import { getMediaById } from "@/features/media/MediaService";

vi.mock("@/features/media/MediaService", () => ({
  getMediaById: vi.fn(),
}));

// --- Mock the utils boundary (setDefaultImage / formatDateToLongString) ---
import { setDefaultImage } from "@/utils";

vi.mock("@/utils", () => ({
  formatDateToLongString: vi.fn((d) => `LONG(${d})`),
  setDefaultImage: vi.fn(),
}));

import StandardCard from "@/components/StandardCard.vue";

/**
 * Mount helper with router-link stubbed so we can mount in isolation.
 */
function mountCard(props = {}) {
  return mount(StandardCard, {
    props,
    global: {
      stubs: { RouterLink: RouterLinkStub, "router-link": RouterLinkStub },
    },
  });
}

const baseArticle = {
  slug: "my-article",
  title: "My Title",
  summary: "My summary text",
  category: { name: "Sports" },
  created_at: "2025-01-01",
};

describe("StandardCard.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMediaById.mockResolvedValue({
      status: 200,
      data: { url: "https://cdn.example/img.png" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Template rendering branches ----

  it("renders without cover_id or cover.file (img branch, no fetch)", async () => {
    const wrapper = mountCard({ article: { ...baseArticle } });
    await flush();

    // No cover_id and no cover.file -> getMediaById never called
    expect(getMediaById).not.toHaveBeenCalled();

    // isLoadingImage is false -> the <img> branch renders, not the spinner
    expect(wrapper.find(".image-placeholder.loading").exists()).toBe(false);
    const img = wrapper.find("img.article-image");
    expect(img.exists()).toBe(true);
    expect(img.attributes("alt")).toBe("My Title");

    // category?.name renders
    expect(wrapper.find(".category-badge").text()).toBe("Sports");
    // date uses scheduledFor || created_at -> created_at here
    expect(wrapper.find(".date-text").text()).toBe("LONG(2025-01-01)");
    // title
    expect(wrapper.find(".card-title").text()).toContain("My Title");
    // summary shown because minDetails is false (default)
    expect(wrapper.find(".card-summary").exists()).toBe(true);
    expect(wrapper.find(".card-summary").text()).toBe("My summary text");
  });

  it("hides summary when minDetails is true (v-if false branch)", async () => {
    const wrapper = mountCard({
      article: { ...baseArticle },
      minDetails: true,
    });
    await flush();
    expect(wrapper.find(".card-summary").exists()).toBe(false);
  });

  it("uses scheduledFor when present and renders empty category when missing", async () => {
    const wrapper = mountCard({
      article: {
        slug: "s",
        title: "T",
        summary: "x",
        scheduledFor: "2030-06-01",
        // no category -> category?.name is undefined
      },
    });
    await flush();
    // scheduledFor wins over created_at
    expect(wrapper.find(".date-text").text()).toBe("LONG(2030-06-01)");
    // category?.name undefined -> empty badge text
    expect(wrapper.find(".category-badge").text()).toBe("");
  });

  it("@error handler calls setDefaultImage", async () => {
    const wrapper = mountCard({ article: { ...baseArticle } });
    await flush();
    await wrapper.find("img.article-image").trigger("error");
    expect(setDefaultImage).toHaveBeenCalledTimes(1);
  });

  // ---- fetchMedia: cover_id present, success with url ----

  it("fetches media and sets imageUrl from response.data.url (storyType null)", async () => {
    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 7 },
    });
    await flush();

    // storyType null because no featured/top/popular signals
    expect(getMediaById).toHaveBeenCalledWith(7, null);
    const img = wrapper.find("img.article-image");
    expect(img.attributes("src")).toBe("https://cdn.example/img.png");
  });

  // ---- fetchMedia: blob fallback branch (no url in data) ----

  it("falls back to createObjectURL when response.data has no url (blob branch)", async () => {
    const fakeBlob = { size: 10 };
    getMediaById.mockResolvedValue({ status: 200, data: fakeBlob });
    // jsdom does not implement URL.createObjectURL; install a mock.
    const createSpy = vi.fn().mockReturnValue("blob:fake-url");
    URL.createObjectURL = createSpy;

    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 9 },
    });
    await flush();

    expect(createSpy).toHaveBeenCalledWith(fakeBlob);
    expect(wrapper.find("img.article-image").attributes("src")).toBe(
      "blob:fake-url"
    );
  });

  // ---- fetchMedia: response not 200 / no data -> imageUrl stays null ----

  it("leaves imageUrl null when response.status is not 200", async () => {
    getMediaById.mockResolvedValue({ status: 500, data: { url: "nope" } });
    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 3 },
    });
    await flush();
    // src binding null -> no src attribute set
    const img = wrapper.find("img.article-image");
    expect(img.attributes("src")).toBeUndefined();
  });

  it("leaves imageUrl null when response.data is falsy", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: null });
    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 4 },
    });
    await flush();
    expect(wrapper.find("img.article-image").attributes("src")).toBeUndefined();
  });

  // ---- fetchMedia: catch branch (rejected promise) ----

  it("handles fetch rejection (catch branch) and toggles loading off", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    getMediaById.mockRejectedValue(new Error("boom"));

    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 11 },
    });
    await flush();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching media:",
      expect.any(Error)
    );
    // loading turned off in finally -> img branch shows
    expect(wrapper.find(".image-placeholder.loading").exists()).toBe(false);
  });

  // ---- storyType: featured via isFeatured prop ----

  it("sets storyType=featured via isFeatured prop", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 1 },
      isFeatured: true,
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(1, "featured");
  });

  it("sets storyType=featured via article.type === featured", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 1, type: "featured" },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(1, "featured");
  });

  it("sets storyType=featured via tags containing 'featured'", async () => {
    mountCard({
      article: {
        ...baseArticle,
        cover_id: 1,
        tags: [{ name: "Featured" }],
      },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(1, "featured");
  });

  // ---- storyType: top via each signal ----

  it("sets storyType=top via isTopStory prop", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 2 },
      isTopStory: true,
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(2, "top");
  });

  it("sets storyType=top via article.isTopStory", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 2, isTopStory: true },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(2, "top");
  });

  it("sets storyType=top via article.type === topStories", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 2, type: "topStories" },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(2, "top");
  });

  it("sets storyType=top via tags containing 'top story'", async () => {
    mountCard({
      article: {
        ...baseArticle,
        cover_id: 2,
        tags: [{ name: "Top Story" }],
      },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(2, "top");
  });

  // ---- storyType: popular via each signal ----

  it("sets storyType=popular via isPopular prop", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 5 },
      isPopular: true,
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(5, "popular");
  });

  it("sets storyType=popular via article.type === popular", async () => {
    mountCard({
      article: { ...baseArticle, cover_id: 5, type: "popular" },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(5, "popular");
  });

  it("sets storyType=popular via tags containing 'popular'", async () => {
    mountCard({
      article: {
        ...baseArticle,
        cover_id: 5,
        tags: [{ name: "Popular" }],
      },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(5, "popular");
  });

  // ---- tags present but no match -> storyType stays null (covers .some false path) ----

  it("keeps storyType null when tags present but none match", async () => {
    mountCard({
      article: {
        ...baseArticle,
        cover_id: 6,
        tags: [{ name: "Local" }, { name: "Other" }],
      },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledWith(6, null);
  });

  // ---- else-if branch: no cover_id but cover.file present ----

  it("uses article.cover.file when no cover_id (else-if branch)", async () => {
    const wrapper = mountCard({
      article: {
        ...baseArticle,
        cover: { file: "https://files/x.jpg" },
      },
    });
    await flush();
    expect(getMediaById).not.toHaveBeenCalled();
    expect(wrapper.find("img.article-image").attributes("src")).toBe(
      "https://files/x.jpg"
    );
  });

  // ---- watch immediate + re-trigger on article change ----

  it("re-fetches when the article prop changes (watcher)", async () => {
    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 20 },
    });
    await flush();
    expect(getMediaById).toHaveBeenCalledTimes(2); // watch immediate + onMounted

    getMediaById.mockClear();
    getMediaById.mockResolvedValue({
      status: 200,
      data: { url: "https://cdn.example/new.png" },
    });

    await wrapper.setProps({
      article: { ...baseArticle, cover_id: 21 },
    });
    await flush();

    expect(getMediaById).toHaveBeenCalledWith(21, null);
    expect(wrapper.find("img.article-image").attributes("src")).toBe(
      "https://cdn.example/new.png"
    );
  });

  // ---- isLoadingImage true -> spinner placeholder renders (v-if true branch) ----

  it("renders the loading spinner while media is in flight", async () => {
    let resolveFn;
    getMediaById.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    const wrapper = mountCard({
      article: { ...baseArticle, cover_id: 30 },
    });
    await nextTick();

    // While the promise is pending, isLoadingImage is true -> spinner shows
    expect(wrapper.find(".image-placeholder.loading").exists()).toBe(true);
    expect(wrapper.find(".spinner").exists()).toBe(true);
    expect(wrapper.find("img.article-image").exists()).toBe(false);

    // resolve and confirm it flips back
    resolveFn({ status: 200, data: { url: "https://cdn.example/done.png" } });
    await flush();
    expect(wrapper.find(".image-placeholder.loading").exists()).toBe(false);
    expect(wrapper.find("img.article-image").exists()).toBe(true);
  });
});

/**
 * Flush pending microtasks (awaited promises in fetchMedia) and re-render.
 */
async function flush() {
  // Multiple ticks to drain chained awaits (watch + onMounted both call fetchMedia)
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

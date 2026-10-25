import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// Mock the single external boundary: the media service.
const getMediaById = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaById: (...args) => getMediaById(...args),
}));

import PinCard from "@/components/PinCard.vue";

function makeArticle(overrides = {}) {
  return {
    id: 5,
    slug: "hello-world",
    title: "Hello World",
    cover_id: 42,
    ...overrides,
  };
}

function mountCard(props = {}) {
  return mount(PinCard, {
    props: { article: makeArticle(), ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

// Helper to force a deterministic window width.
function setWindowWidth(width) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
    writable: true,
  });
}

describe("PinCard", () => {
  let originalWidth;

  beforeEach(() => {
    getMediaById.mockReset();
    originalWidth = window.innerWidth;
    setWindowWidth(1024); // desktop by default
  });

  afterEach(() => {
    setWindowWidth(originalWidth);
    vi.restoreAllMocks();
  });

  it("shows the spinner while the media request is pending", () => {
    // Never-resolving promise keeps isLoadingImage true -> v-if branch.
    getMediaById.mockReturnValue(new Promise(() => {}));
    const wrapper = mountCard();

    expect(wrapper.find(".pin-image-loading").exists()).toBe(true);
    expect(wrapper.find(".spinner").exists()).toBe(true);
    expect(wrapper.find("img.pin-image").exists()).toBe(false);
  });

  it("resolves cover_id media, sets the image url, hides spinner and emits loaded", async () => {
    getMediaById.mockResolvedValue({
      status: 200,
      data: { url: "https://cdn.example.com/cover.jpg" },
    });
    const wrapper = mountCard();
    await flushPromises();

    // spinner gone, img shown with resolved url + alt from title
    expect(wrapper.find(".pin-image-loading").exists()).toBe(false);
    const img = wrapper.find("img.pin-image");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn.example.com/cover.jpg");
    expect(img.attributes("alt")).toBe("Hello World");

    // watcher (immediate) + onMounted both invoke fetchMedia for cover_id.
    expect(getMediaById).toHaveBeenCalledWith(42, null);
    // loaded emitted at least once (finally + img @load not yet fired)
    expect(wrapper.emitted("loaded")).toBeTruthy();
  });

  it("uses the default alt text when the article has no title", async () => {
    getMediaById.mockResolvedValue({
      status: 200,
      data: { url: "https://cdn.example.com/x.jpg" },
    });
    const wrapper = mountCard({ article: makeArticle({ title: undefined }) });
    await flushPromises();

    expect(wrapper.find("img.pin-image").attributes("alt")).toBe(
      "Article image"
    );
  });

  it("emits loaded when the img fires its native @load event", async () => {
    getMediaById.mockResolvedValue({
      status: 200,
      data: { url: "https://cdn.example.com/load.jpg" },
    });
    const wrapper = mountCard();
    await flushPromises();

    const before = wrapper.emitted("loaded")?.length ?? 0;
    await wrapper.find("img.pin-image").trigger("load");
    expect(wrapper.emitted("loaded").length).toBe(before + 1);
  });

  it("does not set image url when response is 200 but has no url", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { other: true } });
    const wrapper = mountCard();
    await flushPromises();

    // imageUrl stays null -> src absent/empty, but img still rendered.
    const img = wrapper.find("img.pin-image");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBeFalsy();
    expect(wrapper.emitted("loaded")).toBeTruthy();
  });

  it("does not set image url when status is not 200", async () => {
    getMediaById.mockResolvedValue({ status: 404, data: { url: "nope" } });
    const wrapper = mountCard();
    await flushPromises();

    expect(wrapper.find("img.pin-image").attributes("src")).toBeFalsy();
  });

  it("does not set image url when response has no data", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: null });
    const wrapper = mountCard();
    await flushPromises();

    expect(wrapper.find("img.pin-image").attributes("src")).toBeFalsy();
  });

  it("falls back to the placeholder when the media request rejects (catch branch)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("network down");
    getMediaById.mockRejectedValue(failure);

    const wrapper = mountCard();
    await flushPromises();

    expect(wrapper.find("img.pin-image").attributes("src")).toBe(
      "https://placehold.co/400x300?text=Laudium+POST"
    );
    expect(errorSpy).toHaveBeenCalledWith("Error fetching media:", failure);
    expect(wrapper.emitted("loaded")).toBeTruthy();
  });

  it("uses cover.file directly when there is no cover_id", async () => {
    const wrapper = mountCard({
      article: {
        id: 9,
        slug: "s",
        title: "T",
        cover: { file: "https://cdn.example.com/direct.jpg" },
      },
    });
    await flushPromises();

    expect(getMediaById).not.toHaveBeenCalled();
    expect(wrapper.find("img.pin-image").attributes("src")).toBe(
      "https://cdn.example.com/direct.jpg"
    );
    expect(wrapper.emitted("loaded")).toBeTruthy();
  });

  it("uses the Biz placeholder when there is no cover_id and no cover.file", async () => {
    const wrapper = mountCard({
      article: { id: 3, slug: "s", title: "T" },
    });
    await flushPromises();

    expect(getMediaById).not.toHaveBeenCalled();
    expect(wrapper.find("img.pin-image").attributes("src")).toBe(
      "https://placehold.co/400x300?text=Laudium+Biz"
    );
  });

  it("uses the Biz placeholder when cover exists but cover.file is falsy", async () => {
    const wrapper = mountCard({
      article: { id: 3, slug: "s", title: "T", cover: { file: null } },
    });
    await flushPromises();

    expect(wrapper.find("img.pin-image").attributes("src")).toBe(
      "https://placehold.co/400x300?text=Laudium+Biz"
    );
  });

  // --- storyType branch matrix (top / featured / popular) ---
  it("passes storyType 'top' for a top story", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    mountCard({ isTopStory: true });
    await flushPromises();
    expect(getMediaById).toHaveBeenCalledWith(42, "top");
  });

  it("passes storyType 'featured' for a featured story", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    mountCard({ isFeatured: true });
    await flushPromises();
    expect(getMediaById).toHaveBeenCalledWith(42, "featured");
  });

  it("passes storyType 'popular' for a popular story", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    mountCard({ isPopular: true });
    await flushPromises();
    expect(getMediaById).toHaveBeenCalledWith(42, "popular");
  });

  // --- wrapper/card class bindings + randomHeight per card type (desktop) ---
  it("applies top-story classes and a 15% taller height on desktop", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard({ isTopStory: true });
    await flushPromises();

    expect(wrapper.find(".pin-card-wrapper").classes()).toContain(
      "top-story-wrapper"
    );
    // top story is also always a wide card on desktop
    expect(wrapper.find(".pin-card-wrapper").classes()).toContain(
      "wide-wrapper"
    );
    const card = wrapper.find(".pin-card");
    expect(card.classes()).toContain("top-story");
    expect(card.classes()).toContain("wide-card");
    expect(card.attributes("style")).toContain(`height: ${320 * 1.15}px`);
  });

  it("applies featured classes and an 85% height on desktop", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard({ isFeatured: true });
    await flushPromises();

    expect(wrapper.find(".pin-card-wrapper").classes()).toContain(
      "featured-story-wrapper"
    );
    expect(wrapper.find(".pin-card").classes()).toContain("featured-story");
    expect(wrapper.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 0.85}px`
    );
  });

  it("applies popular classes and a 60% height on desktop", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard({ isPopular: true });
    await flushPromises();

    expect(wrapper.find(".pin-card-wrapper").classes()).toContain(
      "popular-story-wrapper"
    );
    expect(wrapper.find(".pin-card").classes()).toContain("popular-story");
    expect(wrapper.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 0.6}px`
    );
  });

  it("applies the regular (else) height of 85% on desktop and is not wide for non-matching seed", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    // id % 10 === 5 -> not < 2 -> not wide
    const wrapper = mountCard({ article: makeArticle({ id: 5 }) });
    await flushPromises();

    const wrapperEl = wrapper.find(".pin-card-wrapper");
    expect(wrapperEl.classes()).not.toContain("wide-wrapper");
    expect(wrapperEl.classes()).not.toContain("top-story-wrapper");
    expect(wrapper.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 0.85}px`
    );
  });

  it("marks a regular card as wide when (id % 10) < 2 on desktop", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    // id % 10 === 1 -> < 2 -> wide
    const wrapper = mountCard({ article: makeArticle({ id: 21 }) });
    await flushPromises();

    expect(wrapper.find(".pin-card-wrapper").classes()).toContain(
      "wide-wrapper"
    );
    expect(wrapper.find(".pin-card").classes()).toContain("wide-card");
  });

  // --- mobile branch: width < 768 covers all the mobile sides + isWideCard false ---
  it("uses mobile heights and disables wide cards when width < 768", async () => {
    setWindowWidth(500);
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });

    // top story mobile -> 1.15, but wide disabled on mobile
    const top = mountCard({ isTopStory: true });
    await flushPromises();
    expect(top.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 1.15}px`
    );
    expect(top.find(".pin-card-wrapper").classes()).not.toContain(
      "wide-wrapper"
    );

    const featured = mountCard({ isFeatured: true });
    await flushPromises();
    expect(featured.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 0.85}px`
    );

    const popular = mountCard({ isPopular: true });
    await flushPromises();
    expect(popular.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 0.6}px`
    );

    const regular = mountCard({ article: makeArticle({ id: 21 }) });
    await flushPromises();
    expect(regular.find(".pin-card").attributes("style")).toContain(
      `height: ${320 * 0.85}px`
    );
    // even a "would-be-wide" id is not wide on mobile
    expect(regular.find(".pin-card-wrapper").classes()).not.toContain(
      "wide-wrapper"
    );
  });

  // --- seed fallback (Math.random) when article has no id ---
  it("falls back to Math.random for the seed when the article has no id", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    // No id, no cover_id -> placeholder path; seed uses Math.random.
    // 0.05 % 10 === 0.05 < 2 -> wide on desktop, exercising the || fallback in
    // both randomHeight and isWideCard.
    const wrapper = mountCard({
      article: { slug: "s", title: "T" },
    });
    await flushPromises();

    expect(randomSpy).toHaveBeenCalled();
    expect(wrapper.find(".pin-card-wrapper").classes()).toContain(
      "wide-wrapper"
    );
  });

  // --- resize handler updates window width and re-emits loaded ---
  it("updates the height and emits loaded on window resize", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard({ isTopStory: true });
    await flushPromises();

    const before = wrapper.emitted("loaded").length;
    setWindowWidth(400); // now mobile
    window.dispatchEvent(new Event("resize"));
    await flushPromises();

    expect(wrapper.emitted("loaded").length).toBe(before + 1);
    // height recomputes (top story mobile still 1.15 of base, so assert wide gone)
    expect(wrapper.find(".pin-card-wrapper").classes()).not.toContain(
      "wide-wrapper"
    );
  });

  it("removes the resize listener on unmount", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard();
    await flushPromises();
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  // --- routeTarget / hasSlug ---
  it("routes to the Article route when a slug is present", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard();
    await flushPromises();

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toEqual({
      name: "Article",
      params: { slug: "hello-world" },
    });
  });

  it("routes to /news when the article has no slug", async () => {
    const wrapper = mountCard({
      article: { id: 3, title: "T" },
    });
    await flushPromises();

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/news");
  });

  // --- onLinkClick: valid slug -> haptic, with and without navigator.vibrate ---
  it("triggers haptic feedback on click when a slug is present and vibrate is supported", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
      writable: true,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard();
    await flushPromises();

    await wrapper.findComponent(RouterLinkStub).trigger("click");

    expect(vibrate).toHaveBeenCalledWith(50);
    expect(logSpy).toHaveBeenCalledWith("Haptic feedback triggered");

    delete navigator.vibrate;
  });

  it("logs the unsupported message when navigator.vibrate is missing", async () => {
    // Ensure vibrate is absent.
    if ("vibrate" in navigator) delete navigator.vibrate;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard();
    await flushPromises();

    await wrapper.findComponent(RouterLinkStub).trigger("click");

    expect(logSpy).toHaveBeenCalledWith(
      "Vibration API not supported on this device"
    );
  });

  it("prevents navigation and warns when clicked without a valid slug", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wrapper = mountCard({
      article: { id: 3, title: "T" }, // no slug
    });
    await flushPromises();

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    // Call the handler directly with a controllable event to assert guards.
    wrapper.vm.onLinkClick({ preventDefault, stopPropagation });

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "PinCard clicked without a valid slug, navigation prevented:",
      expect.objectContaining({ id: 3 })
    );
  });

  // --- getCategoryClass: mapped value AND fallback ---
  it("maps known categories and falls back to bg-dark for unknown ones", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard();
    await flushPromises();

    expect(wrapper.vm.getCategoryClass("Community")).toBe("bg-dark");
    expect(wrapper.vm.getCategoryClass("Unknown")).toBe("bg-dark");
    expect(wrapper.vm.getCategoryClass(undefined)).toBe("bg-dark");
  });

  // --- watcher re-fires when the article prop changes ---
  it("re-fetches media when the article prop changes (watcher)", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "u" } });
    const wrapper = mountCard();
    await flushPromises();
    const callsBefore = getMediaById.mock.calls.length;

    await wrapper.setProps({
      article: makeArticle({ id: 99, cover_id: 77 }),
    });
    await flushPromises();

    expect(getMediaById.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(getMediaById).toHaveBeenLastCalledWith(77, null);
  });
});

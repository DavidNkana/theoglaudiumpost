import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

// --- Mock the AdsService boundary (tracking side-effects) --------------------
vi.mock("@/features/ads/AdsService", () => ({
  trackImpression: vi.fn(),
  trackClick: vi.fn(),
}));

// --- Mock @vueuse/core useIntersectionObserver -------------------------------
// We capture the observer callback so each test can drive the intersection
// branches (intersecting / not intersecting) manually.
let ioCallback = null;
const ioStop = vi.fn();
vi.mock("@vueuse/core", () => ({
  useIntersectionObserver: vi.fn((_target, cb) => {
    ioCallback = cb;
    return { stop: ioStop };
  }),
}));

import { trackImpression, trackClick } from "@/features/ads/AdsService";
import { useIntersectionObserver } from "@vueuse/core";
import PinAdCard from "@/components/PinAdCard.vue";

// Helper to fire the captured intersection-observer callback.
const fireIntersection = (isIntersecting) => {
  ioCallback([{ isIntersecting }]);
};

describe("PinAdCard.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ioCallback = null;
    // jsdom defaults innerWidth to 1024 (>=768) so wide cards are enabled.
    window.innerWidth = 1024;
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  // ---------------------------------------------------------------------------
  // Image ads + processAdImage branches
  // ---------------------------------------------------------------------------
  it("renders image_url ad and emits loaded; wraps wide card when seed%10<2", async () => {
    // id 10 -> 10%10=0 (<2) wide; 10%4=2 -> randomHeight regular branch
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 10, image_url: "https://cdn/x.png", business_name: "Acme", title: "T" } },
    });

    const img = wrapper.find("img.pin-ad-image");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn/x.png");
    expect(img.attributes("alt")).toBe("T");

    // wide-card class applied (isWideCard true)
    expect(wrapper.find(".pin-ad-wrapper").classes()).toContain("wide-wrapper");
    expect(wrapper.find(".pin-ad-card").classes()).toContain("wide-card");

    // height regular: 320 * 0.85 = 272
    expect(wrapper.find(".pin-ad-card").attributes("style")).toContain("272px");

    // business name shown (business_name && !minDetails)
    expect(wrapper.find(".business-name").text()).toBe("Acme");

    // loaded emitted (immediate watch + onMounted both call processAdImage)
    expect(wrapper.emitted("loaded")).toBeTruthy();
    const loadedBefore = wrapper.emitted("loaded").length;

    // image @load handler emits another 'loaded'
    await img.trigger("load");
    expect(wrapper.emitted("loaded").length).toBe(loadedBefore + 1);

    // data-ad-id + href reflect ad
    const link = wrapper.find("a.ad-card-link");
    expect(link.attributes("data-ad-id")).toBe("10");
  });

  it("renders base64 image field (data: prefix) without modification", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 1, image: "data:image/png;base64,AAA" } },
    });
    expect(wrapper.find("img.pin-ad-image").attributes("src")).toBe("data:image/png;base64,AAA");
  });

  it("renders http image field without modification", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 2, image: "http://imgs/abc.png" } },
    });
    expect(wrapper.find("img.pin-ad-image").attributes("src")).toBe("http://imgs/abc.png");
  });

  it("wraps raw base64 image field with the data: prefix", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 3, image: "RAWBASE64DATA" } },
    });
    expect(wrapper.find("img.pin-ad-image").attributes("src")).toBe(
      "data:image/jpeg;base64,RAWBASE64DATA"
    );
  });

  it("falls back to placehold.co when ad has no image/image_url", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 4 } },
    });
    expect(wrapper.find("img.pin-ad-image").attributes("src")).toBe(
      "https://placehold.co/400x300?text=Advertisement"
    );
    // default alt branch (no title)
    expect(wrapper.find("img.pin-ad-image").attributes("alt")).toBe("Advertisement");
  });

  it("hides business info when minDetails is true and uses href fallback '#' without click_url", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 5, image_url: "u", business_name: "Acme" }, minDetails: true },
    });
    // business_name set but minDetails true -> not rendered
    expect(wrapper.find(".ad-business-info").exists()).toBe(false);
    // no click_url -> href '#'
    expect(wrapper.find("a.ad-card-link").attributes("href")).toBe("#");
  });

  // ---------------------------------------------------------------------------
  // randomHeight switch branches (heightCategory 0,1,3,default)
  // ---------------------------------------------------------------------------
  it("randomHeight category 0 -> 15% taller (368px)", () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 4, image_url: "u" } } }); // 4%4=0
    expect(wrapper.find(".pin-ad-card").attributes("style")).toContain("368px");
  });

  it("randomHeight category 1 -> regular (272px)", () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 5, image_url: "u" } } }); // 5%4=1
    expect(wrapper.find(".pin-ad-card").attributes("style")).toContain("272px");
  });

  it("randomHeight category 3 -> 40% smaller (192px)", () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 7, image_url: "u" } } }); // 7%4=3
    expect(wrapper.find(".pin-ad-card").attributes("style")).toContain("192px");
  });

  it("randomHeight default branch + Math.random seeds when ad has no id", () => {
    // No id -> seed = Math.random() (mock to a value whose %4 is not 0/1/2/3
    // integer-case... non-integer mod hits default). Use 2.5 -> %4 = 2.5 (default).
    const rnd = vi.spyOn(Math, "random").mockReturnValue(2.5);
    const wrapper = mount(PinAdCard, { props: { ad: { image_url: "u" } } });
    // 2.5 % 4 = 2.5 -> default -> 320*0.85 = 272
    expect(wrapper.find(".pin-ad-card").attributes("style")).toContain("272px");
    // isWideCard: seed 2.5 % 10 = 2.5, not < 2 -> not wide
    expect(wrapper.find(".pin-ad-wrapper").classes()).not.toContain("wide-wrapper");
    rnd.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // isWideCard mobile branch
  // ---------------------------------------------------------------------------
  it("isWideCard false on mobile width (<768)", () => {
    window.innerWidth = 500;
    const wrapper = mount(PinAdCard, { props: { ad: { id: 10, image_url: "u" } } });
    expect(wrapper.find(".pin-ad-wrapper").classes()).not.toContain("wide-wrapper");
  });

  it("recomputes isWideCard on window resize (updateWindowWidth)", async () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 10, image_url: "u" } } });
    expect(wrapper.find(".pin-ad-wrapper").classes()).toContain("wide-wrapper");
    // shrink window and dispatch resize -> updateWindowWidth -> emits loaded
    window.innerWidth = 400;
    window.dispatchEvent(new Event("resize"));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".pin-ad-wrapper").classes()).not.toContain("wide-wrapper");
  });

  // ---------------------------------------------------------------------------
  // Intersection observer: impression tracking
  // ---------------------------------------------------------------------------
  it("tracks impression once when intersecting with an ad id", () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 99, image_url: "u" } } });
    fireIntersection(true);
    expect(trackImpression).toHaveBeenCalledTimes(1);
    expect(trackImpression).toHaveBeenCalledWith(99);
    // fire again -> hasTrackedImpression now true -> not called again
    fireIntersection(true);
    expect(trackImpression).toHaveBeenCalledTimes(1);
    expect(wrapper.exists()).toBe(true);
  });

  it("does not track impression when not intersecting", () => {
    mount(PinAdCard, { props: { ad: { id: 99, image_url: "u" } } });
    fireIntersection(false);
    expect(trackImpression).not.toHaveBeenCalled();
  });

  it("does not track impression when ad has no id (image only)", () => {
    mount(PinAdCard, { props: { ad: { image_url: "u" } } });
    fireIntersection(true);
    expect(trackImpression).not.toHaveBeenCalled();
  });

  it("catches errors thrown by trackImpression", () => {
    trackImpression.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    mount(PinAdCard, { props: { ad: { id: 99, image_url: "u" } } });
    // should not throw
    expect(() => fireIntersection(true)).not.toThrow();
    expect(trackImpression).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // YouTube video ad rendering + intersection-driven thumbnail/iframe swap
  // ---------------------------------------------------------------------------
  it("renders YouTube watch ad: thumbnail when not in view, iframe when in view", async () => {
    const wrapper = mount(PinAdCard, {
      props: {
        ad: {
          id: 20, // 20%4=0 wide... but video path
          video_url: "https://youtube.com/watch?v=ABC123",
          title: "Vid",
        },
      },
    });

    // hasVideo && isYouTubeVideo -> youtube container present
    expect(wrapper.find(".youtube-ad-container").exists()).toBe(true);
    // not in view yet -> thumbnail img
    const thumb = wrapper.find("img.youtube-thumbnail");
    expect(thumb.exists()).toBe(true);
    expect(thumb.attributes("src")).toBe("https://img.youtube.com/vi/ABC123/hqdefault.jpg");
    expect(thumb.attributes("alt")).toBe("Vid");
    // thumbnail @load emits loaded
    await thumb.trigger("load");
    expect(wrapper.emitted("loaded")).toBeTruthy();

    // now in view -> iframe shown with embed url
    fireIntersection(true);
    await wrapper.vm.$nextTick();
    const iframe = wrapper.find("iframe.youtube-ad-iframe");
    expect(iframe.exists()).toBe(true);
    expect(iframe.attributes("src")).toContain("https://www.youtube.com/embed/ABC123?autoplay=1");
    // iframe @load emits loaded
    await iframe.trigger("load");
    expect(wrapper.emitted("loaded").length).toBeGreaterThan(0);
  });

  it("renders YouTube short ad (youtube-short class) and dialog short layout", async () => {
    const wrapper = mount(PinAdCard, {
      props: {
        ad: {
          id: 21,
          video_url: "https://youtube.com/shorts/SHORT1",
          title: "S",
          business_name: "Biz",
        },
      },
    });
    expect(wrapper.find(".youtube-ad-container").classes()).toContain("youtube-short");

    // open dialog (uses default alt fallback "Video Advertisement" on thumbnail)
    const thumb = wrapper.find("img.youtube-thumbnail");
    // ad has title -> alt is title not the video fallback; test fallback separately
    expect(thumb.attributes("alt")).toBe("S");
  });

  it("youtube thumbnail uses 'Video Advertisement' alt fallback when no title", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 22, video_url: "https://youtu.be/YTBE99" } },
    });
    const thumb = wrapper.find("img.youtube-thumbnail");
    expect(thumb.attributes("src")).toBe("https://img.youtube.com/vi/YTBE99/hqdefault.jpg");
    expect(thumb.attributes("alt")).toBe("Video Advertisement");
  });

  it("handles youtube embed URL format", () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 23, video_url: "https://youtube.com/embed/EMB777" } },
    });
    expect(wrapper.find("img.youtube-thumbnail").attributes("src")).toBe(
      "https://img.youtube.com/vi/EMB777/hqdefault.jpg"
    );
  });

  // ---------------------------------------------------------------------------
  // Non-YouTube video falls through to image branch (videoUrl computed path)
  // ---------------------------------------------------------------------------
  it("non-YouTube video_url is not a YouTube video -> image branch rendered", () => {
    // hasVideo true but isYouTubeVideo false -> v-else image branch
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 30, video_url: "https://cdn/movie.mp4", image_url: "https://cdn/i.png" } },
    });
    expect(wrapper.find(".youtube-ad-container").exists()).toBe(false);
    expect(wrapper.find("img.pin-ad-image").exists()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Video dialog open/close + click tracking + haptics
  // ---------------------------------------------------------------------------
  it("opens video dialog on youtube container click, tracks click, locks scroll", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });

    const wrapper = mount(PinAdCard, {
      props: {
        ad: {
          id: 40,
          video_url: "https://youtube.com/watch?v=DLG123",
          title: "DT",
          business_name: "DB",
          click_url: "https://shop.example.com",
        },
      },
      attachTo: document.body,
    });

    await wrapper.find(".youtube-ad-container").trigger("click");

    // dialog teleported to body
    const overlay = document.body.querySelector(".video-dialog-overlay");
    expect(overlay).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
    expect(trackClick).toHaveBeenCalledWith(40);
    expect(vibrate).toHaveBeenCalledWith(50);

    // dialog iframe has the dialog url (controls=1)
    const dlgIframe = document.body.querySelector(".video-dialog-iframe");
    expect(dlgIframe.getAttribute("src")).toContain(
      "https://www.youtube.com/embed/DLG123?autoplay=1&playsinline=1&controls=1"
    );
    // title + business shown
    expect(document.body.querySelector(".video-dialog-title").textContent).toBe("DT");
    expect(document.body.querySelector(".video-dialog-business").textContent).toBe("DB");

    // Visit Site click tracks click (click_url truthy ternary branch)
    const visitBtn = document.body.querySelector(".video-dialog-visit-btn-full");
    expect(visitBtn.classList.contains("disabled")).toBe(false);
    trackClick.mockClear();
    visitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(trackClick).toHaveBeenCalledWith(40);

    wrapper.unmount();
  });

  it("dialog shows 'Advertisement' when no title/business, disabled visit btn without click_url", async () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 41, video_url: "https://youtube.com/watch?v=NOINFO" } },
      attachTo: document.body,
    });
    await wrapper.find(".youtube-ad-container").trigger("click");

    expect(document.body.querySelector(".video-dialog-title")).toBeNull();
    const biz = document.body.querySelector(".video-dialog-business");
    expect(biz.textContent).toBe("Advertisement");

    const visitBtn = document.body.querySelector(".video-dialog-visit-btn-full");
    expect(visitBtn.classList.contains("disabled")).toBe(true);
    expect(visitBtn.getAttribute("href")).toBe("#");

    // Click with no click_url -> the ternary's preventDefault branch
    trackClick.mockClear();
    const evt = new MouseEvent("click", { bubbles: true, cancelable: true });
    visitBtn.dispatchEvent(evt);
    await wrapper.vm.$nextTick();
    expect(trackClick).not.toHaveBeenCalled();
    expect(evt.defaultPrevented).toBe(true);

    wrapper.unmount();
  });

  it("openVideoDialog without navigator.vibrate skips haptics", async () => {
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    const wrapper = mount(PinAdCard, {
      props: { ad: { video_url: "https://youtube.com/watch?v=NOID" } }, // no id -> trackClick not called
      attachTo: document.body,
    });
    await wrapper.find(".youtube-ad-container").trigger("click");
    expect(document.body.querySelector(".video-dialog-overlay")).not.toBeNull();
    expect(trackClick).not.toHaveBeenCalled(); // no ad.id
    wrapper.unmount();
  });

  it("closes dialog via close button (restores scroll)", async () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 42, video_url: "https://youtube.com/watch?v=CLOSE1" } },
      attachTo: document.body,
    });
    await wrapper.find(".youtube-ad-container").trigger("click");
    expect(document.body.querySelector(".video-dialog-overlay")).not.toBeNull();

    const closeBtn = document.body.querySelector(".video-dialog-close");
    closeBtn.click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector(".video-dialog-overlay")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    wrapper.unmount();
  });

  it("closes dialog via overlay self-click", async () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 43, video_url: "https://youtube.com/watch?v=OVL1" } },
      attachTo: document.body,
    });
    await wrapper.find(".youtube-ad-container").trigger("click");
    const overlay = document.body.querySelector(".video-dialog-overlay");
    // @click.self -> dispatch click with target === overlay
    overlay.dispatchEvent(new Event("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector(".video-dialog-overlay")).toBeNull();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Escape key handler
  // ---------------------------------------------------------------------------
  it("closes dialog on Escape key when open; ignores Escape when closed and other keys", async () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 44, video_url: "https://youtube.com/watch?v=ESC1" } },
      attachTo: document.body,
    });

    // Escape while closed -> no-op (isVideoDialogOpen false branch)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector(".video-dialog-overlay")).toBeNull();

    // open dialog
    await wrapper.find(".youtube-ad-container").trigger("click");
    expect(document.body.querySelector(".video-dialog-overlay")).not.toBeNull();

    // non-Escape key -> stays open
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector(".video-dialog-overlay")).not.toBeNull();

    // Escape -> closes
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector(".video-dialog-overlay")).toBeNull();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // onUnmounted: restore scroll if dialog open at unmount
  // ---------------------------------------------------------------------------
  it("restores body scroll on unmount while dialog open", async () => {
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 45, video_url: "https://youtube.com/watch?v=UNM1" } },
      attachTo: document.body,
    });
    await wrapper.find(".youtube-ad-container").trigger("click");
    expect(document.body.style.overflow).toBe("hidden");
    wrapper.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("unmount with dialog closed leaves scroll untouched", () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 46, image_url: "u" } } });
    document.body.style.overflow = "scroll";
    wrapper.unmount();
    // dialog not open -> body overflow not reset to ''
    expect(document.body.style.overflow).toBe("scroll");
  });

  // ---------------------------------------------------------------------------
  // handleAdClick branches
  // ---------------------------------------------------------------------------
  it("handleAdClick opens http click_url in new tab and tracks click", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(), configurable: true });

    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 50, image_url: "u", click_url: "https://landing.example.com" } },
    });
    await wrapper.find("a.ad-card-link").trigger("click");

    expect(trackClick).toHaveBeenCalledWith(50);
    expect(openSpy).toHaveBeenCalledWith(
      "https://landing.example.com",
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });

  it("handleAdClick with internal '/' click_url falls through (no window.open) and still tracks click", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(), configurable: true });
    const wrapper = mount(PinAdCard, {
      props: { ad: { id: 51, image_url: "u", click_url: "/internal/path" } },
    });
    await wrapper.find("a.ad-card-link").trigger("click");
    // non-http click_url -> the http branch is skipped -> window.open not called
    expect(openSpy).not.toHaveBeenCalled();
    expect(trackClick).toHaveBeenCalledWith(51);
    openSpy.mockRestore();
  });

  it("handleAdClick warns when no click_url and no ad id -> trackClick skipped", async () => {
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    const wrapper = mount(PinAdCard, {
      props: { ad: { image_url: "u" } }, // no id, no click_url
    });
    await wrapper.find("a.ad-card-link").trigger("click");
    expect(trackClick).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // watch(props.ad): id-change resets impression tracking
  // ---------------------------------------------------------------------------
  it("watcher resets impression tracking when ad id changes", async () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 60, image_url: "a" } } });
    fireIntersection(true);
    expect(trackImpression).toHaveBeenCalledTimes(1);

    // change ad to a new id -> watcher resets hasTrackedImpression
    await wrapper.setProps({ ad: { id: 61, image_url: "b" } });
    fireIntersection(true);
    expect(trackImpression).toHaveBeenCalledTimes(2);
    expect(trackImpression).toHaveBeenLastCalledWith(61);
  });

  it("watcher keeps impression tracking when ad id is unchanged", async () => {
    const wrapper = mount(PinAdCard, { props: { ad: { id: 62, image_url: "a" } } });
    fireIntersection(true);
    expect(trackImpression).toHaveBeenCalledTimes(1);

    // change a non-id field -> same id -> hasTrackedImpression NOT reset
    await wrapper.setProps({ ad: { id: 62, image_url: "b" } });
    fireIntersection(true);
    expect(trackImpression).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Intersection callback stays safe for a non-YouTube video ad
  // ---------------------------------------------------------------------------
  it("intersection callback is safe (no throw) for a non-YouTube video ad", () => {
    mount(PinAdCard, {
      props: { ad: { id: 70, video_url: "https://cdn/clip.mp4", image_url: "u" } },
    });
    expect(() => fireIntersection(true)).not.toThrow();
    expect(() => fireIntersection(false)).not.toThrow();
  });

  it("useIntersectionObserver was wired to the component", () => {
    mount(PinAdCard, { props: { ad: { id: 80, image_url: "u" } } });
    expect(useIntersectionObserver).toHaveBeenCalled();
  });
});

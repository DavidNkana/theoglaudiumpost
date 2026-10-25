import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick, reactive } from "vue";

// --- Mock vue-router ----------------------------------------------------------
// Reactive params so the component's watch(() => route.params.slug) fires.
const routeParams = reactive({ slug: "hello-notice" });
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: routeParams }),
}));

// --- Mock vuex ----------------------------------------------------------------
const dispatch = vi.fn();
const relatedNoticesGetter = vi.fn();
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    getters: {
      "notices/relatedNotices": (...a) => relatedNoticesGetter(...a),
    },
  }),
}));

// --- Mock @/utils -------------------------------------------------------------
const formatDate = vi.fn(() => "FORMATTED_DATE");
vi.mock("@/utils", () => ({
  formatDate: (...a) => formatDate(...a),
  HOME_BANNER: "home_banner",
  IN_ARTICLE_BOTTOM: "in_article_bottom",
  IN_ARTICLE_MID: "in_article_mid",
  SIDEBAR_TOP: "sidebar_top",
  SIDEBAR_BOTTOM: "sidebar_bottom",
  SIDEBAR_MID: "sidebar_mid",
}));

// --- Stub heavy child components (external boundaries) ------------------------
vi.mock("@/components/AdBanner.vue", () => ({
  default: {
    name: "AdBanner",
    props: ["size", "placement", "tags"],
    template:
      '<div class="ad-banner-stub" :data-placement="placement" :data-size="size"></div>',
  },
}));

vi.mock("./Partials/Contacts.vue", () => ({
  default: { name: "Contacts", template: '<div class="contacts-stub"></div>' },
}));

vi.mock("./Partials/RelatedNotices.vue", () => ({
  default: {
    name: "RelatedNotices",
    props: ["notices"],
    template: '<div class="related-notices-stub"></div>',
  },
}));

vi.mock("./Partials/RecentUpdates.vue", () => ({
  default: {
    name: "RecentUpdates",
    template: '<div class="recent-updates-stub"></div>',
  },
}));

import Notice from "./Notice.vue";

const mountView = () =>
  mount(Notice, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  routeParams.slug = "hello-notice";
  relatedNoticesGetter.mockReturnValue([]);
  formatDate.mockReturnValue("FORMATTED_DATE");
});

describe("Notice.vue", () => {
  it("shows the loading skeleton while the fetch is pending (notice still null)", async () => {
    // Never-resolving dispatch keeps loading=true / notice=null -> v-else branch.
    dispatch.mockReturnValueOnce(new Promise(() => {}));

    const wrapper = mountView();
    await nextTick();

    // v-else skeleton rendered (5 shimmer paragraph blocks)
    expect(wrapper.findAll(".shimmer").length).toBeGreaterThan(0);
    expect(wrapper.find(".notice-details-page .container.py-4").exists()).toBe(
      true
    );
    // Success-only nodes absent
    expect(wrapper.find(".notice-main").exists()).toBe(false);
    expect(wrapper.find(".breadcrumb").exists()).toBe(false);

    expect(dispatch).toHaveBeenCalledWith(
      "notices/fetchSingleNotice",
      "hello-notice"
    );
  });

  it("renders the loading skeleton (v-else) when the fetch rejects (catch branch)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    dispatch.mockRejectedValueOnce(new Error("boom"));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching notice data:",
      expect.any(Error)
    );
    // notice stays null -> loading skeleton still shown
    expect(wrapper.find(".notice-main").exists()).toBe(false);
    expect(wrapper.findAll(".shimmer").length).toBeGreaterThan(0);

    errSpy.mockRestore();
  });

  it("renders the full success state: image, breadcrumb, paragraphs+ads, related, sidebar", async () => {
    // 6 paragraphs -> with showAds true, an in-article-mid ad inserted after
    // every 3rd paragraph => 2 inserted ads.
    const notice = {
      id: 42,
      category_id: 3,
      title: "Big Notice",
      description: "A short description",
      category: { id: 3, name: "Events" },
      image: { file: "pic.jpg" },
      publish_date: "2026-01-01T10:00:00Z",
      created_at: "2025-12-01T10:00:00Z",
      content:
        "<p>P1</p><p>P2</p><p>P3</p><p>P4</p><p>P5</p><p>P6</p>",
      tags: [{ id: 11 }, { id: 12 }],
    };
    dispatch.mockResolvedValueOnce(notice);
    relatedNoticesGetter.mockReturnValue([{ id: 99 }]);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // Success container shown, skeleton hidden
    expect(wrapper.find(".notice-main").exists()).toBe(true);

    // Top HOME_BANNER ad (large)
    const topAd = wrapper
      .findAll(".ad-banner-stub")
      .find((a) => a.attributes("data-placement") === "home_banner");
    expect(topAd).toBeTruthy();
    expect(topAd.attributes("data-size")).toBe("large");

    // Breadcrumb category link + label + active title
    const links = wrapper.findAllComponents(RouterLinkStub);
    const tos = links.map((l) => l.props("to"));
    expect(tos).toContain("/");
    expect(tos).toContain("/community");
    expect(tos).toContain("/community?category=3");
    expect(wrapper.find(".breadcrumb-item.active").text()).toBe("Big Notice");
    expect(wrapper.text()).toContain("Events");

    // Featured image branch (notice.image present)
    const img = wrapper.find(".notice-featured-image img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("pic.jpg");
    expect(img.attributes("alt")).toBe("Big Notice");
    expect(wrapper.find("figcaption").text()).toBe("Big Notice");

    // Date: publish_date present -> formatDate called with publish_date
    expect(formatDate).toHaveBeenCalledWith("2026-01-01T10:00:00Z");
    expect(wrapper.text()).toContain("FORMATTED_DATE");

    // Content: paragraphs rendered
    const body = wrapper.find(".notice-content");
    expect(body.html()).toContain("P1");
    expect(body.html()).toContain("P6");

    // In-article mid ads inserted after every 3rd paragraph => 2 ads.
    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(2);

    // relatedNotices getter called with id/category, related section shown
    expect(relatedNoticesGetter).toHaveBeenCalledWith({
      id: 42,
      categoryId: 3,
    });
    expect(wrapper.find(".related-notices .related-notices-stub").exists()).toBe(
      true
    );

    // Sidebar children
    expect(wrapper.find(".contacts-stub").exists()).toBe(true);
    expect(wrapper.find(".recent-updates-stub").exists()).toBe(true);
  });

  it("covers else-branches: no image, created_at fallback, no related, ads suppressed for funeral category", async () => {
    const notice = {
      id: 1,
      category_id: null,
      title: "Memorial",
      description: "",
      category: { id: 7, name: "Funeral Notices" }, // funeral -> showAds false
      image: null, // no featured image
      publish_date: null, // -> created_at fallback
      created_at: "2025-06-01T10:00:00Z",
      content: "<p>A</p><p>B</p><p>C</p>", // 3 paras but showAds false -> no mid ad
      tags: [],
    };
    dispatch.mockResolvedValueOnce(notice);
    relatedNoticesGetter.mockReturnValue([]); // empty -> related section hidden

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".notice-main").exists()).toBe(true);

    // No featured image (notice.image falsy)
    expect(wrapper.find(".notice-featured-image").exists()).toBe(false);

    // Date falls back to created_at (publish_date null)
    expect(formatDate).toHaveBeenCalledWith("2025-06-01T10:00:00Z");

    // Paragraphs rendered but NO in-article-mid ad (showAds false via funeral cat)
    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(0);
    expect(wrapper.find(".notice-content").html()).toContain("A");

    // No related section (empty array)
    expect(wrapper.find(".related-notices").exists()).toBe(false);
  });

  it("suppresses ads when the title includes 'funeral' even if category is safe", async () => {
    const notice = {
      id: 2,
      category_id: 4,
      title: "FUNERAL arrangements", // title funeral -> showAds false
      description: "x",
      category: { id: 4, name: "General" },
      image: { file: "z.jpg" },
      publish_date: "2026-02-02T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
      content: "<p>1</p><p>2</p><p>3</p>",
      tags: [{ id: 5 }],
    };
    dispatch.mockResolvedValueOnce(notice);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(0);
  });

  it("does not insert ads when there is no content / no paragraphs (empty v-for, content || [] branch)", async () => {
    // content undefined -> match(...) returns null -> `|| []` branch, no blocks.
    const notice = {
      id: 3,
      category_id: 1,
      title: "No body",
      description: "",
      category: { id: 1, name: "General" },
      image: { file: "i.jpg" },
      publish_date: "2026-03-03T00:00:00Z",
      created_at: "2025-03-03T00:00:00Z",
      // no `content` key at all
      tags: null, // exercises tags?.map optional chaining path indirectly
    };
    dispatch.mockResolvedValueOnce(notice);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // showAds is false (no content) and there are no paragraph blocks at all.
    expect(wrapper.findAll(".notice-content > div").length).toBe(0);
    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(0);
  });

  it("inserts ads with tag ids mapped into the ad placement props (tags?.map non-null path)", async () => {
    // 3 paragraphs + showAds true -> one mid ad whose tags = mapped tag ids.
    const notice = {
      id: 4,
      category_id: 2,
      title: "Has tags",
      description: "d",
      category: { id: 2, name: "Sport" },
      image: { file: "i.jpg" },
      publish_date: "2026-04-04T00:00:00Z",
      created_at: "2025-04-04T00:00:00Z",
      content: "<p>one</p><p>two</p><p>three</p>",
      tags: [{ id: 21 }, { id: 22 }],
    };
    dispatch.mockResolvedValueOnce(notice);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const midAds = wrapper
      .findAllComponents({ name: "AdBanner" })
      .filter((a) => a.props("placement") === "in_article_mid");
    expect(midAds.length).toBe(1);
    expect(midAds[0].props("tags")).toEqual([21, 22]);
  });

  it("re-fetches when the route slug changes (watcher branch)", async () => {
    const first = {
      id: 1,
      category_id: 1,
      title: "First",
      description: "",
      category: { id: 1, name: "General" },
      image: null,
      publish_date: "2026-01-01T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
      content: "<p>First body</p>",
      tags: [],
    };
    const second = {
      id: 2,
      category_id: 2,
      title: "Second",
      description: "",
      category: { id: 2, name: "Events" },
      image: null,
      publish_date: "2026-02-01T00:00:00Z",
      created_at: "2025-02-01T00:00:00Z",
      content: "<p>Second body</p>",
      tags: [],
    };
    dispatch.mockImplementation((_action, slug) =>
      Promise.resolve(slug === "second-notice" ? second : first)
    );

    const wrapper = mountView();
    await flushPromises();
    await nextTick();
    expect(wrapper.find(".notice-content").html()).toContain("First body");

    // Change route slug -> watcher triggers fetchNotice again
    routeParams.slug = "second-notice";
    await flushPromises();
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(dispatch).toHaveBeenLastCalledWith(
      "notices/fetchSingleNotice",
      "second-notice"
    );
    expect(wrapper.find(".notice-content").html()).toContain("Second body");
  });
});

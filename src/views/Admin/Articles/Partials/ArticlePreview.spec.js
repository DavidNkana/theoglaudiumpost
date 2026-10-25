import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ArticlePreview from "./ArticlePreview.vue";

// --- Mock the only external boundary the component imports ---
const getArticleBySlug = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticleBySlug: (...args) => getArticleBySlug(...args),
}));

// Stub child components that pull their own deps (media/image, tags).
const ImageWithPlaceholderStub = {
  name: "ImageWithPlaceholder",
  props: ["mediaId", "image"],
  emits: ["loaded"],
  template:
    '<div class="img-stub" @click="$emit(\'loaded\', { mediaId, url: \'loaded-url\' })"></div>',
};
const TagsStub = {
  name: "Tags",
  props: ["tags", "variant", "size", "colorScheme", "showIcon", "limit"],
  template: '<div class="tags-stub"></div>',
};

function mountPreview(post, opts = {}) {
  return mount(ArticlePreview, {
    props: { post },
    global: {
      stubs: {
        ImageWithPlaceholder: ImageWithPlaceholderStub,
        Tags: TagsStub,
      },
    },
    ...opts,
  });
}

const basePost = {
  title: "Hello World",
  slug: "hello-world",
  status: "published",
  created_at: "2025-01-08T10:30:00Z",
  category: { name: "News" },
  tags: [{ id: 1, name: "tag" }],
  content: "<p>Body</p>", // has content so the watcher does NOT auto-fetch
  cover_id: null,
};

let logSpy;
beforeEach(() => {
  getArticleBySlug.mockReset();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
});

describe("ArticlePreview", () => {
  // --- Watcher: branch where slug present & no content -> fetchPost SUCCESS ---
  it("fetches content on mount when post has slug but no content (success path)", async () => {
    getArticleBySlug.mockResolvedValue({
      status: 200,
      data: { content: "<p>Fetched</p>" },
    });
    const post = { ...basePost, content: null };
    const wrapper = mountPreview(post);
    await flushPromises();

    expect(getArticleBySlug).toHaveBeenCalledWith("hello-world");
    // emits update-props with merged article including fetched content
    const emitted = wrapper.emitted("update-props");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toMatchObject({
      title: "Hello World",
      content: "<p>Fetched</p>",
    });
  });

  // --- fetchPost: status != 200 -> throw -> catch (console.log) ---
  it("logs an error when the fetch returns a non-200 status", async () => {
    getArticleBySlug.mockResolvedValue({ status: 500, data: { content: "x" } });
    const wrapper = mountPreview({ ...basePost, content: null });
    await flushPromises();

    expect(logSpy).toHaveBeenCalled();
    expect(wrapper.emitted("update-props")).toBeFalsy();
  });

  // --- fetchPost: status 200 but no data -> throw -> catch ---
  it("logs an error when the fetch returns 200 with no data", async () => {
    getArticleBySlug.mockResolvedValue({ status: 200, data: null });
    const wrapper = mountPreview({ ...basePost, content: null });
    await flushPromises();

    expect(logSpy).toHaveBeenCalled();
    expect(wrapper.emitted("update-props")).toBeFalsy();
  });

  // --- fetchPost: rejected promise -> catch ---
  it("logs an error when the fetch promise rejects", async () => {
    getArticleBySlug.mockRejectedValue(new Error("network"));
    const wrapper = mountPreview({ ...basePost, content: null });
    await flushPromises();

    expect(logSpy).toHaveBeenCalled();
    expect(wrapper.emitted("update-props")).toBeFalsy();
  });

  // --- Loading state: shows "Loading Content...." while isFetching is true ---
  it("renders the loading message while fetching content", async () => {
    let resolveFn;
    getArticleBySlug.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );
    const wrapper = mountPreview({ ...basePost, content: null });
    await flushPromises(); // isFetching set true synchronously before await resolves

    expect(wrapper.text()).toContain("Loading Content....");
    expect(wrapper.find(".content-excerpt").exists()).toBe(false);

    resolveFn({ status: 200, data: { content: "<p>Done</p>" } });
    await flushPromises();
  });

  // --- Watcher false branch: slug present but content present -> no fetch ---
  it("does not fetch when post already has content", () => {
    mountPreview({ ...basePost });
    expect(getArticleBySlug).not.toHaveBeenCalled();
  });

  // --- Watcher false branch: no slug -> no fetch ---
  it("does not fetch when post has no slug", () => {
    mountPreview({ ...basePost, slug: null, content: null });
    expect(getArticleBySlug).not.toHaveBeenCalled();
  });

  // --- Empty/no content state (not fetching) ---
  it("renders the no-content message when there is no content and not fetching", () => {
    mountPreview({ ...basePost, slug: null, content: null });
    // watcher didn't fetch (no slug), isFetching false -> v-else div
    const wrapper = mountPreview({ ...basePost, slug: null, content: null });
    expect(wrapper.text()).toContain("No content available for preview");
    expect(wrapper.find("p").exists()).toBe(false);
  });

  // --- Content present -> renders v-html content-excerpt ---
  it("renders the formatted content via v-html when content is present", () => {
    const wrapper = mountPreview({ ...basePost });
    const excerpt = wrapper.find(".content-excerpt");
    expect(excerpt.exists()).toBe(true);
    expect(excerpt.html()).toContain("Body");
  });

  // --- formatContent: long content > 500 chars triggers strip + truncate ---
  it("strips and truncates content longer than 500 characters", () => {
    const long = "<p>" + "a".repeat(600) + "</p>";
    const wrapper = mountPreview({ ...basePost, content: long });
    const excerpt = wrapper.find(".content-excerpt");
    expect(excerpt.text()).toContain("...");
    // truncated to 500 chars + ellipsis; original markup stripped
    expect(excerpt.html()).not.toContain("<p>");
  });

  // --- formatContent: long content whose textContent is falsy -> innerText/"" fallback ---
  it("falls back when stripped content has no textContent (long markup-only content)", () => {
    // 200 <br> tags (>500 chars) parse to an empty/falsy textContent,
    // exercising the `tempDiv.textContent || tempDiv.innerText || ""` chain.
    const long = "<br>".repeat(200);
    const wrapper = mountPreview({ ...basePost, content: long });
    const excerpt = wrapper.find(".content-excerpt");
    expect(excerpt.exists()).toBe(true);
    // Result is the "..." suffix appended to an empty stripped string.
    expect(excerpt.text()).toBe("...");
  });

  // --- getStatusBadgeClass: published ---
  it("applies the success badge class for a published article", () => {
    const wrapper = mountPreview({ ...basePost, status: "published" });
    const badge = wrapper.find(".article-status .badge");
    expect(badge.classes()).toContain("bg-success");
    expect(badge.text()).toBe("Published");
  });

  // --- getStatusBadgeClass: draft + ternary Draft label ---
  it("applies the info badge class and Draft label for a draft article", () => {
    const wrapper = mountPreview({ ...basePost, status: "draft" });
    const badge = wrapper.find(".article-status .badge");
    expect(badge.classes()).toContain("bg-info");
    expect(badge.text()).toBe("Draft");
  });

  // --- getStatusBadgeClass: archived ---
  it("applies the warning badge class for an archived article", () => {
    const wrapper = mountPreview({ ...basePost, status: "archived" });
    const badge = wrapper.find(".article-status .badge");
    expect(badge.classes()).toContain("bg-warning");
  });

  // --- getStatusBadgeClass: unknown -> default ---
  it("applies the secondary badge class for an unknown status", () => {
    const wrapper = mountPreview({ ...basePost, status: "weird" });
    const badge = wrapper.find(".article-status .badge");
    expect(badge.classes()).toContain("bg-secondary");
  });

  // --- getStatusBadgeClass: null status -> optional chaining default ---
  it("applies the secondary badge class when status is null", () => {
    const wrapper = mountPreview({ ...basePost, status: null });
    const badge = wrapper.find(".article-status .badge");
    expect(badge.classes()).toContain("bg-secondary");
  });

  // --- formatDate: valid date (uses scheduledFor branch of ||) ---
  it("formats the scheduledFor date when present", () => {
    const wrapper = mountPreview({
      ...basePost,
      scheduledFor: "2025-02-01T08:00:00Z",
    });
    const dateText = wrapper.find(".article-date").text();
    expect(dateText).toContain("Feb");
  });

  // --- formatDate: falls back to created_at, and "-" when neither present ---
  it("renders a dash when there is no date available", () => {
    const wrapper = mountPreview({
      ...basePost,
      scheduledFor: null,
      created_at: null,
    });
    const dateText = wrapper.find(".article-date").text();
    expect(dateText).toContain("-");
  });

  // --- category?.name || "Uncategorized": missing category ---
  it("shows Uncategorized when the post has no category", () => {
    const wrapper = mountPreview({ ...basePost, category: null });
    expect(wrapper.find(".article-category").text()).toContain("Uncategorized");
  });

  it("shows the category name when present", () => {
    const wrapper = mountPreview({ ...basePost, category: { name: "Sports" } });
    expect(wrapper.find(".article-category").text()).toContain("Sports");
  });

  // --- Cover image v-if true branch + handleImageLoaded emit ---
  it("renders the cover image and emits update-props when the image loads (matching cover_id)", async () => {
    const wrapper = mountPreview({ ...basePost, cover_id: 42, cover: "old" });
    const img = wrapper.find(".img-stub");
    expect(img.exists()).toBe(true);

    await img.trigger("click"); // stub emits loaded with { mediaId: 42, url }
    const emitted = wrapper.emitted("update-props");
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0]).toMatchObject({ cover: "loaded-url" });
  });

  // --- handleImageLoaded: mediaId does NOT match cover_id -> no emit ---
  it("does not emit when the loaded image mediaId does not match cover_id", async () => {
    const StubMismatch = {
      name: "ImageWithPlaceholder",
      props: ["mediaId", "image"],
      emits: ["loaded"],
      template:
        '<div class="img-stub" @click="$emit(\'loaded\', { mediaId: 999, url: \'x\' })"></div>',
    };
    const wrapper = mount(ArticlePreview, {
      props: { post: { ...basePost, cover_id: 42 } },
      global: {
        stubs: {
          ImageWithPlaceholder: StubMismatch,
          Tags: TagsStub,
        },
      },
    });
    await wrapper.find(".img-stub").trigger("click");
    expect(wrapper.emitted("update-props")).toBeFalsy();
  });

  // --- Cover image v-if false branch ---
  it("does not render the cover image when cover_id is absent", () => {
    const wrapper = mountPreview({ ...basePost, cover_id: null });
    expect(wrapper.find(".article-cover").exists()).toBe(false);
  });

  // --- Close button events (header + footer) ---
  it("emits close when either close button is clicked", async () => {
    const wrapper = mountPreview({ ...basePost });
    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.find("button.btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  // --- Edit button event ---
  it("emits edit with the post when the edit button is clicked", async () => {
    const post = { ...basePost };
    const wrapper = mountPreview(post);
    await wrapper.find("button.btn-outline-primary").trigger("click");
    const emitted = wrapper.emitted("edit");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toMatchObject({ title: "Hello World" });
  });

  // --- Title rendering ---
  it("renders the post title", () => {
    const wrapper = mountPreview({ ...basePost, title: "My Title" });
    expect(wrapper.find(".article-title").text()).toBe("My Title");
  });
});

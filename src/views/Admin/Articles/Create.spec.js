import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

const m = vi.hoisted(() => ({
  push: vi.fn(),
  routeQuery: {},
  routeState: null,
  swalFire: vi.fn(),
  createArticle: vi.fn(),
  editArticle: vi.fn(),
  uploadMedia: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
}));

// vue-router
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: m.push }),
  useRoute: () => ({ query: m.routeQuery, state: m.routeState }),
}));

vi.mock("@vueuse/router", () => ({
  useRouteQuery: () => ref(null),
}));

// @vueup/vue-quill -> stub QuillEditor (heavy dep)
vi.mock("@vueup/vue-quill", () => ({
  QuillEditor: {
    name: "QuillEditor",
    props: ["content", "contentType", "theme", "toolbar", "styles"],
    emits: ["update:content"],
    template: '<div class="quill-stub"></div>',
  },
}));
vi.mock("@vueup/vue-quill/dist/vue-quill.snow.css", () => ({}));

// sweetalert2
vi.mock("sweetalert2", () => ({
  default: {
    fire: (...args) => m.swalFire(...args),
  },
}));

// ArticlesService
vi.mock("@/features/articles/ArticlesService", () => ({
  createArticle: (...a) => m.createArticle(...a),
  editArticle: (...a) => m.editArticle(...a),
}));

// MediaService
vi.mock("@/features/media/MediaService", () => ({
  uploadMedia: (...a) => m.uploadMedia(...a),
}));

// CategoriesService
vi.mock("@/features/categories/CategoriesService", () => ({
  getCategories: (...a) => m.getCategories(...a),
}));

// TagsService
vi.mock("@/features/tags/TagsService", () => ({
  getTags: (...a) => m.getTags(...a),
}));

import { ref } from "vue";
import Create from "@/views/Admin/Articles/Create.vue";

const categoriesData = [
  { id: "c1", name: "News" },
  { id: "c2", name: "Sports" },
];
const tagsData = [{ id: "t1", name: "Laudium" }];

const mountCreate = async () => {
  const wrapper = mount(Create, {
    global: {
      stubs: {
        RouterLink: true,
        TagSelector: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe("Admin/Articles/Create.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.routeQuery = {};
    m.routeState = null;
    m.getCategories.mockResolvedValue({
      status: 200,
      data: { categories: categoriesData },
    });
    m.getTags.mockResolvedValue({ status: 200, data: tagsData });
    m.createArticle.mockResolvedValue({ status: 201, data: { id: "a1" } });
    m.uploadMedia.mockResolvedValue({
      status: 201,
      data: { id: "m2", file: "https://cdn.test/latest/new.png" },
    });
  });

  it("loads the categories and tags and preselects the first category", async () => {
    const wrapper = await mountCreate();

    expect(m.getCategories).toHaveBeenCalled();
    expect(m.getTags).toHaveBeenCalled();
    expect(wrapper.vm.categories).toHaveLength(2);
    expect(wrapper.vm.article.categoryId).toBe("c1");
  });

  it("has no AI controls left on the page", async () => {
    const wrapper = await mountCreate();

    expect(wrapper.text()).not.toContain("AI Thumbnail");
    expect(wrapper.text()).not.toContain("Find Sources");
    expect(wrapper.text()).not.toContain("fact check");
  });

  it("builds a slug from the title", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.article.title = "New Headline!";
    wrapper.vm.generateSlug();

    expect(wrapper.vm.article.slug).toBe("new-headline");
  });

  it("uploads the chosen cover image and links it to the article", async () => {
    const wrapper = await mountCreate();

    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      set src(value) {
        this._src = value;
        setTimeout(() => this.onload?.(), 0);
      }
      get src() {
        return this._src;
      }
    };
    globalThis.HTMLCanvasElement.prototype.getContext = () => ({
      drawImage: () => {},
    });
    globalThis.HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAA";

    try {
      const file = new File(["x"], "cover.png", { type: "image/png" });
      const target = document.createElement("input");
      target.type = "file";
      Object.defineProperty(target, "files", { value: [file] });

      await wrapper.vm.handleImage({ target });
      await flushPromises();

      expect(m.uploadMedia).toHaveBeenCalled();
      expect(wrapper.vm.article.coverId).toBe("m2");
    } finally {
      globalThis.Image = OriginalImage;
    }
  });

  it("requires a title, slug, summary, content, image and source", async () => {
    const wrapper = await mountCreate();

    expect(wrapper.vm.validateForm()).toBe(false);
    expect(Object.keys(wrapper.vm.validationErrors)).toEqual(
      expect.arrayContaining([
        "title",
        "slug",
        "summary",
        "content",
        "coverImage",
        "sources",
      ]),
    );
  });

  it("accepts a complete article", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.article.title = "A headline";
    wrapper.vm.generateSlug();
    wrapper.vm.article.summary = "A summary";
    wrapper.vm.article.content = "<p>Body</p>";
    wrapper.vm.coverBase64 = "data:image/png;base64,AAA";
    wrapper.vm.thumbnailBase64 = "data:image/jpeg;base64,AAA";
    wrapper.vm.article.sources = ["https://example.com/story"];

    expect(wrapper.vm.validateForm()).toBe(true);
  });

  it("saves the article and returns to the list", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.article.title = "A headline";
    wrapper.vm.generateSlug();
    wrapper.vm.article.summary = "A summary";
    wrapper.vm.article.content = "<p>Body</p>";
    wrapper.vm.coverBase64 = "data:image/png;base64,AAA";
    wrapper.vm.thumbnailBase64 = "data:image/jpeg;base64,AAA";
    wrapper.vm.article.sources = ["https://example.com/story"];

    await wrapper.vm.saveArticle();

    expect(m.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "A headline",
        summary: "A summary",
      }),
    );
    expect(m.push).toHaveBeenCalledWith("/admin/articles");
  });

  it("reports a failed save", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.article.title = "A headline";
    wrapper.vm.generateSlug();
    wrapper.vm.article.summary = "A summary";
    wrapper.vm.article.content = "<p>Body</p>";
    wrapper.vm.coverBase64 = "data:image/png;base64,AAA";
    wrapper.vm.thumbnailBase64 = "data:image/jpeg;base64,AAA";
    wrapper.vm.article.sources = ["https://example.com/story"];

    m.createArticle.mockRejectedValue({
      response: { status: 500, data: { message: "Save failed" } },
    });

    await wrapper.vm.saveArticle();

    expect(m.swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Save failed" }),
    );
  });

  it("clears the form on reset", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.article.title = "Something";
    vi.stubGlobal("confirm", () => true);

    wrapper.vm.resetForm();

    expect(wrapper.vm.article.title).toBe("");
    vi.unstubAllGlobals();
  });

  it("rejects an invalid source URL and a duplicate source", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.newSourceUrl = "not a url";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toHaveLength(0);

    wrapper.vm.newSourceUrl = "https://example.com/story";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toHaveLength(1);

    wrapper.vm.newSourceUrl = "https://example.com/story";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toHaveLength(1);
  });

  it("removes a source", async () => {
    const wrapper = await mountCreate();

    wrapper.vm.article.sources = ["https://example.com/story"];
    wrapper.vm.removeSource(0);

    expect(wrapper.vm.article.sources).toHaveLength(0);
  });
});

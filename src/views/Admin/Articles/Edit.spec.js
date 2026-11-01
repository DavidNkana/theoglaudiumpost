import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

const m = vi.hoisted(() => ({
  push: vi.fn(),
  routeParams: { id: "55" },
  modalShow: vi.fn(),
  modalHide: vi.fn(),
  swalFire: vi.fn(),
  getArticle: vi.fn(),
  removeArticle: vi.fn(),
  editArticle: vi.fn(),
  createArticle: vi.fn(),
  uploadMedia: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
}));

// vue-router
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: m.push }),
  useRoute: () => ({ params: m.routeParams }),
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

// bootstrap Modal
vi.mock("bootstrap", () => ({
  Modal: vi.fn(function () {
    return { show: m.modalShow, hide: m.modalHide };
  }),
}));

// sweetalert2
vi.mock("sweetalert2", () => ({
  default: {
    fire: (...args) => m.swalFire(...args),
  },
}));

// ArticlesService
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticle: (...a) => m.getArticle(...a),
  removeArticle: (...a) => m.removeArticle(...a),
  editArticle: (...a) => m.editArticle(...a),
  createArticle: (...a) => m.createArticle(...a),
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

import Edit from "@/views/Admin/Articles/Edit.vue";

const categoriesData = [
  { id: "c1", name: "News" },
  { id: "c2", name: "Sports" },
];
const tagsData = [{ id: "t1", name: "Laudium" }];

const articleData = {
  id: "55",
  title: "Laudium roadworks",
  slug: "laudium-roadworks",
  summary: "A summary",
  content: "<p>Body</p>",
  article_type: "featured",
  status: "published",
  category_id: "c1",
  cover_id: "m1",
  cover: { id: "m1", file: "https://cdn.test/latest/cover.jpg" },
  scheduled_for: null,
  sources: ["https://example.com/story"],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const mountEdit = async () => {
  const wrapper = mount(Edit, {
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

describe("Admin/Articles/Edit.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getArticle.mockResolvedValue({ status: 200, data: articleData });
    m.getCategories.mockResolvedValue({
      status: 200,
      data: { categories: categoriesData },
    });
    m.getTags.mockResolvedValue({ status: 200, data: tagsData });
    m.editArticle.mockResolvedValue({ status: 200, data: articleData });
    m.removeArticle.mockResolvedValue({ status: 200, data: true });
    m.uploadMedia.mockResolvedValue({
      status: 201,
      data: { id: "m2", file: "https://cdn.test/latest/new.png" },
    });
  });

  it("loads the article, its categories and its tags", async () => {
    const wrapper = await mountEdit();

    expect(m.getArticle).toHaveBeenCalledWith("55");
    expect(m.getCategories).toHaveBeenCalled();
    expect(m.getTags).toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe("Laudium roadworks");
    expect(wrapper.vm.article.articleType).toBe("featured");
    expect(wrapper.vm.article.categoryId).toBe("c1");
    expect(wrapper.vm.article.coverId).toBe("m1");
    expect(wrapper.vm.categories).toHaveLength(2);
  });

  it("shows an error when the article cannot be loaded", async () => {
    m.getArticle.mockResolvedValue({ status: 404, data: null });

    const wrapper = await mountEdit();

    expect(wrapper.vm.error).toBeTruthy();
  });

  it("has no AI controls left on the page", async () => {
    const wrapper = await mountEdit();

    expect(wrapper.text()).not.toContain("AI Thumbnail");
    expect(wrapper.text()).not.toContain("Refine");
    expect(wrapper.text()).not.toContain("Find Sources");
    expect(wrapper.text()).not.toContain("fact check");
  });

  it("builds a slug from the title", async () => {
    const wrapper = await mountEdit();

    wrapper.vm.article.title = "New Headline!";
    wrapper.vm.generateSlug();

    expect(wrapper.vm.article.slug).toBe("new-headline");
  });

  it("uploads a new cover image and links it to the article", async () => {
    const wrapper = await mountEdit();

    // jsdom does not decode images, so the canvas thumbnail step is stubbed
    // to resolve straight away.
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

  it("requires a title, slug, summary, content, category, image and source", async () => {
    const wrapper = await mountEdit();

    wrapper.vm.article.title = "";
    wrapper.vm.article.slug = "";
    wrapper.vm.article.summary = "";
    wrapper.vm.article.content = "";
    wrapper.vm.article.categoryId = "";
    wrapper.vm.article.sources = [];
    wrapper.vm.coverBase64 = "";
    wrapper.vm.thumbnailBase64 = "";

    expect(wrapper.vm.validateForm()).toBe(false);
    expect(Object.keys(wrapper.vm.validationErrors)).toEqual(
      expect.arrayContaining([
        "title",
        "slug",
        "summary",
        "content",
        "categoryId",
        "coverImage",
        "sources",
      ]),
    );
  });

  it("accepts a valid article", async () => {
    const wrapper = await mountEdit();

    expect(wrapper.vm.validateForm()).toBe(true);
  });

  it("saves the article and returns to the list", async () => {
    const wrapper = await mountEdit();

    await wrapper.vm.updateArticle();

    expect(m.editArticle).toHaveBeenCalledWith(
      "55",
      expect.objectContaining({
        title: "Laudium roadworks",
        cover_id: "m1",
      }),
    );
    expect(m.push).toHaveBeenCalledWith("/admin/articles");
  });

  it("reports a failed save", async () => {
    const wrapper = await mountEdit();
    m.editArticle.mockRejectedValue({
      response: { status: 500, data: { message: "Save failed" } },
    });

    await wrapper.vm.updateArticle();

    expect(m.swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Save failed" }),
    );
  });

  it("deletes the article", async () => {
    const wrapper = await mountEdit();

    await wrapper.vm.deleteArticle();

    expect(m.removeArticle).toHaveBeenCalledWith("55");
    expect(m.push).toHaveBeenCalledWith("/admin/articles");
  });

  it("adds a source and rejects duplicates", async () => {
    const wrapper = await mountEdit();

    wrapper.vm.newSourceUrl = "not a url";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toHaveLength(1);

    wrapper.vm.newSourceUrl = "https://example.com/story";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toHaveLength(1);
  });

  it("removes a source", async () => {
    const wrapper = await mountEdit();

    wrapper.vm.removeSource(0);

    expect(wrapper.vm.article.sources).toHaveLength(0);
  });
});

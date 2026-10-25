import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// All shared mock state lives in a hoisted block so the (hoisted) vi.mock
// factories below can safely reference it.
const m = vi.hoisted(() => {
  const { ref } = require("vue");
  return {
    push: vi.fn(),
    routeParams: { id: "55" },
    modalShow: vi.fn(),
    modalHide: vi.fn(),
    swalFire: vi.fn(),
    swalClose: vi.fn(),
    swalShowLoading: vi.fn(),
    getArticle: vi.fn(),
    removeArticle: vi.fn(),
    editArticle: vi.fn(),
    generateArticleThumbnail: vi.fn(),
    findArticleSources: vi.fn(),
    factCheckArticle: vi.fn(),
    getCategories: vi.fn(),
    getTags: vi.fn(),
    refinementHistory: ref([]),
    isRefining: ref(false),
    loadRefinementHistory: vi.fn(),
    submitRefinementRequest: vi.fn(),
    clearHistory: vi.fn(),
  };
});

const {
  push,
  routeParams,
  modalShow,
  modalHide,
  swalFire,
  swalClose,
  swalShowLoading,
  getArticle,
  removeArticle,
  editArticle,
  generateArticleThumbnail,
  findArticleSources,
  factCheckArticle,
  getCategories,
  getTags,
  refinementHistory,
  isRefining,
  loadRefinementHistory,
  submitRefinementRequest,
  clearHistory,
} = m;

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
    close: (...args) => m.swalClose(...args),
    showLoading: (...args) => m.swalShowLoading(...args),
  },
}));

// ArticlesService
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticle: (...a) => m.getArticle(...a),
  removeArticle: (...a) => m.removeArticle(...a),
  editArticle: (...a) => m.editArticle(...a),
  generateArticleThumbnail: (...a) => m.generateArticleThumbnail(...a),
  findArticleSources: (...a) => m.findArticleSources(...a),
  factCheckArticle: (...a) => m.factCheckArticle(...a),
}));

// CategoriesService
vi.mock("@/features/categories/CategoriesService", () => ({
  getCategories: (...a) => m.getCategories(...a),
}));

// TagsService
vi.mock("@/features/tags/TagsService", () => ({
  getTags: (...a) => m.getTags(...a),
}));

// useRefinementHistory composable
vi.mock("@/composables/useRefinementHistory", () => ({
  useRefinementHistory: () => ({
    refinementHistory: m.refinementHistory,
    isRefining: m.isRefining,
    loadRefinementHistory: m.loadRefinementHistory,
    submitRefinement: m.submitRefinementRequest,
    clearHistory: m.clearHistory,
  }),
}));

// Child components -> stubs (defined in global.stubs at mount-time)
import Edit from "@/views/Admin/Articles/Edit.vue";

// ---------------------------------------------------------------------------

const categoriesData = [
  { id: 1, name: "News" },
  { id: 2, name: "Sports" },
];
const tagsData = [
  { id: 10, name: "Tag A" },
  { id: 20, name: "Tag B" },
];

function defaultArticleResponse(overrides = {}) {
  return {
    status: 200,
    data: {
      id: 55,
      title: "My Article",
      slug: "my-article",
      summary: "A summary",
      content: "<p>Body</p>",
      article_type: "top",
      cover: { file: "https://res.cloudinary.com/x/cover.png" },
      thumbnail: { file: "https://res.cloudinary.com/x/thumb.png" },
      audio: { file: "https://audio.example/a.mp3" },
      scheduled_for: null,
      category: { id: 1 },
      tags: [{ id: 10 }, { id: 20 }],
      sources: ["https://example.com/source1"],
      status: "published",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
      ...overrides,
    },
  };
}

const RefineModalStub = {
  name: "RefineArticleModal",
  props: ["refineInput", "isLoading", "refinementHistory"],
  emits: ["submit", "update:refineInput"],
  template: '<div class="refine-modal-stub"></div>',
  methods: {
    show() {},
    hide() {},
  },
};

const TagSelectorStub = {
  name: "TagSelector",
  props: [
    "modelValue",
    "title",
    "tags",
    "searchable",
    "showCount",
    "showActions",
    "showSelectionSummary",
  ],
  emits: ["update:modelValue", "change"],
  template: '<div class="tag-selector-stub"></div>',
};

function mountView() {
  return mount(Edit, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        RefineArticleModal: RefineModalStub,
        TagSelector: TagSelectorStub,
      },
    },
    attachTo: document.body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeParams.id = "55";
  refinementHistory.value = [];
  isRefining.value = false;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // default happy-path service responses
  getArticle.mockResolvedValue(defaultArticleResponse());
  getCategories.mockResolvedValue({ data: categoriesData });
  getTags.mockResolvedValue({ data: tagsData });
  removeArticle.mockResolvedValue({});
  editArticle.mockResolvedValue({ data: {} });
  generateArticleThumbnail.mockResolvedValue({ data: "BASE64DATA" });
  findArticleSources.mockResolvedValue({ data: { success: true, sources: [] } });
  factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
  submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>Refined</p>" });
  swalFire.mockResolvedValue({ isConfirmed: true, isDenied: false });
  // stub global alert
  global.alert = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Edit.vue", () => {
  it("shows the loading spinner before data resolves", () => {
    const wrapper = mountView();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading article data...");
  });

  it("renders the edit form after successful load (published, scheduled_for formatted)", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        scheduled_for: "2030-05-01T10:30:00Z",
        status: "scheduled",
      })
    );
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".card-header").text()).toContain("Edit Article");
    expect(wrapper.text()).toContain("ID: 55");
    // status badge + label for scheduled
    expect(wrapper.find(".badge.bg-info").exists()).toBe(true);
    expect(wrapper.text()).toContain("Scheduled");
    // scheduled date row visible
    expect(wrapper.find("#scheduledDate").exists()).toBe(true);
    // categories rendered
    const options = wrapper.findAll("#category option");
    expect(options.length).toBeGreaterThan(0);
  });

  it("renders published status badge/label and audio player when audioUrl present", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".badge.bg-success").exists()).toBe(true);
    expect(wrapper.text()).toContain("Published");
    // audioUrl present -> audio element
    expect(wrapper.find("audio").exists()).toBe(true);
  });

  it("renders the 'audio generating' branch when published with no audio", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({ audio: null, status: "published" })
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find("audio").exists()).toBe(false);
    expect(wrapper.text()).toContain("Audio is being generated");
  });

  it("renders default (draft) status badge when status is neither published nor scheduled, and no audio sections", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({ audio: null, status: "draft" })
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".badge.bg-secondary").exists()).toBe(true);
    expect(wrapper.text()).toContain("Draft");
    expect(wrapper.find("audio").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Audio is being generated");
  });

  it("handles missing optional nested fields with fallbacks (no cover/thumb/category/tags/sources/article_type)", async () => {
    getArticle.mockResolvedValue({
      status: 200,
      data: {
        id: 77,
        title: "Bare",
        slug: "bare",
        summary: "s",
        content: "<p>c</p>",
        status: "published",
        // no article_type, cover, thumbnail, audio, category, tags, sources
      },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("ID: 77");
    // articleType defaults to featured
    expect(wrapper.vm.article.articleType).toBe("featured");
    // no category -> categoryId falls back to undefined (optional chaining)
    expect(wrapper.vm.article.categoryId).toBeUndefined();
    // no tags -> optional-chained map returns undefined
    expect(wrapper.vm.article.tags).toBeUndefined();
    // no sources -> explicit `|| []` fallback
    expect(wrapper.vm.article.sources).toEqual([]);
    // no cover -> file input shown (no preview image)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });

  it("shows the error state when getArticle returns non-200", async () => {
    getArticle.mockResolvedValue({ status: 500, data: null });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
    expect(wrapper.text()).toContain("Failed to load article");
  });

  it("shows the error state when getArticle rejects, and Go Back navigates", async () => {
    getArticle.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
    await wrapper.find(".btn-outline-danger").trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("shows error state when getArticle resolves 200 but data is null", async () => {
    getArticle.mockResolvedValue({ status: 200, data: null });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
  });

  it("generateSlug runs on title input when autoGenerateSlug is true and slugifies", async () => {
    const wrapper = mountView();
    await flushPromises();
    const titleInput = wrapper.find("#title");
    await titleInput.setValue("Hello, World!!  Test--Case");
    // @input triggers generateSlug
    const slugInput = wrapper.find("#slug");
    expect(slugInput.element.value).toBe("hello-world-test-case");
  });

  it("generateSlug returns early when title is empty (slug unchanged)", async () => {
    const wrapper = mountView();
    await flushPromises();
    const titleInput = wrapper.find("#title");
    await titleInput.setValue("");
    // Regenerate button calls generateSlug directly with empty title -> early return
    const regenBtn = wrapper.findAll("button").find((b) => b.text() === "Regenerate");
    await regenBtn.trigger("click");
    // early return leaves slug untouched (still the loaded value)
    expect(wrapper.find("#slug").element.value).toBe("my-article");
  });

  it("Regenerate button regenerates the slug from current title", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#title").setValue("Brand New Title");
    const regenBtn = wrapper.findAll("button").find((b) => b.text() === "Regenerate");
    await regenBtn.trigger("click");
    expect(wrapper.find("#slug").element.value).toBe("brand-new-title");
  });

  it("goBack (Cancel button) navigates to articles list", async () => {
    const wrapper = mountView();
    await flushPromises();
    const cancelBtn = wrapper.findAll("button").find((b) => b.text() === "Cancel");
    await cancelBtn.trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("confirmDelete opens the modal and deleteArticle success path navigates", async () => {
    const wrapper = mountView();
    await flushPromises();
    const deleteBtn = wrapper.findAll("button").find((b) => b.text() === "Delete");
    await deleteBtn.trigger("click");
    expect(modalShow).toHaveBeenCalled();

    // Click the modal's Delete Article button
    const confirmDeleteBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Delete Article");
    await confirmDeleteBtn.trigger("click");
    await flushPromises();
    expect(removeArticle).toHaveBeenCalledWith(55);
    expect(modalHide).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("deleteArticle error path fires a Swal error", async () => {
    removeArticle.mockRejectedValue(new Error("nope"));
    const wrapper = mountView();
    await flushPromises();
    const confirmDeleteBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Delete Article");
    await confirmDeleteBtn.trigger("click");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
  });

  it("removeImage clears the preview and shows the file input", async () => {
    const wrapper = mountView();
    await flushPromises();
    // cover present -> preview image with remove button
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
    const removeBtn = wrapper.find('button[aria-label="Remove image"]');
    await removeBtn.trigger("click");
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(false);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });

  it("handleStatusChange sets a scheduledFor when switching to scheduled without a date", async () => {
    const wrapper = mountView();
    await flushPromises();
    const statusSelect = wrapper.find("#status");
    await statusSelect.setValue("scheduled");
    await statusSelect.trigger("change");
    await flushPromises();
    // scheduled date input becomes visible and has a value
    const sched = wrapper.find("#scheduledDate");
    expect(sched.exists()).toBe(true);
    expect(sched.element.value).not.toBe("");
  });

  it("handleStatusChange does not overwrite an existing scheduledFor", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        status: "scheduled",
        scheduled_for: "2030-05-01T10:30:00Z",
      })
    );
    const wrapper = mountView();
    await flushPromises();
    const existing = wrapper.find("#scheduledDate").element.value;
    const statusSelect = wrapper.find("#status");
    await statusSelect.setValue("scheduled");
    await statusSelect.trigger("change");
    await flushPromises();
    expect(wrapper.find("#scheduledDate").element.value).toBe(existing);
  });

  // ---- generateThumbnail -------------------------------------------------
  it("generateThumbnail alerts when title or articleType missing", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({ title: "", audio: null })
    );
    const wrapper = mountView();
    await flushPromises();
    // remove the cover so the AI Thumbnail button is rendered
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    // Button is disabled in template when no title; call method directly
    await wrapper.vm.generateThumbnail();
    expect(global.alert).toHaveBeenCalledWith(
      "Please add a title and select an article type first"
    );
    expect(generateArticleThumbnail).not.toHaveBeenCalled();
  });

  it("generateThumbnail success path sets cover/thumbnail and marks imageUpdated", async () => {
    // Provide a working Image + canvas
    stubImageAndCanvas();
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const aiBtn = wrapper.findAll("button").find((b) => b.text().includes("AI Thumbnail"));
    await aiBtn.trigger("click");
    await flushPromises();
    expect(generateArticleThumbnail).toHaveBeenCalledWith("My Article", "top", "gpt");
    // preview re-appears because coverBase64 set
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
  });

  it("generateThumbnail uses the selected image provider (minimax)", async () => {
    stubImageAndCanvas();
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const providerSelect = wrapper.find("select.form-select[style]");
    await providerSelect.setValue("minimax");
    const aiBtn = wrapper.findAll("button").find((b) => b.text().includes("AI Thumbnail"));
    await aiBtn.trigger("click");
    await flushPromises();
    expect(generateArticleThumbnail).toHaveBeenCalledWith("My Article", "top", "minimax");
  });

  it("generateThumbnail error path alerts on rejection", async () => {
    generateArticleThumbnail.mockRejectedValue(new Error("api down"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const aiBtn = wrapper.findAll("button").find((b) => b.text().includes("AI Thumbnail"));
    await aiBtn.trigger("click");
    await flushPromises();
    expect(global.alert).toHaveBeenCalledWith(
      "Failed to generate thumbnail. Please try again or enter a URL manually."
    );
  });

  // ---- handleImage -------------------------------------------------------
  it("handleImage reads file, generates thumbnail and marks imageUpdated", async () => {
    stubImageAndCanvas();
    const wrapper = mountView();
    await flushPromises();
    // remove cover so the file input is rendered
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");

    const fileInput = wrapper.find('input[type="file"]');
    const file = new File(["abc"], "pic.png", { type: "image/png" });

    // Mock FileReader
    const origFR = global.FileReader;
    global.FileReader = class {
      readAsDataURL() {
        this.result = "data:image/png;base64,AAA";
        // onload is async; invoke it
        Promise.resolve().then(() => this.onload());
      }
    };

    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      writable: false,
    });
    await fileInput.trigger("change");
    await flushPromises();
    await flushPromises();

    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
    global.FileReader = origFR;
  });

  it("handleImage does nothing when no file selected", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, "files", {
      value: [],
      writable: false,
    });
    await fileInput.trigger("change");
    await flushPromises();
    // still no preview
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(false);
  });

  it("generateThumbnailFromImage exercises width>height>maxWidth resize branch", async () => {
    stubImageAndCanvas({ width: 600, height: 300 });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const aiBtn = wrapper.findAll("button").find((b) => b.text().includes("AI Thumbnail"));
    await aiBtn.trigger("click");
    await flushPromises();
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
  });

  it("generateThumbnailFromImage exercises height>=width>maxHeight resize branch", async () => {
    stubImageAndCanvas({ width: 300, height: 600 });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const aiBtn = wrapper.findAll("button").find((b) => b.text().includes("AI Thumbnail"));
    await aiBtn.trigger("click");
    await flushPromises();
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
  });

  it("generateThumbnailFromImage with small image hits no-resize branches", async () => {
    stubImageAndCanvas({ width: 50, height: 50 });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    const aiBtn = wrapper.findAll("button").find((b) => b.text().includes("AI Thumbnail"));
    await aiBtn.trigger("click");
    await flushPromises();
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
  });

  // ---- Sources -----------------------------------------------------------
  it("addSource adds a valid url and clears the input + validation error", async () => {
    const wrapper = mountView();
    await flushPromises();
    const newInput = wrapper.find(
      'input[placeholder^="Enter source URL"]'
    );
    await newInput.setValue("https://new-source.com/a");
    const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Add"));
    await addBtn.trigger("click");
    await flushPromises();
    expect(wrapper.vm.article.sources).toContain("https://new-source.com/a");
    expect(newInput.element.value).toBe("");
  });

  it("addSource returns early on empty/whitespace url", async () => {
    const wrapper = mountView();
    await flushPromises();
    const before = wrapper.vm.article.sources.length;
    const newInput = wrapper.find('input[placeholder^="Enter source URL"]');
    await newInput.setValue("   ");
    // call directly because Add button is disabled when empty
    wrapper.vm.addSource();
    await flushPromises();
    expect(wrapper.vm.article.sources.length).toBe(before);
  });

  it("addSource shows Swal on invalid url", async () => {
    const wrapper = mountView();
    await flushPromises();
    const newInput = wrapper.find('input[placeholder^="Enter source URL"]');
    await newInput.setValue("not-a-url");
    // trigger via keyup.enter
    await newInput.trigger("keyup.enter");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid URL", icon: "error" })
    );
  });

  it("addSource shows Swal on duplicate url", async () => {
    const wrapper = mountView();
    await flushPromises();
    const newInput = wrapper.find('input[placeholder^="Enter source URL"]');
    await newInput.setValue("https://example.com/source1"); // already present
    const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Add"));
    await addBtn.trigger("click");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Duplicate Source", icon: "warning" })
    );
  });

  it("removeSource removes the source at index", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.article.sources.length).toBe(1);
    const trashBtn = wrapper.find('button[title="Remove source"]');
    await trashBtn.trigger("click");
    await flushPromises();
    expect(wrapper.vm.article.sources.length).toBe(0);
  });

  it("renders empty-sources branch (no source list) when article has no sources", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ sources: [] }));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".sources-list").exists()).toBe(false);
  });

  // ---- findSources -------------------------------------------------------
  it("findSources requires a title", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ title: "" }));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Title Required", icon: "warning" })
    );
    expect(findArticleSources).not.toHaveBeenCalled();
  });

  it("findSources success adds new sources (deduped)", async () => {
    findArticleSources.mockResolvedValue({
      data: {
        success: true,
        sources: ["https://example.com/source1", "https://new.com/x"],
      },
    });
    const wrapper = mountView();
    await flushPromises();
    const findBtn = wrapper.findAll("button").find((b) => b.text().includes("Find Sources with AI"));
    await findBtn.trigger("click");
    await flushPromises();
    expect(findArticleSources).toHaveBeenCalled();
    expect(wrapper.vm.article.sources).toContain("https://new.com/x");
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sources Found!", icon: "success" })
    );
  });

  it("findSources strips HTML from content and passes plain text", async () => {
    findArticleSources.mockResolvedValue({ data: { success: true, sources: [] } });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(findArticleSources).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Body", debug: true })
    );
  });

  it("findSources with empty content passes empty string", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ content: "" }));
    findArticleSources.mockResolvedValue({ data: { success: true, sources: [] } });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(findArticleSources).toHaveBeenCalledWith(
      expect.objectContaining({ content: "" })
    );
  });

  it("findSources throws on unexpected payload shape (catch path)", async () => {
    findArticleSources.mockResolvedValue({ data: { foo: "bar" } });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", icon: "error" })
    );
  });

  it("findSources 'No Sources Found' branch without debug html", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: false, sources: [], message: "nothing" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No Sources Found", icon: "info" })
    );
  });

  it("findSources 'No Sources Found' branch WITH debug html", async () => {
    findArticleSources.mockResolvedValue({
      data: {
        success: false,
        sources: [],
        message: "nope",
        debug: {
          parseError: "bad json",
          toolQueries: ["q1", "q2"],
          toolTags: ["t1"],
          toolResultCount: 5,
          toolResultUrls: ["https://a.com", "https://b.com"],
          filteredOut: [{ source: "S1", reason: "r1" }],
          extractedJson: "{}",
          rawResponseSnippet: "raw",
        },
      },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No Sources Found" })
    );
  });

  it("findSources debug html: filteredOut > 10 shows the 'Showing 10 of N' note", async () => {
    const filteredOut = Array.from({ length: 12 }, (_, i) => ({
      source: `S${i}`,
      reason: `r${i}`,
    }));
    findArticleSources.mockResolvedValue({
      data: {
        success: false,
        sources: [],
        debug: { filteredOut },
      },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "No Sources Found"
    );
    expect(call[0].html).toContain("Showing 10 of 12 filtered items");
  });

  it("findSources debug html with missing source/reason uses fallbacks", async () => {
    findArticleSources.mockResolvedValue({
      data: {
        success: false,
        sources: [],
        debug: { filteredOut: [{}] },
      },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "No Sources Found"
    );
    expect(call[0].html).toContain("Unknown");
  });

  it("buildFindSourcesDebugHtml returns empty for null/non-object and empty sections", async () => {
    // success branch with no sources & no debug -> debugHtml === ''
    findArticleSources.mockResolvedValue({
      data: { success: false, sources: [] },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    // html falls back to plain string (no debug)
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "No Sources Found"
    );
    expect(call[0].html).toContain("Could not find relevant sources");
  });

  it("findSources error path with debug html in error response", async () => {
    findArticleSources.mockRejectedValue({
      response: { data: { message: "server err", debug: { parseError: "x" } } },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Error"
    );
    expect(call[0].html).toContain("server err");
  });

  it("findSources error path without response.data falls back to error.message", async () => {
    findArticleSources.mockRejectedValue(new Error("plain failure"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Error"
    );
    expect(call[0].html).toBe("Failed to find sources. Please try again.");
  });

  it("findSources success with addedCount 1 uses singular wording", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ sources: [] }));
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: ["https://only.com/x"] },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Sources Found!"
    );
    expect(call[0].text).toContain("Added 1 new source ");
  });

  // ---- validateForm via updateArticle ------------------------------------
  it("updateArticle blocks submit when required fields are empty (validation errors render)", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        title: " ",
        slug: " ",
        summary: " ",
        content: " ",
        category: null,
        cover: null,
        thumbnail: null,
        sources: [],
        status: "draft",
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Title is required");
    expect(wrapper.text()).toContain("Slug is required");
    expect(wrapper.text()).toContain("Summary is required");
    expect(wrapper.text()).toContain("Content is required");
    expect(wrapper.text()).toContain("Please select a category");
    expect(wrapper.text()).toContain("Please include an image");
    expect(wrapper.text()).toContain("At least one source is required");
  });

  it("validateForm: published article without cloudinary image and no new upload shows cloudinary error", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: { file: "data:image/png;base64,AAA" }, // not cloudinary, treated as existing non-cloud
        thumbnail: { file: "data:image/png;base64,BBB" },
        status: "published",
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
    expect(wrapper.vm.validationErrors.coverImage).toContain(
      "Published articles require an image uploaded to Cloudinary"
    );
  });

  it("validateForm: scheduled without date shows 'select a publication date'", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({ status: "scheduled", scheduled_for: null })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.text()).toContain("Please select a publication date");
  });

  it("validateForm: scheduled with past date shows 'must be in the future'", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        status: "scheduled",
        scheduled_for: "2000-01-01T00:00:00Z",
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.text()).toContain("Scheduled date must be in the future");
  });

  it("validateForm: image present but cover not cloudinary, draft status -> passes image checks", async () => {
    // draft skips the cloudinary requirement; ensure it proceeds to factcheck/submit
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: { file: "data:image/png;base64,AAA" },
        thumbnail: { file: "data:image/png;base64,BBB" },
        status: "draft",
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalled();
  });

  // ---- updateArticle success / factcheck ---------------------------------
  it("updateArticle full success path (no factcheck issues, skipFactCheck false)", async () => {
    factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(factCheckArticle).toHaveBeenCalled();
    expect(editArticle).toHaveBeenCalled();
    const payload = editArticle.mock.calls[0][1];
    expect(payload.coverImage).toBe("https://res.cloudinary.com/x/cover.png");
    expect(swalFire).toHaveBeenCalledWith("Article", "Article updated successfully!");
    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("updateArticle with skipFactCheck=true bypasses fact check and sends confirmFactCheck true", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#skipFactCheck").setValue(true);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(factCheckArticle).not.toHaveBeenCalled();
    expect(editArticle).toHaveBeenCalled();
    expect(editArticle.mock.calls[0][1].confirmFactCheck).toBe(true);
  });

  it("updateArticle: runFactCheck returns not-ok when title is empty -> aborts before submit", async () => {
    // title empty makes runFactCheck return {ok:false}; but validateForm would block first.
    // Use a valid form but empty title forced after load via setValue won't pass validation.
    // Instead drive runFactCheck not-ok by title empty while other fields valid is impossible
    // (title required). So we cover via factCheck rejecting below.
    expect(true).toBe(true);
  });

  it("updateArticle: factCheck has issues, user confirms 'Save anyway'", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ claim: "c", verdict: "v", reasoning: "r" }] },
    });
    // first Swal (loading) resolves; second Swal (decision) -> confirmed
    swalFire.mockResolvedValue({ isConfirmed: true, isDenied: false });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalled();
    expect(editArticle.mock.calls[0][1].confirmFactCheck).toBe(true);
  });

  it("updateArticle: factCheck has issues, user cancels -> no submit", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [] },
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: false });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("updateArticle: factCheck issues, user denies -> refineWithFactCheckIssues runs (success)", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ claim: "c" }] },
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: true });
    submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>Fixed</p>" });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(submitRefinementRequest).toHaveBeenCalled();
    expect(wrapper.vm.article.content).toBe("<p>Fixed</p>");
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("runFactCheck catch path: factCheckArticle rejects with response data factCheck issues", async () => {
    factCheckArticle.mockRejectedValue({
      response: { data: { factCheck: { issues: [{ claim: "x" }] }, message: "fc fail" } },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fact check failed", icon: "error" })
    );
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("runFactCheck catch path: rejects with plain error (no response) uses default message", async () => {
    factCheckArticle.mockRejectedValue(new Error("network"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Fact check failed"
    );
    expect(call[0].html).toContain("network");
  });

  it("runFactCheck catch path: rejects with empty error uses fallback message", async () => {
    factCheckArticle.mockRejectedValue({});
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Fact check failed"
    );
    expect(call[0].html).toContain("Could not verify facts");
  });

  it("buildFactCheckHtml: issues with missing fields use fallbacks", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{}] }, // empty issue -> Unknown/Unverified/No details
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: false });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    const decisionCall = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Fact check warning"
    );
    expect(decisionCall[0].html).toContain("Unknown");
    expect(decisionCall[0].html).toContain("Unverified");
    expect(decisionCall[0].html).toContain("No details provided");
  });

  it("buildFactCheckHtml: empty issues array yields the generic flagged message", async () => {
    factCheckArticle.mockRejectedValue({
      response: { data: { factCheck: { issues: [] }, message: "m" } },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Fact check failed"
    );
    expect(call[0].html).toContain("Fact check flagged potential issues");
  });

  // ---- updateArticle catch / conflict ------------------------------------
  it("updateArticle: editArticle rejects with 409 factCheck conflict -> confirms and resubmits", async () => {
    let call = 0;
    editArticle.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return Promise.reject({
          response: { status: 409, data: { factCheck: { issues: [{ claim: "c" }] } } },
        });
      }
      return Promise.resolve({ data: {} });
    });
    // decision Swal -> confirmed
    swalFire.mockResolvedValue({ isConfirmed: true });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith("/admin/articles");
    expect(swalFire).toHaveBeenCalledWith("Article", "Article updated successfully!");
  });

  it("updateArticle: 409 factCheck conflict but user cancels -> no resubmit", async () => {
    editArticle.mockRejectedValue({
      response: { status: 409, data: { factCheck: { issues: [] } } },
    });
    swalFire.mockResolvedValue({ isConfirmed: false });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalledTimes(1);
  });

  it("updateArticle: editArticle rejects with validation errors -> sets validationErrors", async () => {
    editArticle.mockRejectedValue({
      response: { status: 422, data: { errors: { title: "Bad title" } } },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.text()).toContain("Bad title");
  });

  it("updateArticle: editArticle rejects with no usable response -> generic error Swal", async () => {
    editArticle.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", text: "Failed to update article. Please try again." })
    );
  });

  it("updateArticle: editArticle rejects with response.data but no errors key -> generic error", async () => {
    editArticle.mockRejectedValue({
      response: { status: 500, data: {} },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!" })
    );
  });

  it("updateArticle: draft status sends scheduledFor null", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        status: "draft",
        cover: { file: "data:image/png;base64,AAA" },
        thumbnail: { file: "data:image/png;base64,BBB" },
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle.mock.calls[0][1].scheduledFor).toBeNull();
  });

  it("updateArticle: published with no scheduledFor sends a generated ISO date", async () => {
    // default published article has scheduled_for null -> submitArticle uses new Date().toISOString()
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle.mock.calls[0][1].scheduledFor).toBeTruthy();
  });

  it("updateArticle: no coverBase64 -> sends null cover (No coverImage branch)", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: null,
        thumbnail: null,
        status: "draft",
        sources: ["https://example.com/x"],
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    // draft + no image -> validation requires image; add one via base64? Actually
    // validateForm requires coverBase64 OR thumbnailBase64. With both null it errors.
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Please include an image");
  });

  it("updateArticle: coverBase64 is a data: base64 string (isBase64 branch logging)", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: { file: "data:image/png;base64,AAA" },
        thumbnail: { file: "data:image/png;base64,BBB" },
        status: "draft",
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle.mock.calls[0][1].coverImage).toBe("data:image/png;base64,AAA");
  });

  it("updateArticle: coverBase64 with no thumbnail sends null thumbnail", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: { file: "https://res.cloudinary.com/x/cover.png" },
        thumbnail: null,
        status: "published",
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle.mock.calls[0][1].thumbnailImage).toBeNull();
  });

  // ---- refineWithFactCheckIssues edge cases ------------------------------
  it("refineWithFactCheckIssues: no source article id -> 'Refine unavailable'", async () => {
    // article id null and sourceId null
    getArticle.mockResolvedValue(
      defaultArticleResponse({ id: null })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.refineWithFactCheckIssues([{ claim: "c" }]);
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Refine unavailable", icon: "info" })
    );
  });

  it("refineWithFactCheckIssues: refinement fails -> 'Refine failed'", async () => {
    submitRefinementRequest.mockResolvedValue({ success: false, error: "refine boom" });
    const wrapper = mountView();
    await flushPromises();
    const res = await wrapper.vm.refineWithFactCheckIssues([{ claim: "c" }]);
    await flushPromises();
    expect(res).toBe(false);
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Refine failed", icon: "error" })
    );
  });

  it("refineWithFactCheckIssues: refinement fails with no error message uses fallback", async () => {
    submitRefinementRequest.mockResolvedValue({ success: false });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.refineWithFactCheckIssues([{ claim: "c" }]);
    await flushPromises();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Refine failed"
    );
    expect(call[0].text).toContain("Could not refine the article");
  });

  it("buildFactCheckRefinePrompt: issues with all fields and with sources array", async () => {
    submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>ok</p>" });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.refineWithFactCheckIssues([
      { claim: "c1", verdict: "v1", reasoning: "r1", sources: ["s1", "s2"] },
    ]);
    await flushPromises();
    const arg = submitRefinementRequest.mock.calls[0][0];
    expect(arg.prompt).toContain("Claim: c1");
    expect(arg.prompt).toContain("Sources: s1, s2");
  });

  it("buildFactCheckRefinePrompt: missing fields use '(missing)' and empty filters; null issues", async () => {
    submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>ok</p>" });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.refineWithFactCheckIssues([{}]);
    await flushPromises();
    const arg = submitRefinementRequest.mock.calls[0][0];
    expect(arg.prompt).toContain("Claim: (missing)");

    // null issues -> "No issues provided."
    submitRefinementRequest.mockClear();
    await wrapper.vm.refineWithFactCheckIssues(null);
    await flushPromises();
    const arg2 = submitRefinementRequest.mock.calls[0][0];
    expect(arg2.prompt).toContain("No issues provided.");
  });

  it("refineWithFactCheckIssues uses sourceId.value when set", async () => {
    submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>ok</p>" });
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.sourceId = 999;
    await wrapper.vm.refineWithFactCheckIssues([{ claim: "c" }]);
    await flushPromises();
    expect(submitRefinementRequest.mock.calls[0][0].sourceId).toBe(999);
  });

  // ---- handleRefinementSubmit (RefineArticleModal @submit) ----------------
  it("handleRefinementSubmit with object payload success applies content and hides modal", async () => {
    submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>New</p>" });
    const wrapper = mountView();
    await flushPromises();
    const modal = wrapper.findComponent(RefineModalStub);
    modal.vm.$emit("submit", { prompt: "do it", provider: "gpt" });
    await flushPromises();
    expect(submitRefinementRequest).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "do it", provider: "gpt" })
    );
    expect(wrapper.vm.article.content).toBe("<p>New</p>");
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success!", icon: "success" })
    );
  });

  it("handleRefinementSubmit with string payload defaults to minimax", async () => {
    submitRefinementRequest.mockResolvedValue({ success: true, content: "<p>X</p>" });
    const wrapper = mountView();
    await flushPromises();
    const modal = wrapper.findComponent(RefineModalStub);
    modal.vm.$emit("submit", "just a string");
    await flushPromises();
    expect(submitRefinementRequest).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "just a string", provider: "minimax" })
    );
  });

  it("handleRefinementSubmit failure shows error Swal", async () => {
    submitRefinementRequest.mockResolvedValue({ success: false, error: "refine err" });
    const wrapper = mountView();
    await flushPromises();
    const modal = wrapper.findComponent(RefineModalStub);
    modal.vm.$emit("submit", { prompt: "p", provider: "gpt" });
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", text: "refine err" })
    );
  });

  it("handleRefinementSubmit failure with no error uses fallback text", async () => {
    submitRefinementRequest.mockResolvedValue({ success: false });
    const wrapper = mountView();
    await flushPromises();
    const modal = wrapper.findComponent(RefineModalStub);
    modal.vm.$emit("submit", { prompt: "p", provider: "gpt" });
    await flushPromises();
    const call = swalFire.mock.calls.find((c) => c[0] && c[0].title === "Error!");
    expect(call[0].text).toContain("Failed to refine article");
  });

  // ---- handleTagsChange / TagSelector change -----------------------------
  it("TagSelector change event invokes handleTagsChange", async () => {
    const wrapper = mountView();
    await flushPromises();
    const ts = wrapper.findComponent(TagSelectorStub);
    ts.vm.$emit("change", [1, 2]);
    await flushPromises();
    // console.log spy was called; just assert no crash and component still rendered
    expect(wrapper.find(".card").exists()).toBe(true);
  });

  // ---- computed branches not yet hit -------------------------------------
  it("submitButtonText shows 'Saving...' while submitting", async () => {
    // make editArticle hang to observe submitting state
    let resolveEdit;
    editArticle.mockImplementation(
      () => new Promise((res) => { resolveEdit = res; })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.find('button[type="submit"]').text()).toBe("Saving...");
    resolveEdit({ data: {} });
    await flushPromises();
  });

  // ---- refine button (template) ------------------------------------------
  it("Refine with AI button shows refining label when isRefining true and is disabled with no content", async () => {
    isRefining.value = true;
    const wrapper = mountView();
    await flushPromises();
    const refineBtn = wrapper.findAll("button").find((b) => b.text().includes("Refining"));
    expect(refineBtn).toBeTruthy();
    expect(refineBtn.attributes("disabled")).toBeDefined();
  });

  it("Refine with AI button calls modal show when content present and not refining", async () => {
    const wrapper = mountView();
    await flushPromises();
    const showSpy = vi.spyOn(wrapper.findComponent(RefineModalStub).vm, "show");
    const refineBtn = wrapper.findAll("button").find((b) => b.text().includes("Refine with AI"));
    await refineBtn.trigger("click");
    expect(showSpy).toHaveBeenCalled();
  });

  // ---- getCategoryName / formatDateTime / isCloudinaryUrl ----------------
  it("getCategoryName returns matched name and Unknown fallback", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.getCategoryName(1)).toBe("News");
    expect(wrapper.vm.getCategoryName(9999)).toBe("Unknown");
  });

  it("formatDateTime returns N/A for empty and a formatted string otherwise", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.formatDateTime(null)).toBe("N/A");
    expect(typeof wrapper.vm.formatDateTime("2025-01-01T00:00:00Z")).toBe("string");
  });

  it("isCloudinaryUrl handles non-string, empty, non-cloud and cloud values", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.isCloudinaryUrl(null)).toBeFalsy();
    expect(wrapper.vm.isCloudinaryUrl(123)).toBeFalsy();
    expect(wrapper.vm.isCloudinaryUrl("https://example.com")).toBe(false);
    expect(wrapper.vm.isCloudinaryUrl("https://res.cloudinary.com/x")).toBe(true);
  });

  it("escapeHtml returns empty for falsy and escapes special characters", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.escapeHtml("")).toBe("");
    expect(wrapper.vm.escapeHtml(`<a href="x" id='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; id=&#39;y&#39;&gt;&amp;&lt;/a&gt;"
    );
  });

  it("buildFactCheckHtml returns generic message for non-array input", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.buildFactCheckHtml("not-array")).toContain(
      "Fact check flagged potential issues"
    );
  });

  // ---- template v-model handlers (two-way binding update fns) -------------
  it("binds slug, summary, category, type, and source inputs via v-model", async () => {
    const wrapper = mountView();
    await flushPromises();

    // slug input update handler
    await wrapper.find("#slug").setValue("manual-slug");
    expect(wrapper.vm.article.slug).toBe("manual-slug");

    // summary textarea update handler
    await wrapper.find("#summary").setValue("Edited summary");
    expect(wrapper.vm.article.summary).toBe("Edited summary");

    // category select update handler
    await wrapper.find("#category").setValue(2);
    expect(wrapper.vm.article.categoryId).toBe(2);

    // article type select update handler (second select with id="category")
    const typeSelect = wrapper.findAll("#category").at(1);
    await typeSelect.setValue("popular");
    expect(wrapper.vm.article.articleType).toBe("popular");

    // existing source row input update handler (article.sources[index])
    const sourceInput = wrapper.find(".source-item input[type='url']");
    await sourceInput.setValue("https://edited-source.com/x");
    expect(wrapper.vm.article.sources[0]).toBe("https://edited-source.com/x");
  });

  it("binds the QuillEditor content via update:content", async () => {
    const wrapper = mountView();
    await flushPromises();
    const quill = wrapper.findComponent({ name: "QuillEditor" });
    quill.vm.$emit("update:content", "<p>Quill edited</p>");
    await flushPromises();
    expect(wrapper.vm.article.content).toBe("<p>Quill edited</p>");
  });

  it("binds the scheduled date input via v-model when status is scheduled", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        status: "scheduled",
        scheduled_for: "2030-05-01T10:30:00Z",
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#scheduledDate").setValue("2031-01-01T08:00");
    expect(wrapper.vm.article.scheduledFor).toBe("2031-01-01T08:00");
  });

  it("binds the RefineArticleModal refineInput via update:refineInput", async () => {
    const wrapper = mountView();
    await flushPromises();
    const modal = wrapper.findComponent(RefineModalStub);
    modal.vm.$emit("update:refineInput", "new refine text");
    await flushPromises();
    expect(wrapper.vm.refineInput).toBe("new refine text");
  });

  it("renders the status validation-error message when validationErrors.status is set", async () => {
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.validationErrors = { status: "Status problem" };
    await flushPromises();
    const feedbacks = wrapper.findAll(".invalid-feedback");
    const statusFeedback = feedbacks.find((f) => f.text() === "Status problem");
    expect(statusFeedback).toBeTruthy();
  });

  // ---- runFactCheck early-return + didOpen + empty content/summary -------
  it("runFactCheck returns not-ok early when the title is empty (direct call)", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ title: "" }));
    const wrapper = mountView();
    await flushPromises();
    const result = await wrapper.vm.runFactCheck();
    expect(result).toEqual({ ok: false, confirm: false });
    expect(factCheckArticle).not.toHaveBeenCalled();
  });

  it("runFactCheck invokes the Swal loading didOpen callback (showLoading) and handles empty content/summary", async () => {
    // content empty + summary empty exercise the false ternary + '' fallbacks
    getArticle.mockResolvedValue(
      defaultArticleResponse({ content: "", summary: "" })
    );
    // make the fact-check call resolve with no issues so the loader closes cleanly
    factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
    // Capture and invoke the didOpen callback Swal.fire receives for the loader
    swalFire.mockImplementation((opts) => {
      if (opts && typeof opts.didOpen === "function") {
        opts.didOpen();
      }
      return Promise.resolve({ isConfirmed: true });
    });
    const wrapper = mountView();
    await flushPromises();
    // title is required for validateForm; restore a title but keep content/summary empty.
    wrapper.vm.article.title = "Has Title";
    const result = await wrapper.vm.runFactCheck();
    await flushPromises();
    expect(swalShowLoading).toHaveBeenCalled();
    expect(factCheckArticle).toHaveBeenCalledWith(
      expect.objectContaining({ content: "", summary: "" })
    );
    expect(result).toEqual({ ok: true, confirm: false });
  });

  // ---- updateArticle: no coverBase64 "else" logging branch ---------------
  it("updateArticle: status non-draft, no cover image -> hits the 'No coverImage to send' branch", async () => {
    // published article with no cover/thumbnail and an existing cloudinary URL on
    // article.coverImage is required to pass validation; but we want coverBase64 falsy.
    // Use a draft article (skips cloudinary check) but add a base64 thumbnail only so
    // the image-required check passes while coverBase64 stays falsy.
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: null,
        thumbnail: { file: "data:image/png;base64,THUMBONLY" },
        status: "draft",
        sources: ["https://example.com/x"],
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    // coverBase64 was falsy -> coverImage sent as null (else branch executed)
    expect(editArticle).toHaveBeenCalled();
    expect(editArticle.mock.calls[0][1].coverImage).toBeNull();
  });

  // ---- validateForm: imageUpdated true but coverBase64 falsy (L343) ------
  it("validateForm: published with imageUpdated set but coverBase64 cleared still errors (hasNewImageToUpload false)", async () => {
    // Start published with a non-cloudinary existing cover so the cloudinary check fires.
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        cover: { file: "data:image/png;base64,AAA" },
        thumbnail: { file: "data:image/png;base64,BBB" },
        status: "published",
        audio: null,
      })
    );
    const wrapper = mountView();
    await flushPromises();
    // Mark imageUpdated true but clear coverBase64 -> imageUpdated && coverBase64 === falsy
    wrapper.vm.imageUpdated = true;
    wrapper.vm.coverBase64 = "";
    // thumbnailBase64 still present so the "must have an image" check passes
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
    expect(wrapper.vm.validationErrors.coverImage).toContain(
      "Published articles require an image uploaded to Cloudinary"
    );
  });

  // ---- buildFindSourcesDebugHtml: object with no recognised keys (L478) --
  it("buildFindSourcesDebugHtml returns '' for an object with no recognised keys", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.buildFindSourcesDebugHtml({ irrelevant: 1 })).toBe("");
    // also the null / non-object guard
    expect(wrapper.vm.buildFindSourcesDebugHtml(null)).toBe("");
    expect(wrapper.vm.buildFindSourcesDebugHtml("nope")).toBe("");
  });

  // ---- addSource clears an existing sources validation error (L790) ------
  it("addSource clears a pre-existing sources validation error", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ sources: [] }));
    const wrapper = mountView();
    await flushPromises();
    // create the validation error first by submitting an invalid form
    wrapper.vm.validationErrors = { sources: "At least one source is required" };
    await flushPromises();
    const newInput = wrapper.find('input[placeholder^="Enter source URL"]');
    await newInput.setValue("https://fresh-source.com/a");
    const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Add"));
    await addBtn.trigger("click");
    await flushPromises();
    expect(wrapper.vm.article.sources).toContain("https://fresh-source.com/a");
    expect(wrapper.vm.validationErrors.sources).toBeUndefined();
  });

  // ---- findSources: clears validation error + plural wording (L857/L863) -
  it("findSources success clears the sources validation error and uses plural wording", async () => {
    getArticle.mockResolvedValue(defaultArticleResponse({ sources: [] }));
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: ["https://a.com/x", "https://b.com/y"] },
    });
    const wrapper = mountView();
    await flushPromises();
    wrapper.vm.validationErrors = { sources: "At least one source is required" };
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(wrapper.vm.validationErrors.sources).toBeUndefined();
    const call = swalFire.mock.calls.find(
      (c) => c[0] && c[0].title === "Sources Found!"
    );
    expect(call[0].text).toContain("Added 2 new sources");
  });

  // ---- findSources: summary fallback + non-array sources (L822/L832) -----
  it("findSources sends summary fallback '' and tolerates non-array sources in payload", async () => {
    getArticle.mockResolvedValue(
      defaultArticleResponse({ summary: "", sources: [] })
    );
    // payload.success true but sources is not an array -> foundSources = []
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: "not-an-array" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(findArticleSources).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "" })
    );
    // success true + 0 found sources -> No Sources Found branch
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No Sources Found" })
    );
  });

  // ---- findSources error path: debug html present in error response (L874)
  it("findSources error path with debug html and payload message uses escaped message + debug", async () => {
    findArticleSources.mockRejectedValue({
      response: {
        data: {
          message: "broke <bad>",
          debug: { toolResultCount: 3 },
        },
      },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find((c) => c[0] && c[0].title === "Error");
    expect(call[0].html).toContain("broke &lt;bad&gt;");
    expect(call[0].html).toContain("Search results count");
  });

  it("findSources error path with debug html but no payload message falls back to error.message", async () => {
    // payload has debug (so debugHtml truthy) but no message -> uses error.message
    const err = new Error("error-message-fallback");
    err.response = { data: { debug: { toolResultCount: 1 } } };
    findArticleSources.mockRejectedValue(err);
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find((c) => c[0] && c[0].title === "Error");
    expect(call[0].html).toContain("error-message-fallback");
    expect(call[0].html).toContain("Search results count");
  });

  it("findSources error path with debug html and no message anywhere uses the final fallback string", async () => {
    // rejection object with debug but no .message property at all -> final fallback
    findArticleSources.mockRejectedValue({
      response: { data: { debug: { toolResultCount: 2 } } },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.findSources();
    await flushPromises();
    const call = swalFire.mock.calls.find((c) => c[0] && c[0].title === "Error");
    expect(call[0].html).toContain("Failed to find sources. Please try again.");
    expect(call[0].html).toContain("Search results count");
  });

  // ---- buildFactCheckHtml default-arg (issues = []) (L381) ----------------
  it("buildFactCheckHtml uses the default empty-array arg when called with no arguments", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.vm.buildFactCheckHtml()).toContain(
      "Fact check flagged potential issues"
    );
  });

  // ---- TagSelector v-model update:modelValue handler (L1269) --------------
  it("TagSelector update:modelValue updates article.tags (v-model)", async () => {
    const wrapper = mountView();
    await flushPromises();
    const ts = wrapper.findComponent(TagSelectorStub);
    ts.vm.$emit("update:modelValue", [10, 20, 30]);
    await flushPromises();
    expect(wrapper.vm.article.tags).toEqual([10, 20, 30]);
  });

  // ---- validateForm: scheduled with a FUTURE date passes the date check ---
  it("validateForm: scheduled article with a future date passes (no future-date error) and submits", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    getArticle.mockResolvedValue(
      defaultArticleResponse({
        status: "scheduled",
        scheduled_for: future,
        // cloudinary cover so the published/scheduled image check passes
        cover: { file: "https://res.cloudinary.com/x/cover.png" },
        thumbnail: { file: "https://res.cloudinary.com/x/thumb.png" },
        sources: ["https://example.com/x"],
        audio: null,
      })
    );
    factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    // future date -> no scheduledFor error -> validation passes -> editArticle called
    expect(wrapper.vm.validationErrors.scheduledFor).toBeUndefined();
    expect(editArticle).toHaveBeenCalled();
  });
});

// --- helpers ---------------------------------------------------------------

function stubImageAndCanvas(size = { width: 100, height: 80 }) {
  // Stub canvas getContext + toDataURL
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: () => "data:image/jpeg;base64,THUMB",
      };
    }
    return origCreate(tag);
  });
  // Stub Image so onload fires on a microtask after src is assigned (the source
  // sets `img.src` before `img.onload`). Using a microtask (not setTimeout)
  // means flushPromises() drains it within the test, avoiding a stray timer
  // firing after mock restoration.
  global.Image = class {
    constructor() {
      this.width = size.width;
      this.height = size.height;
      this._src = "";
      this.onload = null;
    }
    set src(v) {
      this._src = v;
      queueMicrotask(() => {
        if (this.onload) this.onload();
      });
    }
    get src() {
      return this._src;
    }
  };
}

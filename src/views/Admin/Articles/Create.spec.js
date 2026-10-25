import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- ArticlesService boundary ----------------------------------------------
vi.mock("@/features/articles/ArticlesService", () => ({
  editArticle: vi.fn(),
  generateArticleThumbnail: vi.fn(),
  getPrompts: vi.fn(),
  updatePrompt: vi.fn(),
  findArticleSources: vi.fn(),
  factCheckArticle: vi.fn(),
}));

vi.mock("@/features/categories/CategoriesService", () => ({
  getCategories: vi.fn(),
}));

vi.mock("@/features/tags/TagsService", () => ({
  getTags: vi.fn(),
}));

// --- sweetalert2 ------------------------------------------------------------
const swalFire = vi.fn();
const swalClose = vi.fn();
const swalShowLoading = vi.fn();
vi.mock("sweetalert2", () => ({
  default: {
    fire: (...args) => swalFire(...args),
    close: (...args) => swalClose(...args),
    showLoading: (...args) => swalShowLoading(...args),
  },
}));

// --- useRefinementHistory composable ---------------------------------------
const refinementHistory = ref([]);
const isRefining = ref(false);
const loadRefinementHistory = vi.fn();
const submitRefinement = vi.fn();
const clearHistory = vi.fn();
vi.mock("@/composables/useRefinementHistory", () => ({
  useRefinementHistory: () => ({
    refinementHistory,
    isRefining,
    loadRefinementHistory,
    submitRefinement,
    clearHistory,
  }),
}));

// --- QuillEditor (heavy quill dep) + its CSS side-effect import -------------
vi.mock("@vueup/vue-quill", () => ({
  QuillEditor: {
    name: "QuillEditor",
    props: ["content", "contentType", "theme", "toolbar", "styles", "readonly", "enable"],
    emits: ["update:content"],
    template: `<div class="quill-stub"></div>`,
  },
}));
vi.mock("@vueup/vue-quill/dist/vue-quill.snow.css", () => ({}));

// --- @vueuse/router useRouteQuery -> controllable ref ----------------------
const articleIdRef = ref(undefined);
vi.mock("@vueuse/router", () => ({
  useRouteQuery: () => articleIdRef,
}));

// --- vue-router stubs -------------------------------------------------------
const push = vi.fn();
let routeMock;
vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => routeMock,
}));

import {
  editArticle,
  generateArticleThumbnail,
  getPrompts,
  updatePrompt,
  findArticleSources,
  factCheckArticle,
} from "@/features/articles/ArticlesService";
import { getCategories } from "@/features/categories/CategoriesService";
import { getTags } from "@/features/tags/TagsService";

import Create from "@/views/Admin/Articles/Create.vue";

// Lightweight stubs for child modal/partial components (expose ref methods).
const RefineArticleModalStub = {
  name: "RefineArticleModal",
  props: ["refineInput", "isLoading", "refinementHistory"],
  emits: ["submit", "update:refineInput"],
  methods: {
    show: vi.fn(),
    hide: vi.fn(),
  },
  template: `<div class="refine-modal-stub"></div>`,
};

const PromptsManagementModalStub = {
  name: "PromptsManagementModal",
  props: ["promptsList", "isLoadingPrompts", "isSubmittingPrompt"],
  emits: ["save-prompt", "fetch-prompts"],
  template: `<div class="prompts-modal-stub"></div>`,
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
  template: `<div class="tag-selector-stub"></div>`,
};

const CATEGORIES = [
  { id: 1, name: "News" },
  { id: 2, name: "Sport" },
];
const TAGS = [{ id: 10, name: "tag-a" }];

function mountView() {
  return mount(Create, {
    global: {
      stubs: {
        RefineArticleModal: RefineArticleModalStub,
        PromptsManagementModal: PromptsManagementModalStub,
        TagSelector: TagSelectorStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
}

// Mount and let onMounted's Promise.all settle.
async function mountReady() {
  const wrapper = mountView();
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMock = { query: {}, params: {} };
  articleIdRef.value = undefined;
  refinementHistory.value = [];
  isRefining.value = false;

  // Default happy-path service responses.
  getCategories.mockResolvedValue({ data: CATEGORIES });
  getTags.mockResolvedValue({ data: TAGS });
  getPrompts.mockResolvedValue({ status: 200, data: [] });
  generateArticleThumbnail.mockResolvedValue({ data: "BASE64DATA" });
  editArticle.mockResolvedValue({ data: {} });
  updatePrompt.mockResolvedValue({ data: {} });
  findArticleSources.mockResolvedValue({ data: { success: true, sources: [] } });
  factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
  submitRefinement.mockResolvedValue({ success: false });

  // Swal default resolves to a confirmed decision and invokes didOpen (loader).
  swalFire.mockImplementation((opts) => {
    if (opts && typeof opts.didOpen === "function") opts.didOpen();
    return Promise.resolve({ isConfirmed: true, isDenied: false });
  });

  vi.stubGlobal("confirm", vi.fn(() => true));

  // localStorage spies
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
  vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);

  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// The Reset button is the only `.btn-outline-secondary` with text "Reset".
function resetButton(wrapper) {
  return wrapper
    .findAll(".btn-outline-secondary")
    .find((b) => b.text().trim() === "Reset");
}

// Helper to fill in a valid form so validateForm passes.
async function fillValidForm(wrapper) {
  wrapper.vm.article.title = "My Title";
  wrapper.vm.article.slug = "my-title";
  wrapper.vm.article.summary = "Summary";
  wrapper.vm.article.content = "<p>Content</p>";
  wrapper.vm.article.sources = ["https://example.com"];
  wrapper.vm.coverBase64 = "data:image/png;base64,AAA";
  wrapper.vm.thumbnailBase64 = "data:image/jpeg;base64,BBB";
  await wrapper.vm.$nextTick();
}

describe("Admin/Articles/Create.vue", () => {
  // ---------------------------------------------------------------- mount/render
  it("renders the create form and loads categories/tags on mount", async () => {
    const wrapper = await mountReady();

    expect(wrapper.find("h3.mb-0").text()).toBe("Create New Article");
    expect(getCategories).toHaveBeenCalled();
    expect(getTags).toHaveBeenCalled();
    // first category id assigned
    expect(wrapper.vm.article.categoryId).toBe(1);
    // category options rendered (v-for non-empty)
    const options = wrapper.findAll("#category option");
    expect(options.length).toBe(3); // placeholder + 2
    // submit button default text (status published)
    expect(wrapper.find('button[type="submit"]').text()).toBe("Publish Now");
  });

  it("handles an empty categories list on mount (categoryId stays empty)", async () => {
    getCategories.mockResolvedValue({ data: [] });
    const wrapper = await mountReady();
    expect(wrapper.vm.article.categoryId).toBe("");
    expect(wrapper.findAll("#category option").length).toBe(1); // only placeholder
  });

  it("logs an error when initial data fetch rejects (onMounted catch)", async () => {
    getCategories.mockRejectedValue(new Error("boom"));
    const wrapper = await mountReady();
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching initial data:",
      expect.any(Error)
    );
    expect(wrapper.exists()).toBe(true);
  });

  it("loads refinement history when an articleId is present", async () => {
    articleIdRef.value = "art-1";
    await mountReady();
    expect(loadRefinementHistory).toHaveBeenCalledWith("art-1");
  });

  // ---------------------------------------------------------------- generateSlug
  it("generates a slug from the title on input, and no-ops on empty title", async () => {
    const wrapper = await mountReady();
    const titleInput = wrapper.find("#title");

    await titleInput.setValue("Hello, World! Foo  Bar--Baz");
    expect(wrapper.vm.article.slug).toBe("hello-world-foo-bar-baz");

    // empty title -> early return, slug unchanged
    wrapper.vm.article.title = "";
    await wrapper.vm.$nextTick();
    await titleInput.trigger("input");
    expect(wrapper.vm.article.slug).toBe("hello-world-foo-bar-baz");
  });

  // ---------------------------------------------------------------- submitButtonText
  it("computes submit button text for each status and the submitting state", async () => {
    const wrapper = await mountReady();

    expect(wrapper.vm.submitButtonText).toBe("Publish Now");

    wrapper.vm.article.status = "scheduled";
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.submitButtonText).toBe("Schedule Publication");

    wrapper.vm.article.status = "draft";
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.submitButtonText).toBe("Save Article");

    wrapper.vm.isSubmitting = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.submitButtonText).toBe("Saving...");
  });

  // ---------------------------------------------------------------- handleStatusChange
  it("sets a default scheduledFor when switching to scheduled without a date", async () => {
    const wrapper = await mountReady();
    const statusSelect = wrapper.find("#status");

    await statusSelect.setValue("scheduled");
    expect(wrapper.vm.article.scheduledFor).toBeTruthy();
    // scheduled date input now visible
    expect(wrapper.find("#scheduledDate").exists()).toBe(true);

    // Switching again with a date present -> no overwrite (else branch)
    const existing = wrapper.vm.article.scheduledFor;
    wrapper.vm.handleStatusChange();
    expect(wrapper.vm.article.scheduledFor).toBe(existing);
  });

  it("does not change scheduledFor when status stays published", async () => {
    const wrapper = await mountReady();
    wrapper.vm.handleStatusChange();
    expect(wrapper.vm.article.scheduledFor).toBeNull();
  });

  // ---------------------------------------------------------------- fetchPrompts
  it("fetchPrompts success populates promptsList", async () => {
    getPrompts.mockResolvedValue({ data: [{ id: 1 }] });
    const wrapper = await mountReady();
    wrapper.findComponent(PromptsManagementModalStub).vm.$emit("fetch-prompts");
    await flushPromises();
    expect(wrapper.vm.promptsList).toEqual([{ id: 1 }]);
    expect(wrapper.vm.isLoadingPrompts).toBe(false);
  });

  it("fetchPrompts failure shows an error alert", async () => {
    const wrapper = await mountReady();
    getPrompts.mockRejectedValueOnce(new Error("nope"));
    wrapper.findComponent(PromptsManagementModalStub).vm.$emit("fetch-prompts");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
    expect(wrapper.vm.isLoadingPrompts).toBe(false);
  });

  // ---------------------------------------------------------------- savePrompt
  it("savePrompt success updates and re-fetches prompts", async () => {
    const wrapper = await mountReady();
    const prompt = { id: 5, content: "x" };
    wrapper.findComponent(PromptsManagementModalStub).vm.$emit("save-prompt", prompt);
    await flushPromises();
    expect(updatePrompt).toHaveBeenCalledWith(5, prompt);
    expect(getPrompts).toHaveBeenCalled();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success!", icon: "success" })
    );
  });

  it("savePrompt failure shows an error alert", async () => {
    const wrapper = await mountReady();
    updatePrompt.mockRejectedValueOnce(new Error("fail"));
    wrapper
      .findComponent(PromptsManagementModalStub)
      .vm.$emit("save-prompt", { id: 6 });
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
    expect(wrapper.vm.isSubmittingPrompt).toBe(false);
  });

  // ---------------------------------------------------------------- handleRefinementSubmit
  it("handleRefinementSubmit applies content and hides modal on success", async () => {
    submitRefinement.mockResolvedValueOnce({ success: true, content: "<p>new</p>" });
    const wrapper = await mountReady();
    const modal = wrapper.findComponent(RefineArticleModalStub);
    modal.vm.$emit("submit", "make it better");
    await flushPromises();
    expect(submitRefinement).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "make it better" })
    );
    expect(wrapper.vm.article.content).toBe("<p>new</p>");
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success!", icon: "success" })
    );
  });

  it("handleRefinementSubmit does nothing visible on failure", async () => {
    submitRefinement.mockResolvedValueOnce({ success: false });
    const wrapper = await mountReady();
    wrapper.findComponent(RefineArticleModalStub).vm.$emit("submit", "x");
    await flushPromises();
    expect(wrapper.vm.article.content).toBe("");
  });

  it("shows the Refine button only when content is present", async () => {
    const wrapper = await mountReady();
    expect(wrapper.find(".btn-outline-success").exists()).toBe(false);
    wrapper.vm.article.content = "<p>hi</p>";
    await wrapper.vm.$nextTick();
    const refineBtn = wrapper.find(".btn-outline-success");
    expect(refineBtn.exists()).toBe(true);
    await refineBtn.trigger("click");
  });

  // ---------------------------------------------------------------- generateThumbnail
  it("generateThumbnail validates title+type first", async () => {
    const wrapper = await mountReady();
    wrapper.vm.article.title = "";
    await wrapper.vm.generateThumbnail();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Please add a title and select an article type first" })
    );
    expect(generateArticleThumbnail).not.toHaveBeenCalled();
  });

  it("generateThumbnail success: fetches prompts, finds thumbnail prompt, sets base64 + localStorage", async () => {
    stubImage(50, 50);
    getPrompts.mockResolvedValue({
      status: 200,
      data: [{ active: true, type: "thumbnail", content: "T {{topic}} S {{summary}}" }],
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.summary = "Summ";
    wrapper.vm.article.articleType = "featured";
    await wrapper.vm.$nextTick();

    await wrapper.vm.generateThumbnail();
    await flushPromises();

    expect(generateArticleThumbnail).toHaveBeenCalledWith(
      "T Topic S Summ",
      "featured",
      "gpt"
    );
    expect(wrapper.vm.coverBase64).toBe("data:image/png;base64,BASE64DATA");
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "article.coverBase64",
      "data:image/png;base64,BASE64DATA"
    );
  });

  it("generateThumbnail uses the default prompt when no active thumbnail prompt found", async () => {
    stubImage(50, 50);
    getPrompts.mockResolvedValue({ status: 200, data: [{ active: false, type: "other" }] });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "top";
    await wrapper.vm.$nextTick();

    await wrapper.vm.generateThumbnail();
    await flushPromises();

    expect(generateArticleThumbnail).toHaveBeenCalledWith(
      "Generate image based on the title: Topic and summary: ",
      "top",
      "gpt"
    );
  });

  it("generateThumbnail reuses prompts.value when already loaded (skips getPrompts)", async () => {
    stubImage(50, 50);
    getPrompts.mockResolvedValue({
      status: 200,
      data: [{ active: true, type: "thumbnail", content: "X {{topic}}" }],
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "featured";
    await wrapper.vm.$nextTick();

    await wrapper.vm.generateThumbnail();
    await flushPromises();
    const callsAfterFirst = getPrompts.mock.calls.length;

    await wrapper.vm.generateThumbnail();
    await flushPromises();
    // prompts.value cached -> no further getPrompts call
    expect(getPrompts.mock.calls.length).toBe(callsAfterFirst);
  });

  it("generateThumbnail throws when getPrompts returns a bad response", async () => {
    getPrompts.mockResolvedValue({ status: 500, data: null });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "featured";
    await wrapper.vm.$nextTick();

    await wrapper.vm.generateThumbnail();
    await flushPromises();

    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Failed to generate thumbnail") })
    );
    expect(wrapper.vm.isGeneratingThumbnail).toBe(false);
  });

  it("generateThumbnail catch path on thumbnail service rejection", async () => {
    generateArticleThumbnail.mockRejectedValueOnce(new Error("img fail"));
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "featured";
    await wrapper.vm.$nextTick();

    await wrapper.vm.generateThumbnail();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Failed to generate thumbnail") })
    );
  });

  it("AI Thumbnail button enabled state and click triggers generation", async () => {
    stubImage(50, 50);
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "featured";
    await wrapper.vm.$nextTick();
    const btn = wrapper.find(".input-group .btn-outline-secondary");
    expect(btn.attributes("disabled")).toBeUndefined();
    await btn.trigger("click");
    await flushPromises();
    expect(generateArticleThumbnail).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- image handling
  it("handleImage reads a selected file and generates a thumbnail (landscape)", async () => {
    const wrapper = await mountReady();
    // Stub FileReader
    const onloadHolder = {};
    class FR {
      readAsDataURL() {
        this.result = "data:image/png;base64,IMG";
        Promise.resolve().then(() => this.onload());
      }
      set onload(fn) {
        onloadHolder.fn = fn;
      }
      get onload() {
        return onloadHolder.fn;
      }
    }
    vi.stubGlobal("FileReader", FR);
    stubImage(400, 100); // landscape, width > maxWidth

    await wrapper.vm.handleImage({ target: { files: [new Blob(["x"])] } });
    await flushPromises();
    expect(wrapper.vm.coverBase64).toBe("data:image/png;base64,IMG");
    expect(wrapper.vm.thumbnailBase64).toContain("data:image/jpeg");
  });

  it("handleImage with a landscape image under the max width (no-resize else branch)", async () => {
    const wrapper = await mountReady();
    const onloadHolder = {};
    class FR {
      readAsDataURL() {
        this.result = "data:image/png;base64,IMG_LS";
        Promise.resolve().then(() => this.onload());
      }
      set onload(fn) {
        onloadHolder.fn = fn;
      }
      get onload() {
        return onloadHolder.fn;
      }
    }
    vi.stubGlobal("FileReader", FR);
    stubImage(150, 100); // landscape (width > height) but width <= maxWidth -> inner else

    await wrapper.vm.handleImage({ target: { files: [new Blob(["x"])] } });
    await flushPromises();
    expect(wrapper.vm.coverBase64).toBe("data:image/png;base64,IMG_LS");
    expect(wrapper.vm.thumbnailBase64).toContain("data:image/jpeg");
  });

  it("handleImage generates a thumbnail (portrait branch)", async () => {
    const wrapper = await mountReady();
    const onloadHolder = {};
    class FR {
      readAsDataURL() {
        this.result = "data:image/png;base64,IMG2";
        Promise.resolve().then(() => this.onload());
      }
      set onload(fn) {
        onloadHolder.fn = fn;
      }
      get onload() {
        return onloadHolder.fn;
      }
    }
    vi.stubGlobal("FileReader", FR);
    stubImage(100, 400); // portrait, height > maxHeight

    await wrapper.vm.handleImage({ target: { files: [new Blob(["x"])] } });
    await flushPromises();
    expect(wrapper.vm.thumbnailBase64).toContain("data:image/jpeg");
  });

  it("handleImage with a small image (no resize branch)", async () => {
    const wrapper = await mountReady();
    const onloadHolder = {};
    class FR {
      readAsDataURL() {
        this.result = "data:image/png;base64,IMG3";
        Promise.resolve().then(() => this.onload());
      }
      set onload(fn) {
        onloadHolder.fn = fn;
      }
      get onload() {
        return onloadHolder.fn;
      }
    }
    vi.stubGlobal("FileReader", FR);
    stubImage(50, 50); // small, neither branch resizes

    await wrapper.vm.handleImage({ target: { files: [new Blob(["x"])] } });
    await flushPromises();
    expect(wrapper.vm.thumbnailBase64).toContain("data:image/jpeg");
  });

  it("handleImage no-ops when no file selected", async () => {
    const wrapper = await mountReady();
    await wrapper.vm.handleImage({ target: { files: [] } });
    expect(wrapper.vm.coverBase64).toBe("");
  });

  it("removeImage clears cover and thumbnail and shows the upload group", async () => {
    const wrapper = await mountReady();
    wrapper.vm.coverBase64 = "data:image/png;base64,X";
    await wrapper.vm.$nextTick();
    expect(wrapper.find('img[alt="Preview"]').exists()).toBe(true);
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");
    expect(wrapper.vm.coverBase64).toBeNull();
    expect(wrapper.vm.thumbnailBase64).toBeNull();
    expect(wrapper.find(".input-group input[type='file']").exists()).toBe(true);
  });

  // ---------------------------------------------------------------- validateForm
  it("validateForm reports all errors when the form is empty", async () => {
    const wrapper = await mountReady();
    wrapper.vm.article.status = "scheduled";
    wrapper.vm.article.scheduledFor = "";
    wrapper.vm.coverBase64 = "";
    wrapper.vm.thumbnailBase64 = "";
    wrapper.vm.article.sources = [];
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.validateForm()).toBe(false);
    const errs = wrapper.vm.validationErrors;
    expect(errs.title).toBeTruthy();
    expect(errs.slug).toBeTruthy();
    expect(errs.summary).toBeTruthy();
    expect(errs.content).toBeTruthy();
    expect(errs.scheduledFor).toBe("Please select a publication date");
    expect(errs.coverImage).toBeTruthy();
    expect(errs.sources).toBeTruthy();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".invalid-feedback").exists()).toBe(true);
  });

  it("validateForm flags a past scheduled date", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.article.status = "scheduled";
    wrapper.vm.article.scheduledFor = "2000-01-01T00:00";
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.validateForm()).toBe(false);
    expect(wrapper.vm.validationErrors.scheduledFor).toBe(
      "Scheduled date must be in the future"
    );
  });

  it("validateForm passes for a complete valid form (with future scheduled date)", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    wrapper.vm.article.status = "scheduled";
    wrapper.vm.article.scheduledFor = future;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.validateForm()).toBe(true);
    expect(Object.keys(wrapper.vm.validationErrors)).toHaveLength(0);
  });

  it("validateForm passes with a null sources array (handles falsy sources)", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.article.sources = null;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.validateForm()).toBe(false);
    expect(wrapper.vm.validationErrors.sources).toBeTruthy();
  });

  // ---------------------------------------------------------------- sources
  it("addSource validates empty, invalid, duplicate and success paths", async () => {
    const wrapper = await mountReady();

    // empty -> early return
    wrapper.vm.newSourceUrl = "   ";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toHaveLength(0);

    // invalid URL
    wrapper.vm.newSourceUrl = "not a url";
    wrapper.vm.addSource();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid URL" })
    );
    expect(wrapper.vm.article.sources).toHaveLength(0);

    // valid -> added, with existing validation error cleared
    wrapper.vm.validationErrors = { sources: "required" };
    wrapper.vm.newSourceUrl = "https://example.com/a";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toEqual(["https://example.com/a"]);
    expect(wrapper.vm.validationErrors.sources).toBeUndefined();
    expect(wrapper.vm.newSourceUrl).toBe("");

    // duplicate
    wrapper.vm.newSourceUrl = "https://example.com/a";
    wrapper.vm.addSource();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Duplicate Source" })
    );
    expect(wrapper.vm.article.sources).toHaveLength(1);
  });

  it("addSource succeeds without a pre-existing validation error", async () => {
    const wrapper = await mountReady();
    wrapper.vm.newSourceUrl = "https://example.com/b";
    wrapper.vm.addSource();
    expect(wrapper.vm.article.sources).toEqual(["https://example.com/b"]);
  });

  it("addSource is triggered by the Add button and Enter key", async () => {
    const wrapper = await mountReady();
    const urlInput = wrapper.find('input[placeholder^="Enter source URL"]');
    await urlInput.setValue("https://example.com/c");
    await urlInput.trigger("keyup.enter");
    expect(wrapper.vm.article.sources).toContain("https://example.com/c");

    await urlInput.setValue("https://example.com/d");
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-outline-primary").trigger("click");
    expect(wrapper.vm.article.sources).toContain("https://example.com/d");
  });

  it("renders the sources list and removes a source via the trash button", async () => {
    const wrapper = await mountReady();
    wrapper.vm.article.sources = ["https://a.com", "https://b.com"];
    await wrapper.vm.$nextTick();
    const items = wrapper.findAll(".source-item");
    expect(items.length).toBe(2);
    await wrapper.find(".source-item .btn-outline-danger").trigger("click");
    expect(wrapper.vm.article.sources).toEqual(["https://b.com"]);
  });

  // ---------------------------------------------------------------- findSources
  it("findSources warns when no title and not silent", async () => {
    const wrapper = await mountReady();
    wrapper.vm.article.title = "";
    await wrapper.vm.findSources();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Title Required" })
    );
    expect(findArticleSources).not.toHaveBeenCalled();
  });

  it("findSources returns silently with no title in silent mode", async () => {
    const wrapper = await mountReady();
    wrapper.vm.article.title = "";
    await wrapper.vm.findSources({ silent: true });
    expect(swalFire).not.toHaveBeenCalled();
  });

  it("findSources success adds new non-duplicate sources and clears the error", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: ["https://x.com", "https://dup.com"] },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    wrapper.vm.article.sources = ["https://dup.com"];
    wrapper.vm.validationErrors = { sources: "required" };
    await wrapper.vm.$nextTick();

    await wrapper.vm.findSources();
    await flushPromises();

    expect(wrapper.vm.article.sources).toContain("https://x.com");
    expect(wrapper.vm.validationErrors.sources).toBeUndefined();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sources Found!" })
    );
  });

  it("findSources success in silent mode does not alert", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: ["https://y.com"] },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    swalFire.mockClear();
    await wrapper.vm.findSources({ silent: true });
    await flushPromises();
    expect(wrapper.vm.article.sources).toContain("https://y.com");
    expect(swalFire).not.toHaveBeenCalled();
  });

  it("findSources success but with a single added source pluralizes correctly", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: ["https://only.com"] },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    wrapper.vm.article.sources = [];
    delete wrapper.vm.validationErrors.sources;
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sources Found!" })
    );
  });

  it("findSources reports no sources found with debug html", async () => {
    findArticleSources.mockResolvedValue({
      data: {
        success: false,
        message: "none",
        debug: {
          parseError: "bad",
          toolQueries: ["q1"],
          toolTags: ["t1"],
          toolResultCount: 3,
          toolResultUrls: ["https://u.com"],
          filteredOut: [{ source: "s", reason: "r" }],
          extractedJson: "{}",
          rawResponseSnippet: "raw",
        },
      },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No Sources Found" })
    );
  });

  it("findSources reports no sources found without debug (plain text)", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: false, message: "none", debug: null },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No Sources Found", icon: "info" })
    );
  });

  it("findSources no-sources is silent in silent mode", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: false, message: "none", debug: null },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    swalFire.mockClear();
    await wrapper.vm.findSources({ silent: true });
    await flushPromises();
    expect(swalFire).not.toHaveBeenCalled();
  });

  it("findSources throws on an unexpected response shape", async () => {
    findArticleSources.mockResolvedValue({ data: { not: "valid" } });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error" })
    );
  });

  it("findSources catch path with debug html in the error response", async () => {
    findArticleSources.mockRejectedValueOnce({
      response: { data: { message: "srv err", debug: { parseError: "x" } } },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", icon: "error" })
    );
  });

  it("findSources catch path without debug uses fallback message", async () => {
    findArticleSources.mockRejectedValueOnce(new Error("plain"));
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error" })
    );
  });

  it("findSources catch in silent mode does not alert", async () => {
    findArticleSources.mockRejectedValueOnce(new Error("plain"));
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    swalFire.mockClear();
    await wrapper.vm.findSources({ silent: true });
    await flushPromises();
    expect(swalFire).not.toHaveBeenCalled();
  });

  it("Find Sources button triggers findSources", async () => {
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-outline-info").trigger("click");
    await flushPromises();
    expect(findArticleSources).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- runFactCheck / saveArticle
  it("saveArticle returns early when the form is invalid", async () => {
    const wrapper = await mountReady();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("saveArticle success path with skipFactCheck shortcut", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editArticle).toHaveBeenCalled();
    expect(swalFire).toHaveBeenCalledWith("Success!", "Article created successfully!", "success");
    expect(push).toHaveBeenCalledWith("/admin/articles");
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith("newArticleData");
  });

  it("runFactCheck returns not-ok when there is no title", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.article.title = ""; // validateForm would fail; call runFactCheck directly
    const res = await wrapper.vm.runFactCheck();
    expect(res).toEqual({ ok: false, confirm: false });
  });

  it("saveArticle runs a passing fact check (no issues) then submits", async () => {
    factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(factCheckArticle).toHaveBeenCalled();
    expect(editArticle).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("fact check with issues: user chooses Save anyway (confirmed)", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ claim: "c", verdict: "v", reasoning: "r" }] },
    });
    swalFire.mockResolvedValue({ isConfirmed: true, isDenied: false });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ confirmFactCheck: true })
    );
  });

  it("fact check with issues (empty issues array uses fallback html) cancelled", async () => {
    factCheckArticle.mockResolvedValue({ data: { hasIssues: true, issues: [] } });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: false });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("fact check issues: user chooses Refine with fixes (denied) -> refine succeeds", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ claim: "c", sources: ["s1"] }] },
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: true });
    submitRefinement.mockResolvedValueOnce({ success: true, content: "<p>fixed</p>" });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.sourceId = "src-1"; // ensures refinementSourceId present
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(submitRefinement).toHaveBeenCalled();
    expect(wrapper.vm.article.content).toBe("<p>fixed</p>");
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("fact check refine: missing source article shows 'Refine unavailable'", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ claim: "c" }] },
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: true });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    // no sourceId, no articleId
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Refine unavailable" })
    );
  });

  it("fact check refine fails -> shows 'Refine failed'", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ claim: "c" }] },
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: true });
    submitRefinement.mockResolvedValueOnce({ success: false, error: "no go" });
    articleIdRef.value = "art-9";
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Refine failed" })
    );
  });

  it("fact check refine fails with no error message uses generic fallback", async () => {
    factCheckArticle.mockResolvedValue({
      data: { hasIssues: true, issues: [{ verdict: "v", reasoning: "r" }] },
    });
    swalFire.mockResolvedValue({ isConfirmed: false, isDenied: true });
    submitRefinement.mockResolvedValueOnce({ success: false });
    articleIdRef.value = "art-10";
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Refine failed" })
    );
  });

  it("runFactCheck catch path with structured factCheck error", async () => {
    factCheckArticle.mockRejectedValueOnce({
      response: { data: { factCheck: { issues: [{ claim: "c" }] }, message: "fc msg" } },
    });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fact check failed" })
    );
    expect(editArticle).not.toHaveBeenCalled();
  });

  it("runFactCheck catch path with a plain error message", async () => {
    factCheckArticle.mockRejectedValueOnce(new Error("plain fc err"));
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fact check failed" })
    );
  });

  it("runFactCheck catch path with no message falls back to default text", async () => {
    factCheckArticle.mockRejectedValueOnce({ response: { data: {} } });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fact check failed" })
    );
  });

  // ------------------------------------------------------- submitArticle scheduled
  it("submitArticle sends scheduledFor when status is scheduled", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    wrapper.vm.article.status = "scheduled";
    wrapper.vm.article.scheduledFor = future;
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ scheduledFor: future })
    );
  });

  it("submitArticle defaults scheduledFor to now when scheduled but date is empty", async () => {
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    // call submitArticle directly to exercise the `|| new Date().toISOString()` branch
    wrapper.vm.article.status = "scheduled";
    wrapper.vm.article.scheduledFor = "";
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitArticle(true);
    expect(editArticle).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ scheduledFor: expect.any(String) })
    );
  });

  it("submitArticle falls back to empty strings when images are null", async () => {
    const wrapper = await mountReady();
    wrapper.vm.coverBase64 = null;
    wrapper.vm.thumbnailBase64 = null;
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitArticle(false);
    expect(editArticle).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ coverImage: "", thumbnailImage: "" })
    );
  });

  // ------------------------------------------------------- saveArticle error paths
  it("saveArticle handles a 409 fact-check conflict, then save-anyway succeeds", async () => {
    editArticle
      .mockRejectedValueOnce({
        response: { status: 409, data: { factCheck: { issues: [{ claim: "c" }] } } },
      })
      .mockResolvedValueOnce({ data: {} });
    swalFire.mockResolvedValue({ isConfirmed: true });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editArticle).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("saveArticle 409 conflict but user cancels save-anyway", async () => {
    editArticle.mockRejectedValueOnce({
      response: { status: 409, data: { factCheck: { issues: [{ claim: "c" }] } } },
    });
    swalFire.mockResolvedValue({ isConfirmed: false });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    await wrapper.vm.$nextTick();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editArticle).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("saveArticle maps server validation errors (non-409)", async () => {
    editArticle.mockRejectedValueOnce({
      response: { status: 422, data: { errors: { title: "bad title" } } },
    });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    await wrapper.vm.$nextTick();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.vm.validationErrors).toEqual({ title: "bad title" });
  });

  it("saveArticle shows a generic error when the failure has no response", async () => {
    editArticle.mockRejectedValueOnce(new Error("network"));
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    await wrapper.vm.$nextTick();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Failed to save article. Please try again." })
    );
  });

  it("saveArticle generic error when response exists but no errors object", async () => {
    editArticle.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    const wrapper = await mountReady();
    await fillValidForm(wrapper);
    wrapper.vm.skipFactCheck = true;
    await wrapper.vm.$nextTick();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Failed to save article. Please try again." })
    );
  });

  // ---------------------------------------------------------------- resetForm
  it("resetForm clears the article when confirmed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Stuff";
    wrapper.vm.article.authorId = "auth-1";
    await wrapper.vm.$nextTick();
    await resetButton(wrapper).trigger("click");
    expect(wrapper.vm.article.title).toBe("");
    expect(wrapper.vm.article.authorId).toBe("auth-1"); // preserved
    expect(clearHistory).toHaveBeenCalled();
  });

  it("resetForm does nothing when not confirmed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Keep";
    await wrapper.vm.$nextTick();
    await resetButton(wrapper).trigger("click");
    expect(wrapper.vm.article.title).toBe("Keep");
    expect(clearHistory).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- v-model basics
  it("binds notify and skipFactCheck checkboxes", async () => {
    const wrapper = await mountReady();
    await wrapper.find("#notify").setValue(true);
    await wrapper.find("#skipFactCheck").setValue(true);
    expect(wrapper.vm.article.notify).toBe(true);
    expect(wrapper.vm.skipFactCheck).toBe(true);
  });

  it("emits change from the TagSelector (handleTagsChange handler)", async () => {
    const wrapper = await mountReady();
    wrapper.findComponent(TagSelectorStub).vm.$emit("change", [1, 2]);
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  // ---------------------------------------------------------------- validationErrors UI
  it("renders inline validation messages for each field error", async () => {
    const wrapper = await mountReady();
    wrapper.vm.validationErrors = {
      title: "t",
      slug: "s",
      summary: "su",
      content: "c",
      coverImage: "ci",
      categoryId: "cat",
      sources: "src",
      scheduledFor: "sf",
    };
    wrapper.vm.article.status = "scheduled";
    await wrapper.vm.$nextTick();
    const feedbacks = wrapper.findAll(".invalid-feedback");
    expect(feedbacks.length).toBeGreaterThanOrEqual(7);
  });

  // ---------------------------------------------------------------- initializeArticleData
  it("initializes from route.state.articleData and generates a slug when slug missing", async () => {
    routeMock = {
      query: { newArticle: "true" },
      params: {},
      state: {
        articleData: {
          title: "From State",
          content: "<p>body</p>",
          summary: "sum",
          sources: ["https://s.com"],
          ai: "minimax",
          sourceId: "src-state",
        },
      },
    };
    findArticleSources.mockResolvedValue({ data: { success: true, sources: [] } });
    const wrapper = await mountReady();
    await flushPromises();
    expect(wrapper.vm.article.title).toBe("From State");
    expect(wrapper.vm.article.slug).toBe("from-state");
    expect(wrapper.vm.article.sources).toEqual(["https://s.com"]);
    expect(wrapper.vm.aiProvider).toBe("minimax");
  });

  it("initializes from localStorage when fromSource query is set, with explicit slug", async () => {
    routeMock = {
      query: { newArticle: "true", fromSource: "1" },
      params: {},
    };
    const stored = JSON.stringify({
      title: "Stored",
      slug: "stored-slug",
      content: "<p>x</p>",
      summary: "s",
      sources: ["https://z.com"],
    });
    Storage.prototype.getItem.mockImplementation((key) => {
      if (key === "newArticleData") return stored;
      if (key === "article.thumbnailBase64") return "thumb64";
      if (key === "article.coverBase64") return "cover64";
      return null;
    });
    const wrapper = await mountReady();
    await flushPromises();
    expect(wrapper.vm.article.title).toBe("Stored");
    expect(wrapper.vm.article.slug).toBe("stored-slug");
    expect(wrapper.vm.coverBase64).toBe("cover64");
    // coverBase64 present -> "already exists" success alert branch
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Article Generated!" })
    );
  });

  it("handles malformed localStorage JSON (parse catch) and missing stored data", async () => {
    routeMock = { query: { newArticle: "true", fromSource: "1" }, params: {} };
    Storage.prototype.getItem.mockImplementation((key) =>
      key === "newArticleData" ? "{bad json" : null
    );
    const wrapper = await mountReady();
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith(
      "Error parsing article data:",
      expect.any(Error)
    );
    // articleData stayed undefined -> title unchanged
    expect(wrapper.vm.article.title).toBe("");
  });

  it("does nothing when fromSource is set but localStorage has no stored data", async () => {
    routeMock = { query: { newArticle: "true", fromSource: "1" }, params: {} };
    // getItem returns null for newArticleData -> `if (storedData)` else path
    Storage.prototype.getItem.mockReturnValue(null);
    const wrapper = await mountReady();
    await flushPromises();
    // articleData stayed undefined -> title unchanged, no parse error logged
    expect(wrapper.vm.article.title).toBe("");
    expect(console.error).not.toHaveBeenCalledWith(
      "Error parsing article data:",
      expect.any(Error)
    );
  });

  it("clears storage when newArticle true but neither state nor fromSource", async () => {
    routeMock = { query: { newArticle: "true" }, params: {} };
    const wrapper = await mountReady();
    await flushPromises();
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith("newArticleData");
    expect(wrapper.vm.article.title).toBe("");
  });

  it("auto-generates a thumbnail when creating from source without a cover image", async () => {
    stubImage(50, 50);
    vi.useFakeTimers();
    routeMock = {
      query: { newArticle: "true" },
      params: {},
      state: {
        articleData: {
          title: "Gen",
          content: "<p>c</p>",
          summary: "s",
          sources: ["https://s.com"],
        },
      },
    };
    getPrompts.mockResolvedValue({ status: 200, data: [] });
    const wrapper = mountView();
    await flushPromises();
    // generating thumbnail success alert was shown
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Now generating thumbnail") })
    );
    // run the setTimeout(generateThumbnail, 500)
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await flushPromises();
    expect(wrapper.vm.article.title).toBe("Gen");
  });

  it("loads from source articles via sourceId query branch", async () => {
    routeMock = { query: { sourceId: "abc" }, params: {} };
    const wrapper = await mountReady();
    await flushPromises();
    expect(console.log).toHaveBeenCalledWith("Loading from source articles:", "abc");
    expect(wrapper.exists()).toBe(true);
  });

  it("loads from source articles via sourceIds query branch", async () => {
    routeMock = { query: { sourceIds: "a,b" }, params: {} };
    const wrapper = await mountReady();
    await flushPromises();
    expect(console.log).toHaveBeenCalledWith("Loading from source articles:", "a,b");
    expect(wrapper.exists()).toBe(true);
  });

  it("initializes with a minimal articleData object (all field fallbacks)", async () => {
    routeMock = {
      query: { newArticle: "true" },
      params: {},
      state: { articleData: {} }, // truthy but empty -> every `|| default` fallback
    };
    const wrapper = await mountReady();
    await flushPromises();
    expect(wrapper.vm.article.title).toBe("");
    expect(wrapper.vm.article.slug).toBe("");
    expect(wrapper.vm.article.content).toBe("");
    expect(wrapper.vm.article.summary).toBe("");
    expect(wrapper.vm.article.sources).toEqual([]);
    // no title/content -> findSources skipped, and the cover-image-exists alert path
    expect(findArticleSources).not.toHaveBeenCalled();
  });

  it("does not call findSources during init when content is empty", async () => {
    routeMock = {
      query: { newArticle: "true" },
      params: {},
      state: {
        articleData: {
          title: "NoContent",
          content: "",
          summary: "s",
          sources: ["https://s.com"],
        },
      },
    };
    const wrapper = await mountReady();
    await flushPromises();
    // findSources not called because content is empty (title && content guard)
    expect(findArticleSources).not.toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe("NoContent");
  });

  // ---------------------------------------------------------------- pure helpers (direct)
  it("escapeHtml returns empty string for falsy input and escapes special chars", async () => {
    const wrapper = await mountReady();
    expect(wrapper.vm.escapeHtml("")).toBe("");
    expect(wrapper.vm.escapeHtml(null)).toBe("");
    expect(wrapper.vm.escapeHtml(`<a href="b">'&'</a>`)).toBe(
      "&lt;a href=&quot;b&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
    );
  });

  it("buildFactCheckHtml handles default/empty and populated issue lists", async () => {
    const wrapper = await mountReady();
    // default arg (no args) and empty array -> fallback paragraph
    expect(wrapper.vm.buildFactCheckHtml()).toContain("Fact check flagged");
    expect(wrapper.vm.buildFactCheckHtml([])).toContain("Fact check flagged");
    // populated list -> uses field fallbacks for missing claim/verdict/reasoning
    const html = wrapper.vm.buildFactCheckHtml([{}]);
    expect(html).toContain("Unknown");
    expect(html).toContain("Unverified");
    expect(html).toContain("No details provided");
  });

  it("buildFindSourcesDebugHtml: non-object returns empty, object with no sections returns empty", async () => {
    const wrapper = await mountReady();
    expect(wrapper.vm.buildFindSourcesDebugHtml(null)).toBe("");
    expect(wrapper.vm.buildFindSourcesDebugHtml("str")).toBe("");
    // an object that yields no sections
    expect(wrapper.vm.buildFindSourcesDebugHtml({ irrelevant: 1 })).toBe("");
  });

  it("buildFindSourcesDebugHtml renders the >10 filtered-items summary and item fallbacks", async () => {
    const wrapper = await mountReady();
    const filteredOut = Array.from({ length: 12 }, (_, i) => ({}));
    filteredOut[0] = { source: "s", reason: "r" };
    const html = wrapper.vm.buildFindSourcesDebugHtml({ filteredOut });
    expect(html).toContain("Showing 10 of 12 filtered items");
    expect(html).toContain("Unknown"); // item.source fallback
    expect(html).toContain("unknown"); // item.reason fallback
  });

  it("buildFactCheckRefinePrompt handles null issues and an empty array", async () => {
    const wrapper = await mountReady();
    // null -> (issues || []) fallback AND empty formattedIssues fallback
    const promptNull = wrapper.vm.buildFactCheckRefinePrompt(null);
    expect(promptNull).toContain("No issues provided.");
    // issue missing fields -> claim "(missing)" with no verdict/reasoning/sources
    const promptMissing = wrapper.vm.buildFactCheckRefinePrompt([{}]);
    expect(promptMissing).toContain("Claim: (missing)");
    // fully-populated issue with sources
    const promptFull = wrapper.vm.buildFactCheckRefinePrompt([
      { claim: "c", verdict: "v", reasoning: "r", sources: ["s1", "s2"] },
    ]);
    expect(promptFull).toContain("Sources: s1, s2");
  });

  // -------------------------------------------------- runFactCheck content/summary fallbacks
  it("runFactCheck strips html and uses fallbacks for empty content/summary", async () => {
    factCheckArticle.mockResolvedValue({ data: { hasIssues: false } });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    wrapper.vm.article.content = ""; // cond-expr else -> ""
    wrapper.vm.article.summary = ""; // summary || "" -> ""
    await wrapper.vm.$nextTick();
    const res = await wrapper.vm.runFactCheck();
    expect(res.ok).toBe(true);
    expect(factCheckArticle).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "", content: "" })
    );
  });

  // -------------------------------------------------- findSources additional branches
  it("findSources singular/plural: adds 2 new sources (plural) and reports duplicates", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: true, sources: ["https://n1.com", "https://n2.com"] },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    wrapper.vm.article.sources = [];
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Sources Found!",
        text: expect.stringContaining("Added 2 new sources"),
      })
    );
  });

  it("findSources no-sources with debug but no message uses default message", async () => {
    findArticleSources.mockResolvedValue({
      data: { success: false, debug: { parseError: "x" } }, // no message
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No Sources Found" })
    );
  });

  it("findSources catch with debug, no payload message, uses error.message then default", async () => {
    // payload exists with debug but no message; error.message present
    findArticleSources.mockRejectedValueOnce({
      message: "err msg",
      response: { data: { debug: { parseError: "x" } } },
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error" })
    );
  });

  it("findSources catch with debug and no messages at all uses hard-coded fallback", async () => {
    const err = { response: { data: { debug: { parseError: "x" } } } };
    Object.defineProperty(err, "message", { value: "", enumerable: true });
    findArticleSources.mockRejectedValueOnce(err);
    const wrapper = await mountReady();
    wrapper.vm.article.title = "T";
    await wrapper.vm.$nextTick();
    await wrapper.vm.findSources();
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error" })
    );
  });

  // -------------------------------------------------- generateThumbnail prompt fallback
  it("generateThumbnail falls back to default prompt when cached prompts.value.thumbnail is empty", async () => {
    stubImage(50, 50);
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "featured";
    wrapper.vm.prompts = { thumbnail: "" }; // cached, falsy thumbnail -> default
    await wrapper.vm.$nextTick();
    await wrapper.vm.generateThumbnail();
    await flushPromises();
    expect(getPrompts).not.toHaveBeenCalled(); // cached -> no fetch
    expect(generateArticleThumbnail).toHaveBeenCalledWith(
      "Generate image based on the title: Topic and summary: ",
      "featured",
      "gpt"
    );
  });

  it("generateThumbnail succeeds when getPrompts returns non-200 but has data", async () => {
    stubImage(50, 50);
    // status != 200 but data present -> `status != 200 && !data` is false, no throw
    getPrompts.mockResolvedValue({
      status: 201,
      data: [{ active: true, type: "thumbnail", content: "C {{topic}}" }],
    });
    const wrapper = await mountReady();
    wrapper.vm.article.title = "Topic";
    wrapper.vm.article.articleType = "featured";
    await wrapper.vm.$nextTick();
    await wrapper.vm.generateThumbnail();
    await flushPromises();
    expect(generateArticleThumbnail).toHaveBeenCalled();
  });

  // -------------------------------------------------- v-model setters (template fns)
  it("drives every form control v-model setter", async () => {
    const wrapper = await mountReady();

    // slug input setter
    await wrapper.find("#slug").setValue("manual-slug");
    expect(wrapper.vm.article.slug).toBe("manual-slug");

    // summary textarea setter
    await wrapper.find("#summary").setValue("a summary");
    expect(wrapper.vm.article.summary).toBe("a summary");

    // QuillEditor content update setter
    wrapper.findComponent({ name: "QuillEditor" }).vm.$emit("update:content", "<p>c</p>");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.article.content).toBe("<p>c</p>");

    // imageProvider select setter (visible while no cover image)
    await wrapper.find(".input-group .form-select").setValue("minimax");
    expect(wrapper.vm.imageProvider).toBe("minimax");

    // category select setter
    await wrapper.find("#category").setValue(2);
    expect(wrapper.vm.article.categoryId).toBe(2);

    // articleType select setter
    await wrapper.find("#articleType").setValue("top");
    expect(wrapper.vm.article.articleType).toBe("top");

    // status select setter
    await wrapper.find("#status").setValue("scheduled");
    expect(wrapper.vm.article.status).toBe("scheduled");

    // scheduledFor datetime-local setter (input now visible)
    await wrapper.find("#scheduledDate").setValue("2099-01-01T10:00");
    expect(wrapper.vm.article.scheduledFor).toBe("2099-01-01T10:00");

    // sources[index] input setter (existing-source list)
    wrapper.vm.article.sources = ["https://old.com"];
    await wrapper.vm.$nextTick();
    await wrapper.find(".source-item input[type='url']").setValue("https://edited.com");
    expect(wrapper.vm.article.sources[0]).toBe("https://edited.com");
  });

  it("TagSelector v-model setter updates article.tags", async () => {
    const wrapper = await mountReady();
    wrapper.findComponent(TagSelectorStub).vm.$emit("update:modelValue", [{ id: 1 }]);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.article.tags).toEqual([{ id: 1 }]);
  });

  it("RefineArticleModal v-model:refine-input setter updates refineInput", async () => {
    const wrapper = await mountReady();
    wrapper
      .findComponent(RefineArticleModalStub)
      .vm.$emit("update:refineInput", "hello");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.refineInput).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// Helper to stub the global Image so generateThumbnailFromImage resolves.
function stubImage(width, height) {
  class Img {
    constructor() {
      this.width = width;
      this.height = height;
    }
    set src(_v) {
      Promise.resolve().then(() => this.onload && this.onload());
    }
    get src() {
      return "";
    }
  }
  vi.stubGlobal("Image", Img);

  // Canvas getContext / toDataURL stubs
  const proto = HTMLCanvasElement.prototype;
  vi.spyOn(proto, "getContext").mockReturnValue({ drawImage: vi.fn() });
  vi.spyOn(proto, "toDataURL").mockReturnValue("data:image/jpeg;base64,THUMB");
}

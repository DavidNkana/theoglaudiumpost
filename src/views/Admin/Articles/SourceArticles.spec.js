import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// vue-router -> useRouter returns a controllable mock
const push = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

// bootstrap Modal -> capture show/hide and the element passed in
const modalShow = vi.fn();
const modalHide = vi.fn();
const modalInstances = [];
vi.mock("bootstrap", () => ({
  Modal: vi.fn().mockImplementation((el) => {
    const inst = { el, show: modalShow, hide: modalHide };
    modalInstances.push(inst);
    return inst;
  }),
}));

// Articles service -> every exported function used is a controllable mock
const getArticles = vi.fn();
const generateArticle = vi.fn();
const getSourceArticlesFromAllTasks = vi.fn();
const getSourceArticlesByProvider = vi.fn();
const generateArticleBySourceId = vi.fn();
const generateArticlesBySourceIds = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticles: (...a) => getArticles(...a),
  generateArticle: (...a) => generateArticle(...a),
  getSourceArticlesFromAllTasks: (...a) => getSourceArticlesFromAllTasks(...a),
  getSourceArticlesByProvider: (...a) => getSourceArticlesByProvider(...a),
  generateArticleBySourceId: (...a) => generateArticleBySourceId(...a),
  generateArticlesBySourceIds: (...a) => generateArticlesBySourceIds(...a),
}));

// utils.stripCodeBlockMarkers -> simple passthrough we can assert on
vi.mock("@/utils", () => ({
  stripCodeBlockMarkers: vi.fn((t) => `STRIP(${t})`),
}));

// sweetalert2 -> capture fire/close/showLoading
const swalFire = vi.fn();
const swalClose = vi.fn();
const swalShowLoading = vi.fn();
vi.mock("sweetalert2", () => ({
  default: {
    fire: (...a) => swalFire(...a),
    close: (...a) => swalClose(...a),
    showLoading: (...a) => swalShowLoading(...a),
  },
}));

import SourceArticles from "@/views/Admin/Articles/SourceArticles.vue";

function defaultProviderResponse(list = [], tasks = []) {
  return { data: { data: list, tasks } };
}

function mountView() {
  return mount(SourceArticles, {
    attachTo: document.body,
  });
}

let confirmSpy;
let alertSpy;

beforeEach(() => {
  // Fully reset every service mock (clears call history AND any queued
  // mockResolvedValueOnce implementations so they cannot leak between tests).
  [
    getArticles,
    generateArticle,
    getSourceArticlesFromAllTasks,
    getSourceArticlesByProvider,
    generateArticleBySourceId,
    generateArticlesBySourceIds,
    modalShow,
    modalHide,
    swalFire,
    swalClose,
    swalShowLoading,
    push,
  ].forEach((m) => m.mockReset());
  modalInstances.length = 0;
  localStorage.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  // default: provider endpoint resolves with empty list
  getSourceArticlesByProvider.mockResolvedValue(defaultProviderResponse([], []));
  getSourceArticlesFromAllTasks.mockResolvedValue({ data: {} });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SourceArticles.vue", () => {
  it("renders empty state after mount and initializes modals", async () => {
    const wrapper = mountView();
    await flushPromises();

    // Modals were created (two of them)
    expect(modalInstances.length).toBe(2);
    // default provider is minimax from localStorage fallback
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("minimax", false);
    // Empty state visible
    expect(wrapper.text()).toContain("No source articles found");
    expect(wrapper.find("button.btn-primary").exists()).toBe(true);
    // tasks block not rendered (tasks empty)
    expect(wrapper.text()).not.toContain("Tasks Queried");
  });

  it("uses stored provider from localStorage when present", async () => {
    localStorage.setItem("sourceProvider", "gpt");
    mountView();
    await flushPromises();
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("gpt", false);
  });

  it("renders the loading spinner while fetch is pending", async () => {
    let resolveFn;
    getSourceArticlesByProvider.mockReturnValueOnce(
      new Promise((res) => {
        resolveFn = res;
      })
    );
    const wrapper = mountView();
    // onMounted started but promise not resolved yet -> loading true
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading source articles...");
    resolveFn(defaultProviderResponse([], []));
    await flushPromises();
  });

  it("renders the error state when provider fetch rejects", async () => {
    getSourceArticlesByProvider.mockRejectedValueOnce(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
    expect(wrapper.text()).toContain(
      "Failed to load source articles. Please try again later."
    );
  });

  it("renders the articles table with tasks and all column fallbacks", async () => {
    const articles = [
      {
        id: 1,
        title: "Has Everything",
        url: "https://example.com/a",
        platform: "Twitter",
        author: "Alice",
        type: "News",
        timestamp: "2025-01-02",
      },
      {
        // no id, no url, no platform (uses source), no author/type, createdAt
        source: "Facebook",
        createdAt: "2025-03-04",
        title: "Minimal",
      },
      {
        // no platform/source, no author/type, no timestamp/createdAt -> Unknown/Article/N-A date
        id: 3,
        title: "Bare",
      },
    ];
    const tasks = [{ taskId: "t1", prompt: "p1", articleCount: 5 }];
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(articles, tasks)
    );

    const wrapper = mountView();
    await flushPromises();

    // tasks block rendered
    expect(wrapper.text()).toContain("Tasks Queried");
    expect(wrapper.text()).toContain("t1");
    expect(wrapper.text()).toContain("p1");

    // table rendered (v-else branch)
    expect(wrapper.find("table.table-hover").exists()).toBe(true);
    // url link present for first, N/A for others
    expect(wrapper.find('a[href="https://example.com/a"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("N/A");
    // platform fallbacks
    expect(wrapper.text()).toContain("Twitter");
    expect(wrapper.text()).toContain("Facebook"); // from source
    expect(wrapper.text()).toContain("Unknown"); // no platform/source + author
    expect(wrapper.text()).toContain("Article"); // default type
    // total count
    expect(wrapper.text()).toContain("Total articles: 3");
  });

  it("normalizes a directArray response (root.data is an array)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: [{ id: 9, title: "DirectArr" }],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("DirectArr");
  });

  it("normalizes container.data nested array and root.tasks fallback", async () => {
    // root.data is an object with .data array and tasks at root level
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: { data: [{ id: 11, title: "NestedArr" }] },
      tasks: [{ taskId: "rt", prompt: "rp", articleCount: 1 }],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("NestedArr");
    expect(wrapper.text()).toContain("rt");
  });

  it("normalizes sourceArticles key when no direct array exists", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: { sourceArticles: [{ id: 21, title: "FromSourceKey" }], tasks: [] },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("FromSourceKey");
  });

  it("falls back to legacy endpoint when provider list is empty", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([], [])
    );
    getSourceArticlesFromAllTasks.mockResolvedValueOnce({
      data: {
        sourceArticles: [{ id: 31, title: "LegacyArticle" }],
        tasks: [{ taskId: "lt", prompt: "lp", articleCount: 2 }],
      },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(getSourceArticlesFromAllTasks).toHaveBeenCalled();
    expect(wrapper.text()).toContain("LegacyArticle");
    expect(wrapper.text()).toContain("lt");
  });

  it("legacy fallback uses items key and tolerates missing data", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([], [])
    );
    // legacy returns no .data, with items + no tasks
    getSourceArticlesFromAllTasks.mockResolvedValueOnce({
      items: [{ id: 41, title: "LegacyItems" }],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("LegacyItems");
  });

  it("logs a warning when legacy fallback itself rejects", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([], [])
    );
    getSourceArticlesFromAllTasks.mockRejectedValueOnce(new Error("legacy boom"));
    const wrapper = mountView();
    await flushPromises();
    expect(console.warn).toHaveBeenCalledWith(
      "Legacy fallback failed:",
      expect.any(Error)
    );
    // ends in empty state
    expect(wrapper.text()).toContain("No source articles found");
  });

  it("filters by saved IDs from localStorage", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify(["1", "  ", null]));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "Keep" },
          { id: 2, title: "Drop" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Keep");
    expect(wrapper.text()).not.toContain("Drop");
  });

  it("falls back to unfiltered list when saved-ID filter removes everything", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify(["999"]));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "AlphaUnfiltered" },
          { id: 2, title: "BetaUnfiltered" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    // filter removes all -> restore unfiltered
    expect(wrapper.text()).toContain("AlphaUnfiltered");
    expect(wrapper.text()).toContain("BetaUnfiltered");
  });

  it("ignores invalid (non-array) saved IDs JSON", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify({ not: "array" }));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "AllShown" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("AllShown");
  });

  it("tolerates malformed saved IDs JSON (parse throws)", async () => {
    localStorage.setItem("savedSourceArticleIds", "{not valid json");
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "StillShown" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("StillShown");
  });

  it("refresh button re-fetches articles", async () => {
    const wrapper = mountView();
    await flushPromises();
    getSourceArticlesByProvider.mockClear();
    await wrapper.find("button.btn-success").trigger("click");
    await flushPromises();
    expect(getSourceArticlesByProvider).toHaveBeenCalled();
  });

  it("changing provider persists to localStorage and re-fetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getSourceArticlesByProvider.mockClear();
    const select = wrapper.find("select.form-select");
    await select.setValue("x");
    await flushPromises();
    expect(localStorage.getItem("sourceProvider")).toBe("x");
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("x", false);
  });

  it("provider watcher tolerates localStorage.setItem throwing", async () => {
    const wrapper = mountView();
    await flushPromises();
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementationOnce(() => {
        throw new Error("quota");
      });
    const select = wrapper.find("select.form-select");
    await select.setValue("gemini");
    await flushPromises();
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("gemini", false);
    setItemSpy.mockRestore();
  });

  it("renders a Deep Search toggle next to the AI Source dropdown", async () => {
    const wrapper = mountView();
    await flushPromises();
    const toggle = wrapper.find("#deepSearchToggle");
    expect(toggle.exists()).toBe(true);
    expect(toggle.element.type).toBe("checkbox");
    expect(wrapper.text()).toContain("Deep Search");
  });

  it("default deepSearch is false and passes deepSearch=false to the service", async () => {
    localStorage.removeItem("sourceDeepSearch");
    const wrapper = mountView();
    await flushPromises();
    const toggle = wrapper.find("#deepSearchToggle");
    expect(toggle.element.checked).toBe(false);
    // The initial mount already called getSourceArticlesByProvider once with false
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("minimax", false);
  });

  it("toggling Deep Search on persists to localStorage and re-fetches with deepSearch=true", async () => {
    const wrapper = mountView();
    await flushPromises();
    getSourceArticlesByProvider.mockClear();
    const toggle = wrapper.find("#deepSearchToggle");
    await toggle.setValue(true);
    await flushPromises();
    expect(localStorage.getItem("sourceDeepSearch")).toBe("true");
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("minimax", true);
    expect(toggle.element.checked).toBe(true);
  });

  it("toggling Deep Search off persists to localStorage and re-fetches with deepSearch=false", async () => {
    localStorage.setItem("sourceDeepSearch", "true");
    const wrapper = mountView();
    await flushPromises();
    getSourceArticlesByProvider.mockClear();
    const toggle = wrapper.find("#deepSearchToggle");
    expect(toggle.element.checked).toBe(true);
    await toggle.setValue(false);
    await flushPromises();
    expect(localStorage.getItem("sourceDeepSearch")).toBe("false");
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("minimax", false);
    expect(toggle.element.checked).toBe(false);
  });

  it("deepSearch works with each provider", async () => {
    const wrapper = mountView();
    await flushPromises();
    getSourceArticlesByProvider.mockClear();
    // turn deep-search on first
    await wrapper.find("#deepSearchToggle").setValue(true);
    await flushPromises();
    getSourceArticlesByProvider.mockClear();
    // then change provider to each option and verify the deepSearch=true is preserved
    for (const provider of ["gpt", "gemini", "x"]) {
      getSourceArticlesByProvider.mockClear();
      await wrapper.find("select.form-select").setValue(provider);
      await flushPromises();
      expect(getSourceArticlesByProvider).toHaveBeenCalledWith(provider, true);
    }
  });

  it("opens the generate modal from the empty-state button (resets fields)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-primary").trigger("click");
    expect(modalShow).toHaveBeenCalled();
    // topic input was reset to empty
    const topic = wrapper.find("#topicInput");
    expect(topic.element.value).toBe("");
  });

  it("startGeneration returns early when topic is blank", async () => {
    const wrapper = mountView();
    await flushPromises();
    // open modal
    await wrapper.find("button.btn-primary").trigger("click");
    // topic empty -> clicking generate does nothing
    const generateBtn = wrapper.find("#generateModal .btn-primary");
    await generateBtn.trigger("click");
    await flushPromises();
    expect(generateArticle).not.toHaveBeenCalled();
  });

  it("startGeneration success: adds article, hides modal, alerts (result.html branch)", async () => {
    generateArticle.mockResolvedValueOnce({
      html: "<p>Body</p>",
      summary: "Sum",
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-primary").trigger("click");
    await wrapper.find("#topicInput").setValue("My Topic");
    await wrapper.find("#instructionsInput").setValue("Be concise");
    await wrapper.find("#generateModal .btn-primary").trigger("click");
    await flushPromises();
    expect(generateArticle).toHaveBeenCalled();
    const msgs = generateArticle.mock.calls[0][0];
    expect(msgs[1].content).toContain("My Topic");
    expect(msgs[1].content).toContain("Additional instructions: Be concise");
    expect(modalHide).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Article generated successfully!");
    // newly added article shows in table
    expect(wrapper.text()).toContain("My Topic");
  });

  it("startGeneration success with no instructions and result.data fallbacks", async () => {
    generateArticle.mockResolvedValueOnce({
      data: { html: "<p>Body</p>", summary: "Sum" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-primary").trigger("click");
    await wrapper.find("#topicInput").setValue("Topic2");
    await wrapper.find("#generateModal .btn-primary").trigger("click");
    await flushPromises();
    const msgs = generateArticle.mock.calls[0][0];
    expect(msgs[1].content).not.toContain("Additional instructions");
    expect(alertSpy).toHaveBeenCalledWith("Article generated successfully!");
  });

  it("startGeneration success with neither html nor data falls to defaults", async () => {
    generateArticle.mockResolvedValueOnce({});
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-primary").trigger("click");
    await wrapper.find("#topicInput").setValue("Topic3");
    await wrapper.find("#generateModal .btn-primary").trigger("click");
    await flushPromises();
    expect(alertSpy).toHaveBeenCalledWith("Article generated successfully!");
  });

  it("startGeneration error path alerts failure", async () => {
    generateArticle.mockRejectedValueOnce(new Error("gen fail"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-primary").trigger("click");
    await wrapper.find("#topicInput").setValue("Topic4");
    await wrapper.find("#generateModal .btn-primary").trigger("click");
    await flushPromises();
    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to generate article. Please try again later."
    );
  });

  it("isGenerating renders the spinner inside the generate button", async () => {
    let resolveGen;
    generateArticle.mockReturnValueOnce(
      new Promise((res) => {
        resolveGen = res;
      })
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-primary").trigger("click");
    await wrapper.find("#topicInput").setValue("Topic5");
    await wrapper.find("#generateModal .btn-primary").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find("#generateModal .spinner-border-sm").exists()).toBe(true);
    expect(wrapper.find("#generateModal").text()).toContain("Generating...");
    resolveGen({ html: "<p>x</p>" });
    await flushPromises();
  });

  it("viewArticle opens the view modal and shows content", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [{ id: 1, title: "Viewable", content: "<p>Hello</p>" }],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    const viewBtn = wrapper.find("button.btn-outline-primary");
    await viewBtn.trigger("click");
    expect(modalShow).toHaveBeenCalled();
    expect(wrapper.find("#viewModal").html()).toContain("Hello");
    // modal title uses selectedArticle.title
    expect(wrapper.find("#viewModalLabel").text()).toBe("Viewable");
  });

  it("view modal shows the spinner placeholder when no article is selected", async () => {
    const wrapper = mountView();
    await flushPromises();
    // selectedArticle is null -> placeholder spinner shown, default title
    expect(wrapper.find("#viewModalLabel").text()).toBe("Article Preview");
    expect(wrapper.find("#viewModal .spinner-border").exists()).toBe(true);
  });

  it("createFromSource success: stores data, navigates, persists saved IDs (with coverUrl)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 7, title: "Src", url: "u" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: {
        title: "Generated Title",
        slug: "gen-slug",
        article: "BODY",
        summary: "SUM",
        sources: ["s1"],
        coverUrl: "http://img",
        coverMediaId: "m1",
        articleId: "aid-1",
      },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();

    expect(generateArticleBySourceId).toHaveBeenCalledWith(7, "minimax");
    expect(swalClose).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("Generated Title");
    expect(stored.content).toBe("STRIP(BODY)");
    expect(stored.coverUrl).toBe("http://img");
    expect(stored.ai).toBe("minimax");
    expect(localStorage.getItem("article.coverBase64")).toBe("http://img");
    expect(localStorage.getItem("article.thumbnailBase64")).toBe("http://img");
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toContain("7");
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/admin/articles/create" })
    );
  });

  it("createFromSource handles legacy keys, no cover, response without data wrapper", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 8, title: "SrcLegacy" }], [])
    );
    // response has no .data -> uses response directly; legacy capitalized keys; no coverUrl
    generateArticleBySourceId.mockResolvedValueOnce({
      "Title:": "Legacy Title",
      "Article:": "LEGACY BODY",
      "Summary:": "LEGACY SUM",
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("Legacy Title");
    expect(stored.content).toBe("STRIP(LEGACY BODY)");
    expect(stored.summary).toBe("LEGACY SUM");
    expect(stored.coverUrl).toBeNull();
    // no cover stored
    expect(localStorage.getItem("article.coverBase64")).toBeNull();
  });

  it("createFromSource falls back to source article title and empty article", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 12, title: "FallbackTitle" }], [])
    );
    // no title fields, no article -> title from article.title, content STRIP('')
    generateArticleBySourceId.mockResolvedValueOnce({ data: {} });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("FallbackTitle");
    expect(stored.content).toBe("STRIP()");
  });

  it("createFromSource appends a new saved ID without duplicating existing ones", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify(["7"]));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 7, title: "Dup" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    const ids = JSON.parse(localStorage.getItem("savedSourceArticleIds"));
    expect(ids.filter((x) => x === "7").length).toBe(1);
  });

  it("createFromSource tolerates malformed savedSourceArticleIds JSON", async () => {
    localStorage.setItem("savedSourceArticleIds", "{bad json");
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 7, title: "BadJson" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    // navigation still happened despite the inner try/catch swallowing the parse error
    expect(push).toHaveBeenCalled();
  });

  it("createFromSource handles null parsed saved IDs (raw falsy -> default [])", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 14, title: "NoRaw" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toContain("14");
  });

  it("createFromSource error path shows Swal error", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 9, title: "WillFail" }], [])
    );
    generateArticleBySourceId.mockRejectedValueOnce(new Error("convert fail"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
  });

  it("createFromSource didOpen callback invokes Swal.showLoading", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 10, title: "LoadCb" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    // invoke the didOpen callback that was passed to Swal.fire
    const loadingCall = swalFire.mock.calls.find(
      (c) => c[0] && typeof c[0].didOpen === "function"
    );
    expect(loadingCall).toBeTruthy();
    loadingCall[0].didOpen();
    expect(swalShowLoading).toHaveBeenCalled();
    await flushPromises();
  });

  it("createFromSource from the view modal button works", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [{ id: 50, title: "ViewThenCreate", content: "<p>c</p>" }],
        []
      )
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    // open view modal first so selectedArticle is set
    await wrapper.find("button.btn-outline-primary").trigger("click");
    // the "Create Article From This Source" button in the view modal footer
    const createBtn = wrapper.find("#viewModal .btn-success");
    expect(createBtn.exists()).toBe(true);
    await createBtn.trigger("click");
    await flushPromises();
    expect(generateArticleBySourceId).toHaveBeenCalledWith(50, "minimax");
  });

  it("deleteArticle removes article when confirmed (and was selected)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "DelMe" },
          { id: 2, title: "KeepMe" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    // select the first article so deletion exercises the isArticleSelected branch
    const firstCheckbox = wrapper.findAll('tbody input[type="checkbox"]')[0];
    await firstCheckbox.trigger("change");
    expect(wrapper.text()).toContain("1 selected");

    const deleteBtn = wrapper.findAll("button.btn-outline-danger")[0];
    await deleteBtn.trigger("click");
    await flushPromises();
    expect(wrapper.text()).not.toContain("DelMe");
    expect(wrapper.text()).toContain("KeepMe");
    expect(alertSpy).toHaveBeenCalledWith("Article deleted successfully!");
  });

  it("deleteArticle aborts when not confirmed", async () => {
    confirmSpy.mockReturnValue(false);
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "StayPut" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-danger").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("StayPut");
    expect(alertSpy).not.toHaveBeenCalledWith("Article deleted successfully!");
  });

  it("deleteArticle of an unselected article keeps selection logic intact", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "DelUnselected" },
          { id: 2, title: "OtherArticle" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    // delete without selecting -> isArticleSelected false branch
    await wrapper.findAll("button.btn-outline-danger")[0].trigger("click");
    await flushPromises();
    expect(wrapper.text()).not.toContain("DelUnselected");
  });

  it("toggleSelectAll selects all then deselects all", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "A1" },
          { id: 2, title: "A2" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    const selectAll = wrapper.find("#selectAll");
    await selectAll.trigger("change");
    expect(wrapper.text()).toContain("2 selected");
    // select-all checkbox should now be checked
    expect(wrapper.find("#selectAll").element.checked).toBe(true);
    // toggle again -> deselect all
    await selectAll.trigger("change");
    expect(wrapper.text()).toContain("0 selected");
  });

  it("toggleArticleSelection toggles an individual article on and off", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "Toggle" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    const cb = wrapper.find('tbody input[type="checkbox"]');
    await cb.trigger("change");
    expect(wrapper.text()).toContain("1 selected");
    await cb.trigger("change");
    expect(wrapper.text()).toContain("0 selected");
  });

  it("convertSelectedArticles does nothing with zero selected (button disabled)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "Z" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    expect(convertBtn.attributes("disabled")).toBeDefined();
    // call the handler directly with empty selection -> early return
    await convertBtn.trigger("click");
    await flushPromises();
    expect(generateArticlesBySourceIds).not.toHaveBeenCalled();
  });

  it("convertSelectedArticles with one selected delegates to createFromSource", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "Single" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    // select one
    await wrapper.find('tbody input[type="checkbox"]').trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(generateArticleBySourceId).toHaveBeenCalledWith(1, "minimax");
    expect(generateArticlesBySourceIds).not.toHaveBeenCalled();
  });

  it("convertSelectedArticles with one selected but article not found does nothing", async () => {
    // Two articles keep the table (and Convert button) rendered; we select the
    // first then mutate its key so the lookup inside convert returns undefined.
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "Vanish" },
          { id: 2, title: "OtherKept" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    // select only the first article
    await wrapper.findAll('tbody input[type="checkbox"]')[0].trigger("change");
    expect(wrapper.text()).toContain("1 selected");
    // change the first article's id so getArticleKey no longer matches the stored key
    wrapper.vm.sourceArticles[0].id = 999;
    await flushPromises();
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(generateArticleBySourceId).not.toHaveBeenCalled();
  });

  it("convertSelectedArticles with multiple selected batch-converts (array response)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "M1" },
          { id: 2, title: "M2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: [{ title: "Batch", slug: "batch", article: "BODY", summary: "S" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    expect(wrapper.text()).toContain("2 selected");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(generateArticlesBySourceIds).toHaveBeenCalledWith([1, 2], "minimax");
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("Batch");
    expect(stored.content).toBe("STRIP(BODY)");
    expect(stored.additionalSourceIds).toEqual([2]);
    expect(stored.ai).toBe("minimax");
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Articles are being generated" })
    );
    // selection cleared
    expect(wrapper.text()).toContain("0 selected");
    // saved IDs persisted incl. additional ones
    const ids = JSON.parse(localStorage.getItem("savedSourceArticleIds"));
    expect(ids).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it("convertSelectedArticles multiple: non-array response uses articles key & legacy fields", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "N1" },
          { id: 2, title: "N2" },
        ],
        []
      )
    );
    // response without .data wrapper, articles key, legacy capitalized keys
    generateArticlesBySourceIds.mockResolvedValueOnce({
      articles: [{ "Title:": "LegacyBatch", "Article:": "LB", "Summary:": "LS" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("LegacyBatch");
    expect(stored.content).toBe("STRIP(LB)");
    expect(stored.summary).toBe("LS");
  });

  it("convertSelectedArticles multiple: empty articles array falls back to data object & source title", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "FirstSrcTitle" },
          { id: 2, title: "SecondSrc" },
        ],
        []
      )
    );
    // articles array empty -> `first` becomes the data object itself (no title) -> article?.title used
    generateArticlesBySourceIds.mockResolvedValueOnce({ data: { articles: [] } });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("FirstSrcTitle");
    expect(stored.content).toBe("STRIP()");
  });

  it("convertSelectedArticles multiple: tolerates malformed saved IDs JSON", async () => {
    localStorage.setItem("savedSourceArticleIds", "{broken");
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "B1" },
          { id: 2, title: "B2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: [{ title: "Ok", article: "A" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    // success swal still fired despite inner persist try/catch swallowing parse error
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Articles are being generated" })
    );
  });

  it("convertSelectedArticles multiple: didOpen invokes showLoading", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "L1" },
          { id: 2, title: "L2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: [{ title: "Ok", article: "A" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    const loadingCall = swalFire.mock.calls.find(
      (c) => c[0] && typeof c[0].didOpen === "function"
    );
    loadingCall[0].didOpen();
    expect(swalShowLoading).toHaveBeenCalled();
    await flushPromises();
  });

  it("convertSelectedArticles multiple error path shows Swal error", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "E1" },
          { id: 2, title: "E2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockRejectedValueOnce(new Error("batch fail"));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
  });

  it("getArticleKey uses url, then composite fallbacks for articles without id", async () => {
    // article with url but no id -> select-<url>; article with nothing -> composite
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { url: "https://u1", title: "ByUrl" },
          { platform: "P", author: "Au", createdAt: "d", title: "Composite" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    // checkbox ids reflect getArticleKey output
    expect(wrapper.find('input[id="select-https://u1"]').exists()).toBe(true);
    expect(
      wrapper.find('input[id="select-P|Au|d|Composite"]').exists()
    ).toBe(true);
    // selecting the url-keyed one then select-all path
    await wrapper.findAll('tbody input[type="checkbox"]')[0].trigger("change");
    expect(wrapper.text()).toContain("1 selected");
  });

  it("getArticleKey composite uses all default fallbacks incl. random title", async () => {
    const rnd = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    getSourceArticlesByProvider.mockResolvedValueOnce(
      // no id/url/platform/source/author/createdAt/title -> 'src'|'author'|'date'|<random>
      defaultProviderResponse([{}], [])
    );
    const wrapper = mountView();
    await flushPromises();
    // checkbox id begins with the composite default prefix
    const cb = wrapper.find('tbody input[type="checkbox"]');
    expect(cb.exists()).toBe(true);
    expect(cb.attributes("id").startsWith("select-src|author|date|")).toBe(true);
    rnd.mockRestore();
  });

  it("formatDate handles missing date (N/A) and valid date", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "Dated", timestamp: "2025-06-15" },
          { id: 2, title: "NoDate" },
        ],
        []
      )
    );
    const wrapper = mountView();
    await flushPromises();
    // valid date renders a localized string containing the year
    expect(wrapper.text()).toContain("2025");
    // missing date -> N/A (also used by url column, so ensure date cell present)
    expect(wrapper.text()).toContain("N/A");
  });

  // --- Normalization right-operand and nullish-coalescing fallbacks ---------

  it("fetch handles a null response (response ?? {}) -> empty state", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(null);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("No source articles found");
  });

  it("fetch handles response without .data (response ?? response)", async () => {
    // no .data on the resolved object -> root = response itself (an array carrier)
    getSourceArticlesByProvider.mockResolvedValueOnce({
      sourceArticles: [{ id: 1, title: "NoDataKey" }],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("NoDataKey");
  });

  it("fetch directArray path picks container.tasks (consequent of L354)", async () => {
    // root.data is an array, with tasks alongside under root.data wrapper's parent
    // Use a top-level array as data plus a tasks array on the container object.
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: Object.assign([{ id: 1, title: "DirTaskArr" }], {
        tasks: [{ taskId: "ct", prompt: "cp", articleCount: 3 }],
      }),
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("DirTaskArr");
    expect(wrapper.text()).toContain("ct");
  });

  it("fetch resolves list from container.articles key (2nd || operand)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: { articles: [{ id: 1, title: "FromArticlesKey" }] },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("FromArticlesKey");
  });

  it("fetch resolves list from container.items key (3rd || operand)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: { items: [{ id: 1, title: "FromItemsKey" }] },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("FromItemsKey");
  });

  it("fetch resolves list from container.results key (4th || operand)", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: { results: [{ id: 1, title: "FromResultsKey" }] },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("FromResultsKey");
  });

  it("fetch (else-branch): non-array results coerces to [] while a valid array key fills the list", async () => {
    // root = response.data ; root.data is a non-array object -> container = root.data.
    // container.sourceArticles/articles non-array, items IS an array -> list non-empty
    // (no legacy fallback). container has no tasks -> taskList falls through to
    // root.tasks (L358 else / branches 22[1] + 23).
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: {
        data: { sourceArticles: "", articles: 0, items: [{ id: 1, title: "ElseList" }] },
        tasks: [{ taskId: "roott", prompt: "rp", articleCount: 9 }],
      },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("ElseList");
    // tasks rendered from root.tasks fallback
    expect(wrapper.text()).toContain("roott");
  });

  it("fetch else-branch: non-array source value coerces list to [] (L357 else)", async () => {
    // All list keys absent/falsy except a non-array truthy sourceArticles -> source
    // is that non-array value -> Array.isArray(source) false -> list = [].
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: { sourceArticles: "not-an-array" },
    });
    // legacy fallback also yields nothing
    getSourceArticlesFromAllTasks.mockResolvedValueOnce({ data: {} });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("No source articles found");
  });

  it("legacy fallback: legacy null coalesces to {} and non-array tasks/list stay non-array", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([], [])
    );
    // legacy resolves null -> legacyData = {} ; list = [] ; taskList = []
    getSourceArticlesFromAllTasks.mockResolvedValueOnce(null);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("No source articles found");
  });

  it("legacy fallback yields non-array list & tasks (final Array.isArray guards -> [])", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([], [])
    );
    // legacyData.sourceArticles is a non-array truthy -> list becomes a string;
    // legacyData.tasks is a non-array truthy -> taskList becomes an object.
    // This drives: unfilteredList = [] (L374 else), tasks.value = [] (L386 else),
    // sourceArticles.value = [] (L387 else).
    getSourceArticlesFromAllTasks.mockResolvedValueOnce({
      data: { sourceArticles: "stringy", tasks: { not: "array" } },
    });
    const wrapper = mountView();
    await flushPromises();
    // both normalized to empty -> empty state, no tasks block
    expect(wrapper.text()).toContain("No source articles found");
    expect(wrapper.text()).not.toContain("Tasks Queried");
  });

  // --- selectedProvider falsy fallbacks ('' || 'minimax') -------------------

  it("fetch uses 'minimax' default when provider value is empty string", async () => {
    const wrapper = mountView();
    await flushPromises();
    // the watcher refetches on provider change; keep it returning an empty list
    getSourceArticlesByProvider.mockResolvedValue(defaultProviderResponse([], []));
    getSourceArticlesByProvider.mockClear();
    // force the reactive provider to empty -> watcher fires fetch with '' || 'minimax'
    wrapper.vm.selectedProvider = "";
    await flushPromises();
    expect(getSourceArticlesByProvider).toHaveBeenCalledWith("minimax", false);
  });

  it("createFromSource uses 'minimax' default and '' title when provider/title empty", async () => {
    const noTitleNoId = [{ url: "https://only-url" }];
    getSourceArticlesByProvider.mockResolvedValueOnce(
      // article has NO title and NO id -> sourceId null branch + title '' branch
      defaultProviderResponse(noTitleNoId, [])
    );
    // the watcher refetch (triggered by clearing the provider) must keep the row
    getSourceArticlesByProvider.mockResolvedValue(
      defaultProviderResponse(noTitleNoId, [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({ data: {} });
    const wrapper = mountView();
    await flushPromises();
    // empty provider so createFromSource falls back to 'minimax'
    wrapper.vm.selectedProvider = "";
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    expect(generateArticleBySourceId).toHaveBeenCalledWith(undefined, "minimax");
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("");
    // sourceId is undefined -> not persisted (L533 if false branch)
    expect(localStorage.getItem("savedSourceArticleIds")).toBe("[]");
  });

  it("createFromSource: saved IDs JSON parses to a non-array -> reset to [] (L532 else)", async () => {
    // valid JSON but an object, so JSON.parse succeeds yet Array.isArray(arr) is false
    localStorage.setItem("savedSourceArticleIds", JSON.stringify({ a: 1 }));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 77, title: "ObjJson" }], [])
    );
    generateArticleBySourceId.mockResolvedValueOnce({
      data: { title: "T", article: "A" },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("button.btn-outline-success").trigger("click");
    await flushPromises();
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toEqual([
      "77",
    ]);
  });

  it("deleteArticle catch path alerts failure when removal throws", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "Boom" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    // Override filter ONLY on the reactive source array so the deletion call
    // throws inside deleteArticle's try (other arrays' filter is untouched).
    const arr = wrapper.vm.sourceArticles;
    const realFilter = arr.filter.bind(arr);
    Object.defineProperty(arr, "filter", {
      configurable: true,
      value: () => {
        throw new Error("filter boom");
      },
    });
    await wrapper.find("button.btn-outline-danger").trigger("click");
    await flushPromises();
    // restore so later renders work
    Object.defineProperty(arr, "filter", {
      configurable: true,
      value: realFilter,
    });
    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete article. Please try again later."
    );
  });

  it("convertSelectedArticles returns early when invoked with empty selection", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1, title: "C1" }], [])
    );
    const wrapper = mountView();
    await flushPromises();
    // selection is empty -> invoking the handler directly hits the length===0 return
    expect(wrapper.vm.selectedArticles).toEqual([]);
    await wrapper.vm.convertSelectedArticles();
    await flushPromises();
    expect(generateArticlesBySourceIds).not.toHaveBeenCalled();
    expect(generateArticleBySourceId).not.toHaveBeenCalled();
  });

  it("convert multiple: undefined sourceId & duplicate additional IDs (else branches)", async () => {
    // Articles without ids -> selectedIds = [undefined, undefined]
    // selectedIds[0] undefined -> L694 if false; additional contains undefined too.
    // Pre-seed saved IDs with the stringified additional id so push is skipped (L702 else).
    localStorage.setItem(
      "savedSourceArticleIds",
      JSON.stringify(["undefined"])
    );
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { url: "https://x1", title: "U1" },
          { url: "https://x2", title: "U2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: [{ title: "Ok", article: "A" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(generateArticlesBySourceIds).toHaveBeenCalledWith(
      [undefined, undefined],
      "minimax"
    );
    const ids = JSON.parse(localStorage.getItem("savedSourceArticleIds"));
    // "undefined" not duplicated
    expect(ids.filter((x) => x === "undefined").length).toBe(1);
  });

  it("convert multiple: primary and additional IDs already saved skip duplicate pushes (L696 & L702 else)", async () => {
    // Both IDs already saved so they render (fetch filter keeps both) AND, at
    // persist time, both the primary (L696) and additional (L702) push are skipped.
    localStorage.setItem("savedSourceArticleIds", JSON.stringify(["1", "2"]));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "P1" },
          { id: 2, title: "P2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: [{ title: "Ok", article: "A" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    expect(wrapper.text()).toContain("2 selected");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    const ids = JSON.parse(localStorage.getItem("savedSourceArticleIds"));
    // neither id duplicated
    expect(ids.filter((x) => x === "1").length).toBe(1);
    expect(ids.filter((x) => x === "2").length).toBe(1);
  });

  it("convert multiple: saved IDs parse to a non-array -> reset to [] (L693 else)", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify({ obj: true }));
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "O1" },
          { id: 2, title: "O2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: [{ title: "Ok", article: "A" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toEqual([
      "1",
      "2",
    ]);
  });

  it("convert multiple: data.items key and null response coalescing", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "I1" },
          { id: 2, title: "I2" },
        ],
        []
      )
    );
    // response with no .data and items key -> articlesArray = data.items
    generateArticlesBySourceIds.mockResolvedValueOnce({
      items: [{ title: "ItemsBatch", article: "A" }],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("ItemsBatch");
  });

  it("convert multiple: data.sourceArticles key feeds articlesArray", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "S1" },
          { id: 2, title: "S2" },
        ],
        []
      )
    );
    generateArticlesBySourceIds.mockResolvedValueOnce({
      data: { sourceArticles: [{ title: "SaBatch", article: "A" }] },
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("SaBatch");
  });

  it("convert multiple: 'minimax' default provider and '' title when nothing available (L657 & L676)", async () => {
    // both source articles have NO title -> first.title/Title:/article?.title falsy -> ''
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse([{ id: 1 }, { id: 2 }], [])
    );
    getSourceArticlesByProvider.mockResolvedValue(
      defaultProviderResponse([{ id: 1 }, { id: 2 }], [])
    );
    // response is null -> data = {} (L666 ?? {}), articlesArray = [] (L670 || [])
    generateArticlesBySourceIds.mockResolvedValueOnce(null);
    const wrapper = mountView();
    await flushPromises();
    // empty provider so convert falls back to 'minimax' (L657 || 'minimax')
    wrapper.vm.selectedProvider = "";
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    expect(generateArticlesBySourceIds).toHaveBeenCalledWith([1, 2], "minimax");
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("");
    expect(stored.content).toBe("STRIP()");
  });

  it("convert multiple: falsy (0) response makes first fall back to {} (L672 data||{})", async () => {
    getSourceArticlesByProvider.mockResolvedValueOnce(
      defaultProviderResponse(
        [
          { id: 1, title: "Z1" },
          { id: 2, title: "Z2" },
        ],
        []
      )
    );
    // response resolves to 0 -> data = 0 (?? keeps 0); articlesArray = [] (|| []);
    // first = (data || {}) = {} -> title falls back to article?.title "Z1"
    generateArticlesBySourceIds.mockResolvedValueOnce(0);
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find("#selectAll").trigger("change");
    const convertBtn = wrapper
      .findAll("button.btn-success")
      .find((b) => b.text().includes("Convert Selected"));
    await convertBtn.trigger("click");
    await flushPromises();
    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.title).toBe("Z1");
  });

  it("fetch directArray path falls back to root.tasks (L354 consequent)", async () => {
    // root = response.data ; root.data is a non-array object -> container = root.data.
    // directArray comes from container.data (an array). container has no tasks, but
    // root.tasks IS an array -> taskList = root.tasks (branch 19[0]).
    getSourceArticlesByProvider.mockResolvedValueOnce({
      data: {
        data: { data: [{ id: 1, title: "DirRootTasks" }] },
        tasks: [{ taskId: "drt", prompt: "p", articleCount: 1 }],
      },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("DirRootTasks");
    expect(wrapper.text()).toContain("drt");
  });
});

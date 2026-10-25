import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

// Hoisted mock state (vi.mock factories are hoisted above imports).
const h = vi.hoisted(() => {
  const modalShow = vi.fn();
  const modalHide = vi.fn();
  const ModalCtor = vi.fn(function () {
    this.show = modalShow;
    this.hide = modalHide;
  });
  return {
    modalShow,
    modalHide,
    ModalCtor,
    generateArticleWithMetadata: vi.fn(),
    getSourceArticlesFromAllTasks: vi.fn(),
    generateArticleBySourceId: vi.fn(),
    swalFire: vi.fn(),
  };
});
const {
  modalShow,
  modalHide,
  ModalCtor,
  generateArticleWithMetadata,
  getSourceArticlesFromAllTasks,
  generateArticleBySourceId,
  swalFire,
} = h;

// --- Mock bootstrap Modal ---
vi.mock("bootstrap", () => ({
  Modal: h.ModalCtor,
}));

// --- Mock the articles service (covers both static and dynamic imports) ---
vi.mock("@/features/articles/ArticlesService", () => ({
  generateArticleWithMetadata: (...a) => h.generateArticleWithMetadata(...a),
  getSourceArticlesFromAllTasks: (...a) => h.getSourceArticlesFromAllTasks(...a),
  generateArticleBySourceId: (...a) => h.generateArticleBySourceId(...a),
}));

// --- Mock sweetalert2 ---
vi.mock("sweetalert2", () => ({
  default: { fire: (...a) => h.swalFire(...a) },
}));

import ArticlePromptModal from "@/components/ArticlePromptModal.vue";

const flush = async () => {
  // Several microtask turns to settle promises (incl. dynamic import()) and
  // the Vue render queue.
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
    await nextTick();
  }
};

function mountModal(props = {}) {
  return mount(ArticlePromptModal, {
    props,
    attachTo: document.body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Re-wire the Modal ctor instance methods after clearAllMocks reset them.
  ModalCtor.mockImplementation(function () {
    this.show = modalShow;
    this.hide = modalHide;
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ArticlePromptModal", () => {
  it("mounts, initializes the modal, and renders both tabs", () => {
    const wrapper = mountModal();
    // initModal found the element and constructed a Modal
    expect(ModalCtor).toHaveBeenCalledTimes(1);
    expect(wrapper.find("#prompt-tab").exists()).toBe(true);
    expect(wrapper.find("#source-tab").exists()).toBe(true);
    // show prop default false -> showModal NOT called on mount
    expect(modalShow).not.toHaveBeenCalled();
  });

  it("shows the modal on mount when show prop is true", () => {
    mountModal({ show: true });
    expect(modalShow).toHaveBeenCalledTimes(1);
  });

  it("covers initModal branch where the modal element is missing", () => {
    // Stub getElementById to return null so the if(modalElement) branch is false.
    const spy = vi
      .spyOn(document, "getElementById")
      .mockReturnValue(null);
    mountModal();
    expect(ModalCtor).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("disables the generate button until the prompt has content", async () => {
    const wrapper = mountModal();
    const btn = wrapper.find(".btn-primary");
    expect(btn.attributes("disabled")).toBeDefined();
    await wrapper.find("#articlePrompt").setValue("  hello topic  ");
    expect(btn.attributes("disabled")).toBeUndefined();
    // whitespace-only keeps it disabled (covers .trim() falsy branch)
    await wrapper.find("#articlePrompt").setValue("    ");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("generateArticle early-returns when prompt is blank", async () => {
    const wrapper = mountModal();
    // prompt is whitespace -> guard !prompt.value.trim() is truthy -> early return.
    await wrapper.find("#articlePrompt").setValue("   ");
    const btn = wrapper.find(".btn-primary");
    // Button is disabled by the same condition; force-enable in the DOM so the
    // click handler runs and exercises the early-return guard line.
    btn.element.removeAttribute("disabled");
    await btn.trigger("click");
    await flush();
    expect(generateArticleWithMetadata).not.toHaveBeenCalled();
    // isLoading was never set -> no spinner, idle text remains.
    expect(wrapper.find(".btn-primary").text()).toContain("Generate Article");
  });

  it("generates an article successfully, hides the modal and emits", async () => {
    let resolveGen;
    generateArticleWithMetadata.mockReturnValue(
      new Promise((r) => (resolveGen = r))
    );
    const wrapper = mountModal();
    await wrapper.find("#articlePrompt").setValue("space exploration");
    // While generating, isLoading flips -> spinner + 'Generating...' text branch
    const btn = wrapper.find(".btn-primary");
    await btn.trigger("click");
    await nextTick();
    // mid-flight (promise not yet resolved): isLoading true
    expect(wrapper.find(".btn-primary .spinner-border").exists()).toBe(true);
    expect(wrapper.find(".btn-primary").text()).toContain("Generating...");
    resolveGen({ data: { id: 7, title: "T" } });
    await flush();
    expect(generateArticleWithMetadata).toHaveBeenCalledWith("space exploration");
    expect(modalHide).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("article-generated")[0]).toEqual([{ id: 7, title: "T" }]);
    // back to idle text branch
    expect(wrapper.find(".btn-primary").text()).toContain("Generate Article");
  });

  it("handles generateArticle failure with a Swal error", async () => {
    generateArticleWithMetadata.mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountModal();
    await wrapper.find("#articlePrompt").setValue("topic");
    await wrapper.find(".btn-primary").trigger("click");
    await flush();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
    expect(modalHide).not.toHaveBeenCalled();
    expect(wrapper.emitted("article-generated")).toBeUndefined();
    errSpy.mockRestore();
  });

  it("loadSourceArticles shows loading then empty state", async () => {
    let resolveFn;
    getSourceArticlesFromAllTasks.mockReturnValue(
      new Promise((r) => (resolveFn = r))
    );
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await nextTick();
    // loading branch
    expect(wrapper.find(".spinner-border.text-primary").exists()).toBe(true);
    resolveFn({ data: { sourceArticles: [] } });
    await flush();
    // empty branch (no articles)
    expect(wrapper.text()).toContain("No source articles found");
  });

  it("loadSourceArticles populates the table and only loads once", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: {
        sourceArticles: [
          {
            id: 1,
            title: "Alpha",
            platform: "Web",
            author: "Jane",
            createdAt: "2024-01-15T00:00:00Z",
          },
          // second article exercises the field-fallback branches:
          { id: 2, title: "Beta", source: "RSS", createdAt: null },
        ],
      },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    expect(getSourceArticlesFromAllTasks).toHaveBeenCalledTimes(1);
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    // platform present
    expect(rows[0].text()).toContain("Web");
    // platform absent -> source used; author absent -> 'Unknown'; date null -> 'N/A'
    expect(rows[1].text()).toContain("RSS");
    expect(rows[1].text()).toContain("Unknown");
    expect(rows[1].text()).toContain("N/A");
    // formatted date present for the first row
    expect(rows[0].text()).toMatch(/Jan 1[45], 2024/);

    // Click source tab again -> early return (already loaded), no extra call.
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    expect(getSourceArticlesFromAllTasks).toHaveBeenCalledTimes(1);
  });

  it("covers the 'Unknown' platform fallback when neither platform nor source exist", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 9, title: "NoPlatform" }] },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    const row = wrapper.find("tbody tr");
    // platform || source || 'Unknown' -> all falsy -> 'Unknown'
    expect(row.text()).toContain("Unknown");
  });

  it("loadSourceArticles handles a response with no data shape (defaults to [])", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue(undefined);
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    expect(wrapper.text()).toContain("No source articles found");
  });

  it("filters source articles using saved IDs from localStorage", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify(["2"]));
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: {
        sourceArticles: [
          { id: 1, title: "Keep out" },
          { id: 2, title: "Keep in" },
          { title: "No id field" }, // a?.id === undefined -> excluded
        ],
      },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain("Keep in");
  });

  it("ignores malformed localStorage saved IDs (JSON throws / non-array)", async () => {
    // invalid JSON -> inner try/catch swallows; savedIds stays []
    localStorage.setItem("savedSourceArticleIds", "{not-json");
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 1, title: "Shown" }] },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });

  it("ignores non-array saved IDs (parsed is not an array)", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify({ a: 1 }));
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 1, title: "Shown" }] },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });

  it("shows the error state when loadSourceArticles rejects", async () => {
    getSourceArticlesFromAllTasks.mockRejectedValue(new Error("net"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    expect(wrapper.find(".alert.alert-danger").text()).toContain(
      "Failed to load source articles"
    );
    errSpy.mockRestore();
  });

  it("selects a source article and enables the create button", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 5, title: "Pick me" }] },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    const createBtn = wrapper.find(".btn-success");
    expect(createBtn.attributes("disabled")).toBeDefined();
    await wrapper.find('input[type="radio"]').trigger("change");
    expect(createBtn.attributes("disabled")).toBeUndefined();
    // radio reflects selection
    expect(wrapper.find('input[type="radio"]').element.checked).toBe(true);
  });

  it("createFromSourceArticle: success path emits, hides modal and persists ID", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 42, title: "Source" }] },
    });
    let resolveCreate;
    generateArticleBySourceId.mockReturnValue(
      new Promise((r) => (resolveCreate = r))
    );
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    // change provider to cover v-model + non-default branch (selectedProvider truthy)
    await wrapper.find("select").setValue("gemini");
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await nextTick();
    // mid-flight loading text branch for the success button
    expect(wrapper.find(".btn-success").text()).toContain("Creating...");
    resolveCreate({ data: { id: 100, title: "Made" } });
    await flush();
    expect(generateArticleBySourceId).toHaveBeenCalledWith(42, "gemini");
    expect(modalHide).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("article-generated")[0]).toEqual([{ id: 100, title: "Made" }]);
    // persisted to localStorage
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toEqual(["42"]);
  });

  it("createFromSourceArticle: falls back to 'gpt' when provider is empty", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 11, title: "Src" }] },
    });
    generateArticleBySourceId.mockResolvedValue({ data: {} });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    // Force selectedProvider to a falsy value to exercise the `|| 'gpt'` branch.
    // The native <select> has no empty option, so set the bound value directly
    // on the element and emit change to update the v-model.
    const select = wrapper.find("select");
    select.element.value = "";
    await select.trigger("change");
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    expect(generateArticleBySourceId).toHaveBeenCalledWith(11, "gpt");
  });

  it("createFromSourceArticle: early-returns when nothing selected", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 1, title: "X" }] },
    });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    const btn = wrapper.find(".btn-success");
    // No selection -> guard !selectedSourceArticle.value is truthy -> early return.
    // Button is disabled by the same condition; force-enable so the handler runs.
    btn.element.removeAttribute("disabled");
    await btn.trigger("click");
    await flush();
    expect(generateArticleBySourceId).not.toHaveBeenCalled();
    // isLoading untouched -> idle button text.
    expect(wrapper.find(".btn-success").text()).toContain(
      "Create Article from Selected Source"
    );
  });

  it("createFromSourceArticle: handles response with no .data (uses response itself)", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 8, title: "Src" }] },
    });
    // response has no .data property -> articleData = response
    generateArticleBySourceId.mockResolvedValue({ foo: "bar" });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    expect(wrapper.emitted("article-generated")[0]).toEqual([{ foo: "bar" }]);
  });

  it("createFromSourceArticle: response null/undefined falls back to {}", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 8, title: "Src" }] },
    });
    generateArticleBySourceId.mockResolvedValue(null);
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    expect(wrapper.emitted("article-generated")[0]).toEqual([{}]);
  });

  it("createFromSourceArticle: appends to existing saved IDs without duplicating", async () => {
    localStorage.setItem("savedSourceArticleIds", JSON.stringify(["99"]));
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 99, title: "Already saved" }] },
    });
    generateArticleBySourceId.mockResolvedValue({ data: {} });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    // id 99 already present -> not pushed again (covers includes() true branch)
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toEqual(["99"]);
  });

  it("createFromSourceArticle: persist handles non-array existing value and null id", async () => {
    // existing value parses to a non-array -> next = [] branch
    localStorage.setItem("savedSourceArticleIds", JSON.stringify({ not: "array" }));
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: null, title: "Null id" }] },
    });
    generateArticleBySourceId.mockResolvedValue({ data: {} });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    // id is null -> not pushed; non-array existing -> next becomes []
    expect(JSON.parse(localStorage.getItem("savedSourceArticleIds"))).toEqual([]);
  });

  it("createFromSourceArticle: handles failure with a Swal error and resets loading", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 3, title: "Src" }] },
    });
    generateArticleBySourceId.mockRejectedValue(new Error("fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    expect(swalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error!", icon: "error" })
    );
    expect(modalHide).not.toHaveBeenCalled();
    // loading reset -> button enabled again, idle text
    expect(wrapper.find(".btn-success").text()).toContain(
      "Create Article from Selected Source"
    );
    errSpy.mockRestore();
  });

  it("createFromSourceArticle: persist-write failure is swallowed (outer try/catch)", async () => {
    getSourceArticlesFromAllTasks.mockResolvedValue({
      data: { sourceArticles: [{ id: 7, title: "Src" }] },
    });
    generateArticleBySourceId.mockResolvedValue({ data: { ok: true } });
    // Make localStorage.setItem throw to hit the catch around persistence.
    const setSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    const wrapper = mountModal();
    await wrapper.find("#source-tab").trigger("click");
    await flush();
    await wrapper.find('input[type="radio"]').trigger("change");
    await wrapper.find(".btn-success").trigger("click");
    await flush();
    // Despite the persistence throw, the article is still emitted.
    expect(wrapper.emitted("article-generated")[0]).toEqual([{ ok: true }]);
    setSpy.mockRestore();
  });

  it("watch on show prop drives show/hide", async () => {
    const wrapper = mountModal({ show: false });
    expect(modalShow).not.toHaveBeenCalled();
    await wrapper.setProps({ show: true });
    expect(modalShow).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ show: false });
    expect(modalHide).toHaveBeenCalledTimes(1);
  });

  it("emits 'close' when the modal's hidden.bs.modal event is dispatched", () => {
    const wrapper = mountModal();
    const el = document.getElementById("articlePromptModal");
    el.dispatchEvent(new Event("hidden.bs.modal"));
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("showModal/hideModal no-op safely when modalInstance is null (unmount path)", async () => {
    // When element is missing, modalInstance stays null. Toggling show prop then
    // exercises the `if (modalInstance)` false branches in showModal/hideModal.
    const spy = vi.spyOn(document, "getElementById").mockReturnValue(null);
    const wrapper = mountModal({ show: false });
    await wrapper.setProps({ show: true }); // showModal -> instance null branch
    await wrapper.setProps({ show: false }); // hideModal -> instance null branch
    expect(modalShow).not.toHaveBeenCalled();
    expect(modalHide).not.toHaveBeenCalled();
    wrapper.unmount(); // onUnmounted: modalInstance null branch
    spy.mockRestore();
  });

  it("onUnmounted hides the modal and clears the instance when present", () => {
    const wrapper = mountModal();
    expect(ModalCtor).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    // onUnmounted called hideModal() because modalInstance was set
    expect(modalHide).toHaveBeenCalledTimes(1);
  });
});

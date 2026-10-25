import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// vue-router -> useRouter returns a controllable mock
const push = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

// sweetalert2 is imported but only referenced as a heavy dep; stub it out.
vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

// Stub the child modal so we can drive its emitted events without pulling its
// heavy dependency chain (bootstrap/quill/services).
vi.mock("@/components/ArticlePromptModal.vue", () => ({
  default: {
    name: "ArticlePromptModal",
    props: ["show"],
    emits: ["close", "article-generated"],
    template:
      '<div class="stub-modal" :data-show="String(show)">' +
      '<button class="emit-close" @click="$emit(\'close\')"></button>' +
      "</div>",
  },
}));

import ArticlePromptView from "@/views/Admin/Articles/ArticlePromptView.vue";

function mountView() {
  return mount(ArticlePromptView);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("ArticlePromptView.vue", () => {
  it("renders the modal with show=true after mount", () => {
    const wrapper = mountView();

    expect(wrapper.find(".article-prompt-view").exists()).toBe(true);
    const modal = wrapper.findComponent({ name: "ArticlePromptModal" });
    expect(modal.exists()).toBe(true);
    // onMounted sets showModal.value = true (already initialised true).
    expect(modal.props("show")).toBe(true);
    expect(wrapper.find(".stub-modal").attributes("data-show")).toBe("true");
  });

  it("navigates back to the articles list when the modal emits close", async () => {
    const wrapper = mountView();

    await wrapper.find(".emit-close").trigger("click");
    await flushPromises();

    expect(push).toHaveBeenCalledWith("/admin/articles");
  });

  it("stores data and navigates with fromSource when articleData has a sourceId (truthy fields)", async () => {
    const wrapper = mountView();
    const modal = wrapper.findComponent({ name: "ArticlePromptModal" });

    const articleData = {
      sourceId: 42,
      title: "Source Title",
      slug: "source-slug",
      article: "Source body",
      summary: "Source summary",
      sources: [{ id: 1 }],
    };

    modal.vm.$emit("article-generated", articleData);
    await flushPromises();

    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored).toEqual({
      title: "Source Title",
      slug: "source-slug",
      content: "Source body",
      summary: "Source summary",
      sourceId: 42,
      sources: [{ id: 1 }],
    });

    expect(push).toHaveBeenCalledWith({
      path: "/admin/articles/create",
      query: { newArticle: "true", fromSource: "true" },
      state: { articleData: stored },
    });
  });

  it("falls back to empty defaults in the sourceId branch when fields are missing", async () => {
    const wrapper = mountView();
    const modal = wrapper.findComponent({ name: "ArticlePromptModal" });

    // Only sourceId set -> every `|| ''` / `|| []` fallback is exercised.
    modal.vm.$emit("article-generated", { sourceId: 7 });
    await flushPromises();

    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored).toEqual({
      title: "",
      slug: "",
      content: "",
      summary: "",
      sourceId: 7,
      sources: [],
    });

    expect(push).toHaveBeenCalledWith({
      path: "/admin/articles/create",
      query: { newArticle: "true", fromSource: "true" },
      state: { articleData: stored },
    });
  });

  it("stores data and navigates without fromSource when there is no sourceId (with sources)", async () => {
    const wrapper = mountView();
    const modal = wrapper.findComponent({ name: "ArticlePromptModal" });

    const articleData = {
      title: "Prompt Title",
      slug: "prompt-slug",
      article: "Prompt body",
      summary: "Prompt summary",
      sources: [{ id: 9 }],
    };

    modal.vm.$emit("article-generated", articleData);
    await flushPromises();

    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored).toEqual({
      title: "Prompt Title",
      slug: "prompt-slug",
      content: "Prompt body",
      summary: "Prompt summary",
      sources: [{ id: 9 }],
    });

    expect(push).toHaveBeenCalledWith({
      path: "/admin/articles/create",
      query: { newArticle: "true" },
      state: { articleData: stored },
    });
  });

  it("falls back to an empty sources array in the prompt branch when sources is missing", async () => {
    const wrapper = mountView();
    const modal = wrapper.findComponent({ name: "ArticlePromptModal" });

    // No sourceId and no `sources` -> exercises the `sources || []` fallback.
    modal.vm.$emit("article-generated", {
      title: "T",
      slug: "s",
      article: "a",
      summary: "sum",
    });
    await flushPromises();

    const stored = JSON.parse(localStorage.getItem("newArticleData"));
    expect(stored.sources).toEqual([]);
    expect(push).toHaveBeenCalledWith({
      path: "/admin/articles/create",
      query: { newArticle: "true" },
      state: { articleData: stored },
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// ArticlesService -> only getPrompts / updatePrompt are consumed
const getPrompts = vi.fn();
const updatePrompt = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getPrompts: (...args) => getPrompts(...args),
  updatePrompt: (...args) => updatePrompt(...args),
}));

// sweetalert2 -> capture fire() calls
const fire = vi.fn();
vi.mock("sweetalert2", () => ({
  default: { fire: (...args) => fire(...args) },
}));

import PromptManager from "@/views/Admin/Articles/PromptManager.vue";

const PROMPTS = [
  {
    id: 1,
    name: "Article System Prompt",
    type: "system",
    content: "Write a great article.",
    active: true,
  },
  {
    id: 2,
    name: "Thumbnail Prompt",
    type: "thumbnail",
    content: "Make a nice thumbnail.",
    active: false,
  },
];

// Silence the component's console.* diagnostics without asserting on them.
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

async function mountManager() {
  const wrapper = mount(PromptManager);
  await flushPromises();
  return wrapper;
}

describe("PromptManager.vue", () => {
  it("shows the loading spinner while prompts are being fetched (isLoading branch)", async () => {
    let resolveFetch;
    getPrompts.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const wrapper = mount(PromptManager);
    await wrapper.vm.$nextTick();

    // Loading state rendered, content hidden
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading prompts...");
    expect(wrapper.find(".accordion").exists()).toBe(false);
    expect(wrapper.find(".text-muted").exists()).toBe(false);

    resolveFetch({ data: PROMPTS });
    await flushPromises();

    // Loading cleared after resolve
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
  });

  it("renders the empty-state alert when no prompts are returned (prompts.length === 0)", async () => {
    getPrompts.mockResolvedValueOnce({ data: [] });

    const wrapper = await mountManager();

    expect(getPrompts).toHaveBeenCalledTimes(1);
    expect(wrapper.find(".alert.alert-info").exists()).toBe(true);
    expect(wrapper.find(".alert.alert-info").text()).toContain(
      "No prompts found"
    );
    // Accordion not rendered in the empty branch
    expect(wrapper.find(".accordion").exists()).toBe(false);
    // The intro paragraph (v-else of isLoading) is shown
    expect(wrapper.find(".text-muted").text()).toContain(
      "Manage the prompts used for AI-generated articles"
    );
  });

  it("renders an accordion item per prompt, covering both active and inactive badge branches", async () => {
    getPrompts.mockResolvedValueOnce({ data: PROMPTS });

    const wrapper = await mountManager();

    const items = wrapper.findAll(".accordion-item");
    expect(items).toHaveLength(2);

    // Names + types rendered
    expect(items[0].text()).toContain("Article System Prompt");
    expect(items[0].text()).toContain("system");
    expect(items[1].text()).toContain("Thumbnail Prompt");
    expect(items[1].text()).toContain("thumbnail");

    // Active badge branch (prompt.active === true)
    const activeBadge = items[0].find(".badge.bg-success");
    expect(activeBadge.exists()).toBe(true);
    expect(activeBadge.text()).toBe("Active");

    // Inactive badge branch (prompt.active === false)
    const inactiveBadge = items[1].find(".badge.bg-secondary");
    expect(inactiveBadge.exists()).toBe(true);
    expect(inactiveBadge.text()).toBe("Inactive");

    // The empty-state alert is NOT shown when prompts exist
    expect(wrapper.find(".alert.alert-info").exists()).toBe(false);

    // Targets are bound to prompt ids
    expect(items[0].find("button.accordion-button").attributes("data-bs-target")).toBe(
      "#collapse-1"
    );
    expect(items[0].find(".accordion-collapse").attributes("id")).toBe(
      "collapse-1"
    );
  });

  it("fires a SweetAlert error and clears loading when fetchPrompts rejects (catch branch)", async () => {
    getPrompts.mockRejectedValueOnce(new Error("boom"));

    const wrapper = await mountManager();

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching prompts:",
      expect.any(Error)
    );
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error!",
        text: "Failed to load prompts. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      })
    );

    // finally{} ran -> loading cleared, falls through to empty-state branch
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".alert.alert-info").exists()).toBe(true);
  });

  it("saves a prompt successfully: shows the submitting state, calls updatePrompt, alerts success and refetches", async () => {
    getPrompts.mockResolvedValueOnce({ data: PROMPTS });

    const wrapper = await mountManager();

    // Control the in-flight save so we can assert the isSubmitting branch
    let resolveSave;
    updatePrompt.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    // The refetch triggered by a successful save
    getPrompts.mockResolvedValueOnce({ data: PROMPTS });

    const form = wrapper.findAll("form")[0];
    form.trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // isSubmitting === true -> spinner + disabled + "Saving..." on every submit button
    const submitBtn = wrapper.findAll('button[type="submit"]')[0];
    expect(submitBtn.attributes("disabled")).toBeDefined();
    expect(submitBtn.find(".spinner-border-sm").exists()).toBe(true);
    expect(submitBtn.text()).toContain("Saving...");

    resolveSave({});
    await flushPromises();

    // updatePrompt called with id + the prompt object
    expect(updatePrompt).toHaveBeenCalledWith(1, PROMPTS[0]);
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success!",
        text: "Prompt updated successfully.",
        icon: "success",
        confirmButtonText: "OK",
      })
    );
    // Refetch happened (initial + refresh)
    expect(getPrompts).toHaveBeenCalledTimes(2);

    // isSubmitting reset -> button enabled and back to "Save Changes"
    const submitAfter = wrapper.findAll('button[type="submit"]')[0];
    expect(submitAfter.attributes("disabled")).toBeUndefined();
    expect(submitAfter.text()).toContain("Save Changes");
  });

  it("fires a SweetAlert error and resets submitting when savePrompt rejects (catch branch)", async () => {
    getPrompts.mockResolvedValueOnce({ data: PROMPTS });

    const wrapper = await mountManager();

    updatePrompt.mockRejectedValueOnce(new Error("save failed"));

    await wrapper.findAll("form")[1].trigger("submit.prevent");
    await flushPromises();

    expect(updatePrompt).toHaveBeenCalledWith(2, PROMPTS[1]);
    expect(console.error).toHaveBeenCalledWith(
      "Error updating prompt:",
      expect.any(Error)
    );
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error!",
        text: "Failed to update prompt. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      })
    );

    // No refetch on the failure path (only the initial fetch ran)
    expect(getPrompts).toHaveBeenCalledTimes(1);

    // finally{} reset isSubmitting -> button enabled again
    const submitBtn = wrapper.findAll('button[type="submit"]')[1];
    expect(submitBtn.attributes("disabled")).toBeUndefined();
    expect(submitBtn.text()).toContain("Save Changes");
  });

  it("keeps form fields bound via v-model (name, type, content, active)", async () => {
    getPrompts.mockResolvedValueOnce({ data: PROMPTS });

    const wrapper = await mountManager();

    const firstItem = wrapper.findAll(".accordion-item")[0];
    expect(firstItem.find('input[type="text"]').element.value).toBe(
      "Article System Prompt"
    );
    expect(firstItem.find("select").element.value).toBe("system");
    expect(firstItem.find("textarea").element.value).toBe(
      "Write a great article."
    );
    expect(firstItem.find('input[type="checkbox"]').element.checked).toBe(true);

    // Exercise the v-model write path on every bound field. istanbul
    // instruments each inline v-model update handler as its own function, so
    // they must each be invoked by emitting an input/change event. The name
    // input and type select are `disabled`; we set the element value then
    // dispatch the native event so the bound update handler runs and writes
    // back to the reactive prompt object.
    const nameInput = firstItem.find('input[type="text"]');
    nameInput.element.value = "Renamed Prompt";
    nameInput.element.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();
    expect(PROMPTS[0].name).toBe("Renamed Prompt");

    const typeSelect = firstItem.find("select");
    typeSelect.element.value = "user";
    typeSelect.element.dispatchEvent(new Event("change"));
    await wrapper.vm.$nextTick();
    expect(PROMPTS[0].type).toBe("user");

    await firstItem.find("textarea").setValue("Updated content body.");
    expect(PROMPTS[0].content).toBe("Updated content body.");

    await firstItem.find('input[type="checkbox"]').setValue(false);
    expect(PROMPTS[0].active).toBe(false);

    // restore for isolation across tests
    PROMPTS[0].name = "Article System Prompt";
    PROMPTS[0].type = "system";
    PROMPTS[0].content = "Write a great article.";
    PROMPTS[0].active = true;
  });
});

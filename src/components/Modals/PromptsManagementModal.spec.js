import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

// --- Mock bootstrap's Modal so we control the instance and can assert calls ---
const { modalShow, modalHide, modalDispose, ModalCtor } = vi.hoisted(() => {
  const modalShow = vi.fn();
  const modalHide = vi.fn();
  const modalDispose = vi.fn();
  const ModalCtor = vi.fn(function (el) {
    this.el = el;
    this.show = modalShow;
    this.hide = modalHide;
    this.dispose = modalDispose;
  });
  return { modalShow, modalHide, modalDispose, ModalCtor };
});

vi.mock("bootstrap", () => ({
  Modal: ModalCtor,
}));

import PromptsManagementModal from "./PromptsManagementModal.vue";

const samplePrompts = [
  {
    id: 1,
    name: "System Prompt",
    type: "system",
    content: "You are helpful.",
    active: true,
  },
  {
    id: 2,
    name: "Thumb Prompt",
    type: "thumbnail",
    content: "Make a thumbnail",
    active: false,
  },
];

function factory(props = {}) {
  return mount(PromptsManagementModal, {
    props,
    attachTo: document.body,
  });
}

beforeEach(() => {
  modalShow.mockClear();
  modalHide.mockClear();
  modalDispose.mockClear();
  ModalCtor.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PromptsManagementModal", () => {
  it("constructs a bootstrap Modal on mount and registers event listeners", () => {
    const wrapper = factory();
    // onMounted: modalRef.value truthy -> Modal constructed
    expect(ModalCtor).toHaveBeenCalledTimes(1);
    expect(ModalCtor).toHaveBeenCalledWith(wrapper.find("#promptsModal").element);
    wrapper.unmount();
  });

  it("shows the loading spinner branch when isLoadingPrompts is true", () => {
    const wrapper = factory({ isLoadingPrompts: true, promptsList: samplePrompts });
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading prompts...");
    // The else branch content must NOT render
    expect(wrapper.find("#promptsAccordion").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows the empty-state alert when there are no prompts (v-for empty branch)", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: [] });
    const alert = wrapper.find(".alert.alert-info");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("No prompts found");
    expect(wrapper.find("#promptsAccordion").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders the accordion with all prompts and active/inactive + thumbnail branches", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });

    const items = wrapper.findAll(".accordion-item");
    expect(items.length).toBe(2);

    // prompt 1: active=true => bg-success + "Active"
    const badge1 = items[0].findAll(".badge")[1];
    expect(badge1.classes()).toContain("bg-success");
    expect(badge1.text()).toBe("Active");

    // prompt 2: active=false => bg-secondary + "Inactive"
    const badge2 = items[1].findAll(".badge")[1];
    expect(badge2.classes()).toContain("bg-secondary");
    expect(badge2.text()).toBe("Inactive");

    // type badge text
    expect(items[0].find(".badge.bg-primary").text()).toBe("system");

    // thumbnail hint only on the thumbnail prompt (v-if prompt.type === 'thumbnail')
    expect(items[0].find("small.text-muted").exists()).toBe(false);
    expect(items[1].find("small.text-muted").exists()).toBe(true);
    expect(items[1].find("small.text-muted").text()).toContain("placeholders");

    wrapper.unmount();
  });

  it("shows the saving spinner + disabled button when isSubmittingPrompt is true", () => {
    const wrapper = factory({
      isLoadingPrompts: false,
      promptsList: samplePrompts,
      isSubmittingPrompt: true,
    });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes("disabled")).toBeDefined();
    expect(submitBtn.find(".spinner-border-sm").exists()).toBe(true);
    expect(submitBtn.text()).toContain("Saving...");
    wrapper.unmount();
  });

  it("shows 'Save Changes' and enabled button when isSubmittingPrompt is false", () => {
    const wrapper = factory({
      isLoadingPrompts: false,
      promptsList: samplePrompts,
      isSubmittingPrompt: false,
    });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes("disabled")).toBeUndefined();
    expect(submitBtn.find(".spinner-border-sm").exists()).toBe(false);
    expect(submitBtn.text()).toContain("Save Changes");
    wrapper.unmount();
  });

  it("emits save-prompt with the prompt when the form is submitted", async () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    await wrapper.findAll("form")[0].trigger("submit.prevent");
    expect(wrapper.emitted("save-prompt")).toBeTruthy();
    expect(wrapper.emitted("save-prompt")[0][0]).toMatchObject({ id: 1, name: "System Prompt" });
    wrapper.unmount();
  });

  it("binds all v-model fields (name, type, content, active) to local prompt state", async () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    const form = wrapper.findAll("form")[0];

    await form.find('input[type="text"]').setValue("Renamed");
    await form.find("select").setValue("user");
    await form.find("textarea").setValue("New content body");
    const checkbox = form.find('input[type="checkbox"]');
    await checkbox.setValue(false); // toggle active off (was true)

    // Submitting emits the locally-bound, edited prompt object
    await form.trigger("submit.prevent");
    const saved = wrapper.emitted("save-prompt")[0][0];
    expect(saved.name).toBe("Renamed");
    expect(saved.type).toBe("user");
    expect(saved.content).toBe("New content body");
    expect(saved.active).toBe(false);
    wrapper.unmount();
  });

  it("hides the modal when the header close button is clicked (handleClose -> hide)", async () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    await wrapper.find(".btn-close").trigger("click");
    expect(modalHide).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("hides the modal when the footer Close button is clicked", async () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    await wrapper.find(".modal-footer .btn-secondary").trigger("click");
    expect(modalHide).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("show() emits fetch-prompts and calls modalInstance.show() when list is empty", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: [] });
    wrapper.vm.show();
    expect(wrapper.emitted("fetch-prompts")).toBeTruthy();
    expect(modalShow).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("show() does NOT emit fetch-prompts when list is non-empty", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    wrapper.vm.show();
    expect(wrapper.emitted("fetch-prompts")).toBeFalsy();
    expect(modalShow).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("hide() calls modalInstance.hide()", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    wrapper.vm.hide();
    expect(modalHide).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("emits 'show' on shown.bs.modal and 'close' on hidden.bs.modal", async () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    const el = wrapper.find("#promptsModal").element;

    el.dispatchEvent(new Event("shown.bs.modal"));
    el.dispatchEvent(new Event("hidden.bs.modal"));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("show")).toBeTruthy();
    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("disposes the modal on unmount when an instance exists", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    wrapper.unmount();
    expect(modalDispose).toHaveBeenCalledTimes(1);
  });

  it("skips dispose on unmount when there is no modal instance (false branch)", () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    // Force the modalInstance ref to null via the setup-state proxy so the
    // `if (modalInstance.value)` guard takes its false branch on unmount.
    wrapper.vm.$.setupState.modalInstance = null;
    wrapper.unmount();
    expect(modalDispose).not.toHaveBeenCalled();
  });

  it("deep-copies promptsList into local state via the immediate+deep watcher", async () => {
    const wrapper = factory({ isLoadingPrompts: false, promptsList: samplePrompts });
    // Mutating local copy should not affect the original prop object
    const input = wrapper.find('input[type="text"]');
    await input.setValue("Edited Name");
    expect(samplePrompts[0].name).toBe("System Prompt");

    // Re-trigger the watcher by updating the prop -> exercises watcher callback again
    const next = [{ id: 9, name: "New", type: "user", content: "x", active: true }];
    await wrapper.setProps({ promptsList: next });
    expect(wrapper.findAll(".accordion-item").length).toBe(1);
    expect(wrapper.find(".accordion-item .me-auto").text()).toBe("New");
    wrapper.unmount();
  });
});

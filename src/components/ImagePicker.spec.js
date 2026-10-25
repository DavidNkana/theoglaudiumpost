import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the lazily-imported util used in the designHelp branch.
const processImageForAd = vi.fn();
vi.mock("@/utils/index.js", () => ({
  processImageForAd: (...args) => processImageForAd(...args),
}));

import ImagePicker from "@/components/ImagePicker.vue";

function mountCmp(props = {}) {
  return mount(ImagePicker, { props });
}

// Build a fake <input type=file> change event whose target.files[0] is `file`.
function changeEvent(file) {
  return { target: { files: file === undefined ? [] : [file] } };
}

describe("ImagePicker", () => {
  beforeEach(() => {
    processImageForAd.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the file input when there is no preview (default required=true)", () => {
    const wrapper = mountCmp();
    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
    // isRequired defaults to true -> required attribute present.
    expect(input.attributes("required")).toBeDefined();
    // No preview branch.
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("omits the required attribute when isRequired is false", () => {
    const wrapper = mountCmp({ isRequired: false });
    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes("required")).toBeUndefined();
  });

  it("immediate watcher sets previewUrl from a truthy initialImage prop", () => {
    const wrapper = mountCmp({ initialImage: "https://example.com/a.jpg" });
    // v-else branch: preview img + remove button shown, file input hidden.
    expect(wrapper.find('input[type="file"]').exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.com/a.jpg");
    expect(wrapper.find('button[aria-label="Remove image"]').exists()).toBe(true);
  });

  it("immediate watcher keeps previewUrl null when initialImage is falsy", () => {
    const wrapper = mountCmp({ initialImage: "" });
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("watcher reacts to initialImage changes: set then clear", async () => {
    const wrapper = mountCmp({ initialImage: "" });
    // newVal truthy branch
    await wrapper.setProps({ initialImage: "https://example.com/b.png" });
    expect(wrapper.find("img").attributes("src")).toBe("https://example.com/b.png");
    // newVal falsy branch (else)
    await wrapper.setProps({ initialImage: null });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });

  it("handleImage returns early when no file is selected", async () => {
    const wrapper = mountCmp();
    await wrapper.vm.handleImage(changeEvent(undefined));
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("edit")).toBeUndefined();
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("designHelp branch: processImageForAd success sets preview and emits", async () => {
    processImageForAd.mockResolvedValue("data:image/png;base64,CROPPED");
    const wrapper = mountCmp({ designHelp: true, aspectRatio: "9:16" });

    const file = new File(["x"], "pic.png", { type: "image/png" });
    await wrapper.vm.handleImage(changeEvent(file));
    await flushPromises();

    expect(processImageForAd).toHaveBeenCalledWith(file, "9:16", { quality: 0.9 });
    expect(wrapper.find("img").attributes("src")).toBe(
      "data:image/png;base64,CROPPED"
    );
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([
      "data:image/png;base64,CROPPED",
    ]);
    expect(wrapper.emitted("edit")[0]).toEqual([true]);
  });

  it("designHelp branch: catch falls back to FileReader path when processing fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = new Error("crop failed");
    processImageForAd.mockRejectedValue(failure);

    const wrapper = mountCmp({ designHelp: true, aspectRatio: "1:1" });

    const file = new File(["x"], "pic.png", { type: "image/png" });
    await wrapper.vm.handleImage(changeEvent(file));
    await flushPromises();

    expect(warnSpy).toHaveBeenCalledWith(
      "Image processing failed, using original",
      failure
    );
    // FileReader path runs after the catch; wait for its onload.
    await flushPromises();
    await vi.waitFor(() => {
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    });
    expect(wrapper.emitted("edit")[0]).toEqual([true]);
    expect(wrapper.find("img").exists()).toBe(true);
  });

  it("FileReader path (no designHelp): sets preview and emits on load", async () => {
    const wrapper = mountCmp();
    const file = new File(["hello"], "pic.png", { type: "image/png" });
    await wrapper.vm.handleImage(changeEvent(file));

    await vi.waitFor(() => {
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    });
    const emitted = wrapper.emitted("update:modelValue")[0][0];
    expect(typeof emitted).toBe("string");
    expect(emitted.startsWith("data:")).toBe(true);
    expect(wrapper.emitted("edit")[0]).toEqual([true]);
    await flushPromises();
    expect(wrapper.find("img").attributes("src")).toBe(emitted);
  });

  it("designHelp false: skips processing and uses FileReader (real change event)", async () => {
    const wrapper = mountCmp();
    const input = wrapper.find('input[type="file"]');
    const file = new File(["data"], "pic.png", { type: "image/png" });
    // Define files on the actual input element and trigger a DOM change.
    Object.defineProperty(input.element, "files", {
      value: [file],
      configurable: true,
    });
    await input.trigger("change");

    await vi.waitFor(() => {
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    });
    expect(processImageForAd).not.toHaveBeenCalled();
  });

  it("removeImage clears the preview and emits remove + null model", async () => {
    const wrapper = mountCmp({ initialImage: "https://example.com/c.jpg" });
    // Preview shown; click the remove button.
    await wrapper.find('button[aria-label="Remove image"]').trigger("click");

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([null]);
    expect(wrapper.emitted("remove")).toHaveLength(1);
  });
});

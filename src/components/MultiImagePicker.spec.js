import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* Mock the only external boundary: @/utils -> processImageForAd       */
/* ------------------------------------------------------------------ */
vi.mock("@/utils", () => ({
  processImageForAd: vi.fn(),
}));

import { processImageForAd } from "@/utils";
import MultiImagePicker from "@/components/MultiImagePicker.vue";

/* ------------------------------------------------------------------ */
/* FileReader stub so readFileAsDataURL resolves deterministically.     */
/* The component creates `new FileReader()`, sets onload, then calls    */
/* readAsDataURL — our stub fires onload synchronously with reader.result.*/
/* ------------------------------------------------------------------ */
class FakeFileReader {
  constructor() {
    this.onload = null;
    this.result = null;
  }
  readAsDataURL(file) {
    this.result = `data:fake/${file.name}`;
    // Fire asynchronously to mimic real behaviour and let the Promise settle.
    Promise.resolve().then(() => {
      if (this.onload) this.onload();
    });
  }
}

const makeFile = (name) => new File(["x"], name, { type: "image/png" });

// Build a fake change event with a given list of files.
const changeEvent = (files) => ({ target: { files } });

beforeEach(() => {
  vi.clearAllMocks();
  global.FileReader = FakeFileReader;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MultiImagePicker.vue", () => {
  /* --------------------------------------------------------------- */
  /* Rendering / template branches                                    */
  /* --------------------------------------------------------------- */
  it("renders the file input only (no previews) when there are no images, and applies required by default", () => {
    const wrapper = mount(MultiImagePicker);

    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
    // hasImages === false -> the d-none class is NOT applied (ternary else '')
    expect(input.classes()).not.toContain("d-none");
    // isRequired default true -> required attribute present
    expect(input.attributes("required")).toBeDefined();
    // hasImages === false -> the v-if="hasImages" preview block is absent
    expect(wrapper.find(".my-3").exists()).toBe(false);
    // v-for produces no preview images for an empty list
    expect(wrapper.findAll("img").length).toBe(0);
  });

  it("omits the required attribute when isRequired is false", () => {
    const wrapper = mount(MultiImagePicker, {
      props: { isRequired: false },
    });
    expect(
      wrapper.find('input[type="file"]').attributes("required")
    ).toBeUndefined();
  });

  it("shows previews (v-for non-empty) and hides the input via d-none when initialImages are provided", () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["url-a", "url-b"] },
    });

    // watcher (immediate) populated previewUrls -> hasImages === true
    const imgs = wrapper.findAll("img");
    expect(imgs.length).toBe(2);
    expect(imgs[0].attributes("src")).toBe("url-a");
    expect(imgs[1].attributes("src")).toBe("url-b");

    // d-none class applied to the input when there are images
    expect(wrapper.find('input[type="file"]').classes()).toContain("d-none");
    // preview block is rendered
    expect(wrapper.find(".my-3").exists()).toBe(true);
  });

  /* --------------------------------------------------------------- */
  /* Watcher branches                                                 */
  /* --------------------------------------------------------------- */
  it("watcher resets previews to empty when initialImages becomes empty", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a"] },
    });
    expect(wrapper.findAll("img").length).toBe(1);

    // newVal with length 0 -> else branch -> previewUrls = []
    await wrapper.setProps({ initialImages: [] });
    expect(wrapper.findAll("img").length).toBe(0);
    expect(wrapper.find(".my-3").exists()).toBe(false);
  });

  it("watcher treats a null initialImages as empty (covers the !newVal branch)", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a"] },
    });
    expect(wrapper.findAll("img").length).toBe(1);

    // newVal === null -> the `newVal && ...` short-circuits to else branch
    await wrapper.setProps({ initialImages: null });
    expect(wrapper.findAll("img").length).toBe(0);
  });

  /* --------------------------------------------------------------- */
  /* handleImages — early return                                      */
  /* --------------------------------------------------------------- */
  it("handleImages returns early when files is an empty list (length 0)", async () => {
    const wrapper = mount(MultiImagePicker);

    const input = wrapper.find('input[type="file"]').element;
    Object.defineProperty(input, "files", { value: [], configurable: true });

    // files.length === 0 branch -> early return, no emits
    await wrapper.find('input[type="file"]').trigger("change");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("edit")).toBeUndefined();
  });

  it("handleImages returns early when files is null", async () => {
    const wrapper = mount(MultiImagePicker);
    // Stub files to null to hit the `!files` branch of the early return.
    const input = wrapper.find('input[type="file"]').element;
    Object.defineProperty(input, "files", { value: null, configurable: true });
    await wrapper.find('input[type="file"]').trigger("change");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  /* --------------------------------------------------------------- */
  /* handleImages — designHelp = false (readFileAsDataURL path)       */
  /* --------------------------------------------------------------- */
  it("handleImages without designHelp reads files as data URLs and emits", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { maxImages: 5 },
    });

    const input = wrapper.find('input[type="file"]').element;
    const files = [makeFile("one.png"), makeFile("two.png")];
    Object.defineProperty(input, "files", { value: files, configurable: true });

    await wrapper.find('input[type="file"]').trigger("change");
    await flushPromises();

    expect(processImageForAd).not.toHaveBeenCalled();
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0]).toEqual([
      "data:fake/one.png",
      "data:fake/two.png",
    ]);
    expect(wrapper.emitted("edit")[0]).toEqual([true]);

    // Previews now render
    await flushPromises();
    expect(wrapper.findAll("img").length).toBe(2);
  });

  it("handleImages slices files down to the remaining maxImages allowance", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { maxImages: 1 },
    });

    const input = wrapper.find('input[type="file"]').element;
    const files = [makeFile("a.png"), makeFile("b.png"), makeFile("c.png")];
    Object.defineProperty(input, "files", { value: files, configurable: true });

    await wrapper.find('input[type="file"]').trigger("change");
    await flushPromises();

    const emitted = wrapper.emitted("update:modelValue");
    // maxAllowed = 1 - 0 = 1 -> only the first file is processed
    expect(emitted[emitted.length - 1][0]).toEqual(["data:fake/a.png"]);
  });

  /* --------------------------------------------------------------- */
  /* handleImages — designHelp = true (processImageForAd path)        */
  /* --------------------------------------------------------------- */
  it("handleImages with designHelp processes via processImageForAd using targetWidth 800 for non 1:2 ratio", async () => {
    processImageForAd.mockResolvedValue("processed-data-url");

    const wrapper = mount(MultiImagePicker, {
      props: { designHelp: true, aspectRatio: "4:1" },
    });

    const input = wrapper.find('input[type="file"]').element;
    const files = [makeFile("img.png")];
    Object.defineProperty(input, "files", { value: files, configurable: true });

    await wrapper.find('input[type="file"]').trigger("change");
    await flushPromises();

    expect(processImageForAd).toHaveBeenCalledWith(
      files[0],
      "4:1",
      expect.objectContaining({
        quality: 0.85,
        format: "jpeg",
        fit: "contain",
        backgroundColor: "#ffffff",
        targetWidth: 800,
      })
    );
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[emitted.length - 1][0]).toEqual(["processed-data-url"]);
  });

  it("handleImages with designHelp uses targetWidth 300 for the 1:2 aspect ratio", async () => {
    processImageForAd.mockResolvedValue("ratio-1-2-url");

    const wrapper = mount(MultiImagePicker, {
      props: { designHelp: true, aspectRatio: "1:2" },
    });

    const input = wrapper.find('input[type="file"]').element;
    const files = [makeFile("img.png")];
    Object.defineProperty(input, "files", { value: files, configurable: true });

    await wrapper.find('input[type="file"]').trigger("change");
    await flushPromises();

    expect(processImageForAd).toHaveBeenCalledWith(
      files[0],
      "1:2",
      expect.objectContaining({ targetWidth: 300 })
    );
  });

  it("handleImages falls back to readFileAsDataURL when processImageForAd rejects (catch branch)", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    processImageForAd.mockRejectedValue(new Error("boom"));

    const wrapper = mount(MultiImagePicker, {
      props: { designHelp: true, aspectRatio: "4:1" },
    });

    const input = wrapper.find('input[type="file"]').element;
    const files = [makeFile("fallback.png")];
    Object.defineProperty(input, "files", { value: files, configurable: true });

    await wrapper.find('input[type="file"]').trigger("change");
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error processing image:",
      expect.any(Error)
    );
    // Fell back to the raw data URL from the FileReader
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[emitted.length - 1][0]).toEqual(["data:fake/fallback.png"]);
  });

  /* --------------------------------------------------------------- */
  /* removeImage                                                      */
  /* --------------------------------------------------------------- */
  it("removeImage removes a single image and emits update + remove(index)", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a", "b", "c"] },
    });

    // The second remove button (index 1)
    const removeButtons = wrapper.findAll('button[aria-label="Remove image"]');
    expect(removeButtons.length).toBe(3);
    await removeButtons[1].trigger("click");

    const update = wrapper.emitted("update:modelValue");
    expect(update[update.length - 1][0]).toEqual(["a", "c"]);
    expect(wrapper.emitted("remove")[0]).toEqual([1]);
    expect(wrapper.findAll("img").length).toBe(2);
  });

  /* --------------------------------------------------------------- */
  /* view-image emit                                                  */
  /* --------------------------------------------------------------- */
  it("emits view-image with the index when a preview image is clicked", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a", "b"] },
    });

    await wrapper.findAll("img")[1].trigger("click");
    expect(wrapper.emitted("view-image")[0]).toEqual([1]);
  });

  /* --------------------------------------------------------------- */
  /* removeAllImages — both fileInput branches                        */
  /* --------------------------------------------------------------- */
  it("removeAllImages clears previews, resets the file input, and emits remove('all')", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a", "b"] },
    });

    // fileInput ref is set because the input is rendered (d-none, still in DOM)
    const inputEl = wrapper.find('input[type="file"]').element;
    inputEl.value = ""; // can't set non-empty programmatically; assert reset path runs

    await wrapper.find(".btn-outline-danger").trigger("click");

    const update = wrapper.emitted("update:modelValue");
    expect(update[update.length - 1][0]).toEqual([]);
    expect(wrapper.emitted("remove")[0]).toEqual(["all"]);
    expect(wrapper.findAll("img").length).toBe(0);
    expect(inputEl.value).toBe("");
  });

  /* --------------------------------------------------------------- */
  /* addMoreImages — fileInput present branch                         */
  /* --------------------------------------------------------------- */
  it("addMoreImages clicks the underlying file input when present", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a"] },
    });

    const inputEl = wrapper.find('input[type="file"]').element;
    const clickSpy = vi.spyOn(inputEl, "click").mockImplementation(() => {});

    await wrapper.find(".btn-outline-primary").trigger("click");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  /* --------------------------------------------------------------- */
  /* removeAllImages / addMoreImages — fileInput falsy branch         */
  /* --------------------------------------------------------------- */
  it("removeAllImages and addMoreImages handle a null fileInput ref (else branch)", async () => {
    const wrapper = mount(MultiImagePicker, {
      props: { initialImages: ["a", "b"] },
    });

    // Force the template ref to null to drive the falsy `if (fileInput.value)`
    // branch in both removeAllImages and addMoreImages.
    wrapper.vm.$.setupState.fileInput = null;

    // addMoreImages: with fileInput null it must not throw and must do nothing.
    await wrapper.find(".btn-outline-primary").trigger("click");

    // removeAllImages: still clears previews/emits but skips the input reset.
    await wrapper.find(".btn-outline-danger").trigger("click");

    const update = wrapper.emitted("update:modelValue");
    expect(update[update.length - 1][0]).toEqual([]);
    expect(wrapper.emitted("remove")[0]).toEqual(["all"]);
    expect(wrapper.findAll("img").length).toBe(0);
  });
});

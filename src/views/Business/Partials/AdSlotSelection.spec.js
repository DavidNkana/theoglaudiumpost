import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// ---- Mock external boundaries the SUT imports ----

// @/utils -> formatAdLocation
vi.mock("@/utils", () => ({
  formatAdLocation: vi.fn((location) => `FMT(${location})`),
}));

// @/features/media/MediaService -> getMediaObjectUrl
const getMediaObjectUrl = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: (...args) => getMediaObjectUrl(...args),
}));

import AdSlotSelection from "./AdSlotSelection.vue";
import { formatAdLocation } from "@/utils";

// Stub the ImageModal child so we only test this component's contract with it.
const ImageModalStub = {
  name: "ImageModal",
  props: ["show", "imageUrl", "imageAlt"],
  emits: ["close"],
  template:
    '<div class="image-modal-stub" :data-show="show" :data-url="imageUrl" :data-alt="imageAlt"></div>',
};

const baseSlot = (overrides = {}) => ({
  id: 1,
  name: "Slot One",
  location: "home_page",
  description: "Top banner",
  aspect_ratio: "16:9",
  billing_unit: "per month",
  currency: "USD",
  fee: 100,
  image: "http://img/local.png",
  image_id: null,
  ...overrides,
});

const mountComp = (props = {}) =>
  mount(AdSlotSelection, {
    props: {
      slots: [],
      ...props,
    },
    global: {
      stubs: { ImageModal: ImageModalStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  getMediaObjectUrl.mockResolvedValue("http://obj/url.png");
});

describe("AdSlotSelection.vue", () => {
  describe("loading branch (v-if/v-else template)", () => {
    it("renders 4 shimmer placeholder cards when loading is true", async () => {
      const wrapper = mountComp({ loading: true, slots: [baseSlot()] });
      await flushPromises();
      expect(wrapper.findAll(".shimmer-card")).toHaveLength(4);
      // Real slot cards are NOT rendered while loading
      expect(wrapper.find(".card.shadow-lg").exists()).toBe(false);
    });

    it("renders actual slot cards when loading is false", async () => {
      const wrapper = mountComp({ loading: false, slots: [baseSlot()] });
      await flushPromises();
      expect(wrapper.findAll(".shimmer-card")).toHaveLength(0);
      expect(wrapper.findAll(".card.shadow-lg")).toHaveLength(1);
    });
  });

  describe("slot v-for (empty and non-empty)", () => {
    it("renders no slot cards when slots is empty", async () => {
      const wrapper = mountComp({ loading: false, slots: [] });
      await flushPromises();
      expect(wrapper.findAll(".card.shadow-lg")).toHaveLength(0);
    });

    it("renders one card per slot when slots is non-empty", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ id: 1 }), baseSlot({ id: 2 })],
      });
      await flushPromises();
      expect(wrapper.findAll(".card.shadow-lg")).toHaveLength(2);
    });
  });

  describe("rendered slot content branches", () => {
    it("formats the location header via formatAdLocation", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ location: "side_bar" })],
      });
      await flushPromises();
      expect(formatAdLocation).toHaveBeenCalledWith("side_bar");
      expect(wrapper.find(".card-header h3").text()).toBe("FMT(side_bar)");
    });

    it("uses cached image url when image_id present and cached", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ image_id: "m1", image: "http://img/fallback.png" })],
      });
      await flushPromises();
      // preload fetched and cached -> img src is the object url
      const img = wrapper.find(".card.shadow-lg img");
      expect(img.attributes("src")).toBe("http://obj/url.png");
    });

    it("uses slot.image when image_id present but not yet cached", async () => {
      // Make the fetch never resolve before assertion by rejecting (cache stays empty)
      getMediaObjectUrl.mockRejectedValue(new Error("boom"));
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ image_id: "m2", image: "http://img/fallback.png" })],
      });
      await flushPromises();
      const img = wrapper.find(".card.shadow-lg img");
      // image_id truthy but cache empty -> falls back to slot.image
      expect(img.attributes("src")).toBe("http://img/fallback.png");
    });

    it("uses slot.image when there is no image_id", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ image_id: null, image: "http://img/plain.png" })],
      });
      await flushPromises();
      const img = wrapper.find(".card.shadow-lg img");
      expect(img.attributes("src")).toBe("http://img/plain.png");
    });

    it("renders aspect_ratio when present", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ aspect_ratio: "4:3", aspectRatio: "9:16" })],
      });
      await flushPromises();
      expect(wrapper.text()).toContain("4:3");
    });

    it("falls back to aspectRatio when aspect_ratio is missing", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ aspect_ratio: undefined, aspectRatio: "9:16" })],
      });
      await flushPromises();
      expect(wrapper.text()).toContain("9:16");
    });

    it("renders the slot currency when present", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ currency: "EUR", fee: 55 })],
      });
      await flushPromises();
      expect(wrapper.text()).toContain("EUR");
      expect(wrapper.text()).toContain("55");
    });

    it("falls back to ZAR currency when currency is nullish", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ currency: null })],
      });
      await flushPromises();
      expect(wrapper.text()).toContain("ZAR");
    });

    it("renders the slot description and billing_unit", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ description: "Premium spot", billing_unit: "weekly" })],
      });
      await flushPromises();
      expect(wrapper.text()).toContain("Premium spot");
      expect(wrapper.text()).toContain("weekly");
    });
  });

  describe("selection state (isSelected branches)", () => {
    it("shows 'Select' and no border-primary when slot is not selected", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ id: 1 })],
        selectedSlot: null,
      });
      await flushPromises();
      const card = wrapper.find(".card.shadow-lg");
      expect(card.classes()).not.toContain("border-primary");
      const btn = wrapper.find("button.btn-select");
      expect(btn.text()).toBe("Select");
      expect(btn.classes()).not.toContain("active");
    });

    it("shows 'Selected' + active/border-primary when slot matches selectedSlot", async () => {
      const slot = baseSlot({ id: 7 });
      const wrapper = mountComp({
        loading: false,
        slots: [slot],
        selectedSlot: { id: 7 },
      });
      await flushPromises();
      const card = wrapper.find(".card.shadow-lg");
      expect(card.classes()).toContain("border-primary");
      const btn = wrapper.find("button.btn-select");
      expect(btn.text()).toBe("Selected");
      expect(btn.classes()).toContain("active");
      expect(btn.classes()).toContain("text-white");
    });

    it("isSelected returns falsy when selectedSlot is null (short-circuit)", () => {
      const wrapper = mountComp({ slots: [], selectedSlot: null });
      expect(wrapper.vm.isSelected({ id: 1 })).toBeFalsy();
    });

    it("isSelected returns false when ids differ", () => {
      const wrapper = mountComp({ slots: [], selectedSlot: { id: 2 } });
      expect(wrapper.vm.isSelected({ id: 1 })).toBe(false);
    });
  });

  describe("selectSlot emit", () => {
    it("emits select-slot with numeric price and slot currency", async () => {
      const slot = baseSlot({ id: 3, fee: "250", currency: "GBP" });
      const wrapper = mountComp({ loading: false, slots: [slot] });
      await flushPromises();
      await wrapper.find("button.btn-select").trigger("click");
      const events = wrapper.emitted("select-slot");
      expect(events).toHaveLength(1);
      expect(events[0][0]).toMatchObject({
        id: 3,
        price: 250,
        currency: "GBP",
      });
    });

    it("defaults currency to ZAR when slot currency is nullish", async () => {
      const slot = baseSlot({ id: 4, fee: 99, currency: undefined });
      const wrapper = mountComp({ loading: false, slots: [slot] });
      await flushPromises();
      await wrapper.find("button.btn-select").trigger("click");
      expect(wrapper.emitted("select-slot")[0][0].currency).toBe("ZAR");
    });
  });

  describe("continue / next-step button", () => {
    it("is disabled when no selectedSlot", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot()],
        selectedSlot: null,
      });
      await flushPromises();
      const btn = wrapper.find("button.btn-success");
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("is enabled and emits next-step when a slot is selected", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ id: 1 })],
        selectedSlot: { id: 1 },
      });
      await flushPromises();
      const btn = wrapper.find("button.btn-success");
      expect(btn.attributes("disabled")).toBeUndefined();
      await btn.trigger("click");
      expect(wrapper.emitted("next-step")).toHaveLength(1);
    });
  });

  describe("fetchAndCacheImage", () => {
    it("returns cached url without re-fetching when already cached", async () => {
      const wrapper = mountComp({ slots: [] });
      wrapper.vm.imageCache["x"] = "http://cached.png";
      const result = await wrapper.vm.fetchAndCacheImage("x");
      expect(result).toBe("http://cached.png");
      expect(getMediaObjectUrl).not.toHaveBeenCalled();
    });

    it("fetches, caches, and returns the url on success", async () => {
      getMediaObjectUrl.mockResolvedValue("http://fresh.png");
      const wrapper = mountComp({ slots: [] });
      const result = await wrapper.vm.fetchAndCacheImage("y");
      expect(result).toBe("http://fresh.png");
      expect(wrapper.vm.imageCache["y"]).toBe("http://fresh.png");
      expect(getMediaObjectUrl).toHaveBeenCalledWith("y");
    });

    it("returns null and logs when the fetch rejects (catch path)", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      getMediaObjectUrl.mockRejectedValue(new Error("fail"));
      const wrapper = mountComp({ slots: [] });
      const result = await wrapper.vm.fetchAndCacheImage("z");
      expect(result).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("getSlotImage", () => {
    it("returns null when slot is falsy", async () => {
      const wrapper = mountComp({ slots: [] });
      expect(await wrapper.vm.getSlotImage(null)).toBeNull();
    });

    it("returns null when slot has no image_id", async () => {
      const wrapper = mountComp({ slots: [] });
      expect(await wrapper.vm.getSlotImage({ id: 1, image_id: null })).toBeNull();
    });

    it("delegates to fetchAndCacheImage when slot has image_id", async () => {
      getMediaObjectUrl.mockResolvedValue("http://slot.png");
      const wrapper = mountComp({ slots: [] });
      const result = await wrapper.vm.getSlotImage({ id: 1, image_id: "abc" });
      expect(result).toBe("http://slot.png");
    });
  });

  describe("openImageModal / closeImageModal", () => {
    it("opens modal using slot.image when no image_id, alt from slot.name", async () => {
      const wrapper = mountComp({ slots: [] });
      await wrapper.vm.openImageModal({
        image: "http://direct.png",
        image_id: null,
        name: "My Slot",
      });
      await flushPromises();
      expect(wrapper.vm.showImageModal).toBe(true);
      expect(wrapper.vm.selectedImage).toEqual({
        url: "http://direct.png",
        alt: "My Slot",
      });
      const modal = wrapper.find(".image-modal-stub");
      expect(modal.attributes("data-show")).toBe("true");
      expect(modal.attributes("data-url")).toBe("http://direct.png");
      expect(modal.attributes("data-alt")).toBe("My Slot");
    });

    it("opens modal fetching url via getSlotImage when image_id present; default alt", async () => {
      getMediaObjectUrl.mockResolvedValue("http://fetched.png");
      const wrapper = mountComp({ slots: [] });
      await wrapper.vm.openImageModal({
        image: "http://ignored.png",
        image_id: "m9",
        name: "",
      });
      await flushPromises();
      expect(wrapper.vm.selectedImage.url).toBe("http://fetched.png");
      // name is empty -> default alt
      expect(wrapper.vm.selectedImage.alt).toBe("Advertisement Placement");
      expect(wrapper.vm.showImageModal).toBe(true);
    });

    it("clicking the slot image triggers openImageModal", async () => {
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ image_id: null, image: "http://clickme.png", name: "Clicky" })],
      });
      await flushPromises();
      await wrapper.find(".card.shadow-lg img").trigger("click");
      await flushPromises();
      expect(wrapper.vm.showImageModal).toBe(true);
      expect(wrapper.vm.selectedImage.url).toBe("http://clickme.png");
    });

    it("closeImageModal hides the modal (and @close from child)", async () => {
      const wrapper = mountComp({ slots: [] });
      wrapper.vm.showImageModal = true;
      await wrapper.vm.$nextTick();
      await wrapper.findComponent(ImageModalStub).vm.$emit("close");
      expect(wrapper.vm.showImageModal).toBe(false);
    });
  });

  describe("img @error -> getSlotImage", () => {
    it("invokes getSlotImage on image load error", async () => {
      getMediaObjectUrl.mockResolvedValue("http://recovered.png");
      const wrapper = mountComp({
        loading: false,
        slots: [baseSlot({ image_id: "err1", image: "http://broken.png" })],
      });
      await flushPromises();
      const spy = vi.spyOn(wrapper.vm, "getSlotImage");
      await wrapper.find(".card.shadow-lg img").trigger("error");
      await flushPromises();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("preloadSlotImages (mounted + watcher)", () => {
    it("does nothing when slots is empty", async () => {
      mountComp({ loading: false, slots: [] });
      await flushPromises();
      expect(getMediaObjectUrl).not.toHaveBeenCalled();
    });

    it("does nothing when loading is true (guard)", async () => {
      mountComp({
        loading: true,
        slots: [baseSlot({ image_id: "p1" })],
      });
      await flushPromises();
      expect(getMediaObjectUrl).not.toHaveBeenCalled();
    });

    it("preloads only slots with an image_id", async () => {
      mountComp({
        loading: false,
        slots: [
          baseSlot({ id: 1, image_id: "p1" }),
          baseSlot({ id: 2, image_id: null }),
          baseSlot({ id: 3, image_id: "p3" }),
        ],
      });
      await flushPromises();
      expect(getMediaObjectUrl).toHaveBeenCalledWith("p1");
      expect(getMediaObjectUrl).toHaveBeenCalledWith("p3");
      // Only the two slots with an image_id are fetched (never the null one).
      const fetchedIds = getMediaObjectUrl.mock.calls.map((c) => c[0]);
      expect(fetchedIds.every((id) => id === "p1" || id === "p3")).toBe(true);
    });

    it("re-runs preload when the slots prop changes (watcher handler)", async () => {
      const wrapper = mountComp({ loading: false, slots: [] });
      await flushPromises();
      expect(getMediaObjectUrl).not.toHaveBeenCalled();
      await wrapper.setProps({ slots: [baseSlot({ id: 9, image_id: "new1" })] });
      await flushPromises();
      expect(getMediaObjectUrl).toHaveBeenCalledWith("new1");
    });

    it("guards against null slots prop", async () => {
      // slots is required:Array, but exercise the !this.slots guard directly
      const wrapper = mountComp({ loading: false, slots: [] });
      wrapper.vm.$options.props; // no-op reference
      await wrapper.vm.preloadSlotImages.call({
        slots: null,
        loading: false,
        getSlotImage: vi.fn(),
      });
      expect(getMediaObjectUrl).not.toHaveBeenCalled();
    });
  });
});

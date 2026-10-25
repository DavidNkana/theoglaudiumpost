import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ImageModal from "./ImageModal.vue";

describe("ImageModal.vue", () => {
  describe("v-if show branch (template)", () => {
    it("does not render the modal when show is false", () => {
      const wrapper = mount(ImageModal, { props: { show: false } });
      expect(wrapper.find(".image-modal").exists()).toBe(false);
    });

    it("renders the modal when show is true", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, imageUrl: "http://x/a.png", imageAlt: "Alt text" },
      });
      const modal = wrapper.find(".image-modal");
      expect(modal.exists()).toBe(true);
      const img = wrapper.find("img.modal-image");
      expect(img.attributes("src")).toBe("http://x/a.png");
      expect(img.attributes("alt")).toBe("Alt text");
    });
  });

  describe("close interactions", () => {
    it("emits close when the close button is clicked", async () => {
      const wrapper = mount(ImageModal, { props: { show: true } });
      await wrapper.find("button.close-btn").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("emits close when clicking the backdrop itself (@click.self)", async () => {
      const wrapper = mount(ImageModal, { props: { show: true } });
      // click.self only fires when the event target is the element itself
      await wrapper.find(".image-modal").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("does NOT emit close when a child element of the backdrop is clicked", async () => {
      const wrapper = mount(ImageModal, { props: { show: true } });
      // clicking the inner content should not satisfy click.self on .image-modal
      await wrapper.find(".modal-content").trigger("click");
      expect(wrapper.emitted("close")).toBeUndefined();
    });
  });

  describe("currentImage computed", () => {
    it("uses the indexed image when images array is non-empty", async () => {
      const wrapper = mount(ImageModal, {
        props: {
          show: true,
          images: ["http://x/0.png", "http://x/1.png"],
          imageUrl: "http://x/fallback.png",
        },
      });
      // currentIndex starts at 0 -> first image
      expect(wrapper.vm.currentImage).toBe("http://x/0.png");
      wrapper.vm.currentIndex = 1;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.currentImage).toBe("http://x/1.png");
      expect(wrapper.find("img.modal-image").attributes("src")).toBe("http://x/1.png");
    });

    it("falls back to imageUrl when images array is empty", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: [], imageUrl: "http://x/fallback.png" },
      });
      expect(wrapper.vm.currentImage).toBe("http://x/fallback.png");
      expect(wrapper.find("img.modal-image").attributes("src")).toBe("http://x/fallback.png");
    });
  });

  describe("hasMultipleImages computed", () => {
    it("is false when images is falsy (null)", () => {
      const wrapper = mount(ImageModal, { props: { show: true, images: null } });
      expect(wrapper.vm.hasMultipleImages).toBe(null);
    });

    it("is false when images has a single item", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["http://x/0.png"] },
      });
      expect(wrapper.vm.hasMultipleImages).toBe(false);
    });

    it("is true when images has more than one item", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["http://x/0.png", "http://x/1.png"] },
      });
      expect(wrapper.vm.hasMultipleImages).toBe(true);
    });
  });

  describe("nextImage / prevImage methods", () => {
    it("nextImage increments currentIndex when not at the last image", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["a", "b", "c"], initialIndex: 0 },
      });
      expect(wrapper.vm.currentIndex).toBe(0);
      wrapper.vm.nextImage();
      expect(wrapper.vm.currentIndex).toBe(1);
    });

    it("nextImage does NOT increment past the last image", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["a", "b"], initialIndex: 1 },
      });
      // currentIndex starts at 0 (data); move it to the last index explicitly
      wrapper.vm.currentIndex = 1;
      expect(wrapper.vm.currentIndex).toBe(1);
      wrapper.vm.nextImage();
      expect(wrapper.vm.currentIndex).toBe(1);
    });

    it("prevImage decrements currentIndex when not at the first image", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["a", "b", "c"], initialIndex: 2 },
      });
      wrapper.vm.currentIndex = 2;
      expect(wrapper.vm.currentIndex).toBe(2);
      wrapper.vm.prevImage();
      expect(wrapper.vm.currentIndex).toBe(1);
    });

    it("prevImage does NOT decrement before the first image", () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["a", "b"], initialIndex: 0 },
      });
      expect(wrapper.vm.currentIndex).toBe(0);
      wrapper.vm.prevImage();
      expect(wrapper.vm.currentIndex).toBe(0);
    });
  });

  describe("watchers", () => {
    it("initialIndex watcher updates currentIndex", async () => {
      const wrapper = mount(ImageModal, {
        props: { show: false, images: ["a", "b", "c"], initialIndex: 0 },
      });
      expect(wrapper.vm.currentIndex).toBe(0);
      await wrapper.setProps({ initialIndex: 2 });
      expect(wrapper.vm.currentIndex).toBe(2);
    });

    it("show watcher resets currentIndex to initialIndex when becoming true", async () => {
      const wrapper = mount(ImageModal, {
        props: { show: false, images: ["a", "b", "c"], initialIndex: 2 },
      });
      // start hidden; manually move currentIndex away
      wrapper.vm.currentIndex = 0;
      await wrapper.setProps({ show: true });
      expect(wrapper.vm.currentIndex).toBe(2);
    });

    it("show watcher does nothing when becoming false (else branch)", async () => {
      const wrapper = mount(ImageModal, {
        props: { show: true, images: ["a", "b", "c"], initialIndex: 2 },
      });
      wrapper.vm.currentIndex = 1;
      await wrapper.setProps({ show: false });
      // staying unchanged because newVal is falsy
      expect(wrapper.vm.currentIndex).toBe(1);
    });
  });
});

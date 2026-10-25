import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FuneralNotice from "./FuneralNotice.vue";

const baseNotice = {
  title: "Late John Doe",
  publish_date: "2026-06-15T00:00:00Z",
  category: { name: "Funeral" },
  image: { file: "https://cdn.example.com/funeral.jpg" },
};

const factory = (notice) =>
  mount(FuneralNotice, {
    props: { notice },
  });

describe("FuneralNotice.vue", () => {
  it("renders the formatted publish date in the date badge", () => {
    const wrapper = factory(baseNotice);
    const badge = wrapper.find(".date-badge");
    // formatDate -> en-US "short" month + numeric day
    const expected = new Date("2026-06-15T00:00:00Z").toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" }
    );
    expect(badge.text()).toBe(expected);
  });

  it("renders the category name when category is present", () => {
    const wrapper = factory(baseNotice);
    expect(wrapper.find(".category-badge").text()).toBe("Funeral");
  });

  it("renders an empty category badge when category is missing (optional chaining)", () => {
    const wrapper = factory({
      ...baseNotice,
      category: null,
    });
    expect(wrapper.find(".category-badge").text()).toBe("");
  });

  it("uses the notice image file as the card image src when present", () => {
    const wrapper = factory(baseNotice);
    const img = wrapper.find("img.card-img-top");
    expect(img.attributes("src")).toBe(
      "https://cdn.example.com/funeral.jpg"
    );
    expect(img.attributes("alt")).toBe("Late John Doe");
  });

  it("falls back to the placeholder image when image file is missing", () => {
    const wrapper = factory({
      ...baseNotice,
      image: null,
    });
    const img = wrapper.find("img.card-img-top");
    expect(img.attributes("src")).toBe("/placeholder-image.png");
  });

  it("modal and backdrop are hidden initially", () => {
    const wrapper = factory(baseNotice);
    const modal = wrapper.find(".modal.fade");
    expect(modal.classes()).not.toContain("show");
    expect(modal.attributes("style")).toContain("display: none");
    // backdrop is behind v-if and should not be rendered
    expect(wrapper.find(".modal-backdrop").exists()).toBe(false);
  });

  it("opens the modal when the card is clicked and shows the image branch", async () => {
    const wrapper = factory(baseNotice);
    await wrapper.find(".event-card").trigger("click");

    const modal = wrapper.find(".modal.fade");
    expect(modal.classes()).toContain("show");
    expect(modal.attributes("style")).toContain("display: block");

    // image branch (v-if="notice.image?.file")
    const modalImg = wrapper.find(".modal-body img.img-fluid");
    expect(modalImg.exists()).toBe(true);
    expect(modalImg.attributes("src")).toBe(
      "https://cdn.example.com/funeral.jpg"
    );
    expect(wrapper.text()).not.toContain("No details available");

    // backdrop now rendered (v-if="showModal")
    expect(wrapper.find(".modal-backdrop").exists()).toBe(true);
    expect(wrapper.find(".modal-backdrop").classes()).toContain("show");
  });

  it("shows the fallback v-else branch when modal is open and image is missing", async () => {
    const wrapper = factory({
      ...baseNotice,
      image: null,
    });
    await wrapper.find(".event-card").trigger("click");

    expect(wrapper.find(".modal-body img.img-fluid").exists()).toBe(false);
    expect(wrapper.find(".modal-body").text()).toContain(
      "No details available for this notice."
    );
  });

  it("closes the modal when clicking the modal overlay itself (@click.self)", async () => {
    const wrapper = factory(baseNotice);
    await wrapper.find(".event-card").trigger("click");
    expect(wrapper.find(".modal.fade").classes()).toContain("show");

    // click.self -> target must be the modal element itself
    await wrapper.find(".modal.fade").trigger("click");

    const modal = wrapper.find(".modal.fade");
    expect(modal.classes()).not.toContain("show");
    expect(modal.attributes("style")).toContain("display: none");
    expect(wrapper.find(".modal-backdrop").exists()).toBe(false);
  });

  it("closes the modal when clicking the backdrop", async () => {
    const wrapper = factory(baseNotice);
    await wrapper.find(".event-card").trigger("click");
    expect(wrapper.find(".modal-backdrop").exists()).toBe(true);

    await wrapper.find(".modal-backdrop").trigger("click");

    expect(wrapper.find(".modal.fade").classes()).not.toContain("show");
    expect(wrapper.find(".modal-backdrop").exists()).toBe(false);
  });
});

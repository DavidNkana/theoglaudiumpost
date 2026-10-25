import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import AdArticle from "@/components/AdArticle.vue";
import { setDefaultImage } from "@/utils";

// Mock the only external boundary the component imports.
vi.mock("@/utils", () => ({
  setDefaultImage: vi.fn(),
}));

describe("AdArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the default 'direct' provider variant", () => {
    const wrapper = mount(AdArticle);

    // Default static ad content.
    expect(wrapper.find("img.card-img-top").attributes("src")).toBe(
      "https://placehold.co/300x200/f8f9fa/495057/?text=Your+Ad+Here"
    );
    expect(wrapper.find(".card-title a").text()).toBe(
      "Advertise Your Business Here"
    );
    expect(wrapper.find(".card-title a").attributes("href")).toBe(
      "/business/advertise"
    );
    expect(wrapper.find(".card-text").text()).toBe(
      "Reach the Laudium community with your products and services"
    );

    // Direct branch of the badge ternary (class + label).
    const badge = wrapper.find(".category-badge");
    expect(badge.classes()).toContain("bg-warning");
    expect(badge.classes()).not.toContain("bg-primary");
    expect(badge.find(".link").text()).toBe("Direct Advertiser");
  });

  it("renders the non-direct (google) provider variant", () => {
    const wrapper = mount(AdArticle, {
      props: { adProvider: "google" },
    });

    // False branch of the badge ternary (class + label).
    const badge = wrapper.find(".category-badge");
    expect(badge.classes()).toContain("bg-primary");
    expect(badge.classes()).not.toContain("bg-warning");
    expect(badge.find(".link").text()).toBe("Advertisement");
  });

  it("accepts the placement and size props", () => {
    const wrapper = mount(AdArticle, {
      props: { placement: "sidebar_top", size: "large" },
    });
    expect(wrapper.props("placement")).toBe("sidebar_top");
    expect(wrapper.props("size")).toBe("large");
  });

  it("delegates image load errors to setDefaultImage", async () => {
    const wrapper = mount(AdArticle);
    const img = wrapper.find("img.card-img-top");

    await img.trigger("error");

    expect(setDefaultImage).toHaveBeenCalledTimes(1);
    const eventArg = setDefaultImage.mock.calls[0][0];
    expect(eventArg).toBeInstanceOf(Event);
    expect(eventArg.target).toBe(img.element);
  });

  it("validates the adProvider prop against the allowed values", () => {
    const validator = AdArticle.props.adProvider.validator;

    // Both accepted values return true.
    expect(validator("direct")).toBe(true);
    expect(validator("google")).toBe(true);

    // Anything else returns false.
    expect(validator("facebook")).toBe(false);
  });
});

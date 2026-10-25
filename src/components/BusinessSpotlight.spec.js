import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import BusinessSpotlight from "@/components/BusinessSpotlight.vue";

function makeBusiness(overrides = {}) {
  return {
    id: 42,
    name: "Acme Co",
    logo: "https://example.com/logo.png",
    description: "Best widgets in town",
    rating: 3,
    address: "123 Main St",
    phone: "555-1234",
    hours: "9-5",
    tags: ["retail", "local"],
    promotion: "",
    ...overrides,
  };
}

function mountSpotlight(business) {
  return mount(BusinessSpotlight, {
    props: { business },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("BusinessSpotlight", () => {
  it("renders logo, name, description and rating header", () => {
    const business = makeBusiness();
    const wrapper = mountSpotlight(business);

    const img = wrapper.find("img.business-logo");
    expect(img.attributes("src")).toBe(business.logo);
    expect(img.attributes("alt")).toBe("Acme Co logo");
    expect(wrapper.find("h5.business-name").text()).toBe("Acme Co");
    expect(wrapper.find("p.business-description").text()).toBe(
      "Best widgets in town"
    );
    expect(wrapper.find(".rating-value").text()).toBe("3/5");
  });

  it("splits the five stars into filled and muted by rating (both branches)", () => {
    // rating 3 -> stars 1,2,3 warning; stars 4,5 muted
    const wrapper = mountSpotlight(makeBusiness({ rating: 3 }));
    const stars = wrapper.findAll(".stars i");
    expect(stars).toHaveLength(5);
    expect(stars.filter((s) => s.classes().includes("text-warning"))).toHaveLength(
      3
    );
    expect(stars.filter((s) => s.classes().includes("text-muted"))).toHaveLength(
      2
    );
  });

  it("renders all stars filled at max rating and all muted at zero rating", () => {
    const allFilled = mountSpotlight(makeBusiness({ rating: 5 }));
    expect(
      allFilled
        .findAll(".stars i")
        .every((s) => s.classes().includes("text-warning"))
    ).toBe(true);

    const allMuted = mountSpotlight(makeBusiness({ rating: 0 }));
    expect(
      allMuted.findAll(".stars i").every((s) => s.classes().includes("text-muted"))
    ).toBe(true);
  });

  it("renders address and phone info items", () => {
    const wrapper = mountSpotlight(makeBusiness());
    const items = wrapper.findAll(".info-item");
    expect(items[0].text()).toContain("123 Main St");
    expect(items[1].text()).toContain("555-1234");
  });

  it("formatHours returns the string verbatim when hours is a string", () => {
    const wrapper = mountSpotlight(makeBusiness({ hours: "10am-6pm" }));
    expect(wrapper.findAll(".info-item")[2].text()).toContain("10am-6pm");
  });

  it("formatHours returns hours.today when hours is an object with today", () => {
    const wrapper = mountSpotlight(
      makeBusiness({ hours: { today: "Closed Sundays" } })
    );
    expect(wrapper.findAll(".info-item")[2].text()).toContain("Closed Sundays");
  });

  it("formatHours falls back to 'Open today' for an object without today", () => {
    const wrapper = mountSpotlight(makeBusiness({ hours: {} }));
    expect(wrapper.findAll(".info-item")[2].text()).toContain("Open today");
  });

  it("formatHours falls back to 'Contact for hours' for non-string/non-object", () => {
    const wrapper = mountSpotlight(makeBusiness({ hours: 123 }));
    expect(wrapper.findAll(".info-item")[2].text()).toContain(
      "Contact for hours"
    );
  });

  it("renders one badge per tag when tags are present", () => {
    const wrapper = mountSpotlight(
      makeBusiness({ tags: ["a", "b", "c"] })
    );
    const badges = wrapper.findAll(".business-tags .badge");
    expect(badges).toHaveLength(3);
    expect(badges.map((b) => b.text())).toEqual(["a", "b", "c"]);
  });

  it("renders no badges when the tags list is empty", () => {
    const wrapper = mountSpotlight(makeBusiness({ tags: [] }));
    expect(wrapper.findAll(".business-tags .badge")).toHaveLength(0);
  });

  it("links to the business profile route", () => {
    const wrapper = mountSpotlight(makeBusiness({ id: 7 }));
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/business/7");
    expect(link.text()).toBe("View Business Profile");
  });

  it("renders the promo block when a promotion is present (v-if truthy)", () => {
    const wrapper = mountSpotlight(
      makeBusiness({ promotion: "20% off this week" })
    );
    expect(wrapper.find(".business-promo").exists()).toBe(true);
    expect(wrapper.find(".promo-content").text()).toBe("20% off this week");
  });

  it("omits the promo block when there is no promotion (v-if falsy)", () => {
    const wrapper = mountSpotlight(makeBusiness({ promotion: "" }));
    expect(wrapper.find(".business-promo").exists()).toBe(false);
  });

  it("prop validator accepts a complete business and rejects an incomplete one", () => {
    const validator = BusinessSpotlight.props.business.validator;
    expect(
      validator({
        id: 1,
        name: "n",
        logo: "l",
        description: "d",
      })
    ).toBeTruthy();
    expect(validator({ id: 1, name: "n", logo: "l" })).toBeFalsy();
  });
});

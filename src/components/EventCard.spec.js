import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import EventCard from "@/components/EventCard.vue";

// 2025-03-09T14:05:00Z — a fixed timestamp so date-derived assertions are stable.
const FIXED_DATE = "2025-03-09T14:05:00Z";

function makeEvent(overrides = {}) {
  return {
    slug: "spring-festival",
    title: "Spring Festival",
    description: "A lovely community gathering.",
    location: "Town Hall",
    publish_date: FIXED_DATE,
    image: { file: "https://cdn.example.com/spring.jpg" },
    category: { name: "Community" },
    ...overrides,
  };
}

function mountCard(props = {}) {
  return mount(EventCard, {
    props: { event: makeEvent(), ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("EventCard", () => {
  it("renders the image when event.image.file is present", () => {
    const wrapper = mountCard();
    const img = wrapper.find("img.card-img-top");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn.example.com/spring.jpg");
    expect(img.attributes("alt")).toBe("Spring Festival");
    // placeholder branch must NOT be rendered
    expect(wrapper.find("div.placeholder").exists()).toBe(false);
  });

  it("renders the No Image placeholder when image is missing (image object absent)", () => {
    const wrapper = mountCard({ event: makeEvent({ image: undefined }) });
    expect(wrapper.find("img.card-img-top").exists()).toBe(false);
    const placeholder = wrapper.find("div.placeholder");
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.text()).toBe("No Image");
  });

  it("renders the placeholder when image exists but file is missing (file-falsy branch)", () => {
    const wrapper = mountCard({ event: makeEvent({ image: { file: null } }) });
    expect(wrapper.find("img.card-img-top").exists()).toBe(false);
    expect(wrapper.find("div.placeholder").exists()).toBe(true);
  });

  it("renders the category name and formatted date/time pieces", () => {
    const wrapper = mountCard();
    expect(wrapper.find("span.badge").text()).toBe("Community");

    const day = new Date(FIXED_DATE).getDate();
    const month = new Date(FIXED_DATE).toLocaleString("default", {
      month: "short",
    });
    const time = new Date(FIXED_DATE).toLocaleString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    expect(wrapper.find("span.date-day").text()).toBe(String(day));
    expect(wrapper.find("span.date-month").text()).toBe(month);
    expect(wrapper.find("div.card-body small").text()).toBe(time);
  });

  it("handles a missing category via optional chaining (renders empty badge)", () => {
    const wrapper = mountCard({ event: makeEvent({ category: undefined }) });
    // category?.name resolves to undefined -> empty text, no throw
    expect(wrapper.find("span.badge").text()).toBe("");
  });

  it("links the title and details to the community route for the slug", () => {
    const wrapper = mountCard();
    const links = wrapper.findAllComponents(RouterLinkStub);
    const targets = links.map((l) => l.props("to"));
    expect(targets).toContain("/community/spring-festival");
    // title link renders the event title
    const titleLink = links.find(
      (l) => l.text() === "Spring Festival" && l.classes().includes("link")
    );
    expect(titleLink).toBeTruthy();
  });

  it("renders description and footer when minDetails is false (default)", () => {
    const wrapper = mountCard();
    const desc = wrapper.find("p.card-text");
    expect(desc.exists()).toBe(true);
    expect(desc.text()).toBe("A lovely community gathering.");

    const footer = wrapper.find("div.card-footer");
    expect(footer.exists()).toBe(true);
    expect(footer.text()).toContain("Town Hall");
    expect(footer.text()).toContain("Details");
  });

  it("hides description and footer when minDetails is true", () => {
    const wrapper = mountCard({ minDetails: true });
    expect(wrapper.find("p.card-text").exists()).toBe(false);
    expect(wrapper.find("div.card-footer").exists()).toBe(false);
  });

  it("exposes format helpers that derive day, short month, and 12h time", () => {
    const wrapper = mountCard();
    const vm = wrapper.vm;
    const d = new Date(FIXED_DATE);
    expect(vm.formatDay(FIXED_DATE)).toBe(d.getDate());
    expect(vm.formatMonth(FIXED_DATE)).toBe(
      d.toLocaleString("default", { month: "short" })
    );
    expect(vm.formatTime(FIXED_DATE)).toBe(
      d.toLocaleString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  });
});

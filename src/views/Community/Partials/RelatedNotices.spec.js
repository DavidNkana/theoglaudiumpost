import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RelatedNotices from "@/views/Community/Partials/RelatedNotices.vue";

function mountNotices(recentNotices) {
  return mount(RelatedNotices, {
    props: { recentNotices },
  });
}

describe("RelatedNotices", () => {
  it("renders nothing when recentNotices is empty (v-if falsy branch)", () => {
    const wrapper = mountNotices([]);
    // !!recentNotices.length === false -> the card must not render at all
    expect(wrapper.find("div.card").exists()).toBe(false);
    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("renders the card with header, footer and one item per notice (v-if truthy + v-for non-empty)", () => {
    const notices = [
      { time: "2 hours ago", text: "Road closure on Main St" },
      { time: "Yesterday", text: "Water outage resolved" },
    ];
    const wrapper = mountNotices(notices);

    // Card shell renders
    const card = wrapper.find("div.card");
    expect(card.exists()).toBe(true);

    // Header
    expect(wrapper.find("div.card-header h5").text()).toBe("Recent Updates");

    // v-for produces exactly one list item per notice
    const items = wrapper.findAll("ul.list-group li.list-group-item");
    expect(items).toHaveLength(2);

    // Each item renders its time and text
    expect(items[0].find("small.text-muted").text()).toBe("2 hours ago");
    expect(items[0].find("p.mb-0").text()).toBe("Road closure on Main St");
    expect(items[1].find("small.text-muted").text()).toBe("Yesterday");
    expect(items[1].find("p.mb-0").text()).toBe("Water outage resolved");

    // Footer "View All Updates" link
    const footerLink = wrapper.find("div.card-footer a.btn-link");
    expect(footerLink.exists()).toBe(true);
    expect(footerLink.text()).toBe("View All Updates");
    expect(footerLink.attributes("href")).toBe("#");
  });

  it("renders the card with no list items when given a single notice (v-for single iteration)", () => {
    const wrapper = mountNotices([{ time: "Now", text: "Single notice" }]);
    const items = wrapper.findAll("ul.list-group li.list-group-item");
    expect(items).toHaveLength(1);
    expect(items[0].text()).toContain("Now");
    expect(items[0].text()).toContain("Single notice");
  });
});

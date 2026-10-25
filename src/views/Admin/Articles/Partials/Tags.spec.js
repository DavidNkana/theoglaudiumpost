import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Tags from "@/views/Admin/Articles/Partials/Tags.vue";

// Pure presentational SFC: only imports `vue`. No external boundaries to mock.

describe("Tags.vue", () => {
  it("renders the populated list: v-for, id key, icon, clickable link, emits on click", async () => {
    const wrapper = mount(Tags, {
      props: {
        tags: [
          { id: 7, name: "Alpha" },
          { id: 8, name: "Beta" },
        ],
        showIcon: true,
        clickable: true,
        variant: "table",
        size: "md",
        colorScheme: "primary",
      },
    });

    // v-if="tags && tags.length > 0" -> true branch renders the tag items.
    const items = wrapper.findAll(".tag-item");
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain("Alpha");
    expect(items[1].text()).toContain("Beta");

    // showIcon true -> tag-icon rendered.
    expect(wrapper.findAll(".tag-icon")).toHaveLength(2);
    expect(wrapper.find("i.bi-tag-fill").exists()).toBe(true);

    // title bound from tag.name.
    expect(items[0].attributes("title")).toBe("Alpha");

    // getTagClasses non-pastel + clickable branches.
    expect(items[0].classes()).toContain("tag-md");
    expect(items[0].classes()).toContain("tag-primary");
    expect(items[0].classes()).toContain("tag-clickable");

    // variantClass: table variant + size class.
    const root = wrapper.find(".tag-display");
    expect(root.classes()).toContain("tag-display-table");
    expect(root.classes()).toContain("tag-size-md");

    // clickable true -> tag-link present; clicking emits tag-click with the tag.
    const links = wrapper.findAll(".tag-link");
    expect(links).toHaveLength(2);
    await links[0].trigger("click");
    expect(wrapper.emitted("tag-click")).toBeTruthy();
    expect(wrapper.emitted("tag-click")[0]).toEqual([{ id: 7, name: "Alpha" }]);
  });

  it("renders the empty state when tags is an empty array (v-else)", () => {
    const wrapper = mount(Tags, {
      props: { tags: [], emptyText: "Nothing here" },
    });

    // v-if false (length 0) -> v-else empty branch.
    expect(wrapper.findAll(".tag-item")).toHaveLength(0);
    const empty = wrapper.find(".tag-empty");
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toBe("Nothing here");
  });

  it("renders the empty state when tags is null (left side of && falsy)", () => {
    const wrapper = mount(Tags, {
      props: { tags: null },
    });

    // tags falsy -> short-circuits the && -> empty branch with default emptyText.
    expect(wrapper.findAll(".tag-item")).toHaveLength(0);
    expect(wrapper.find(".tag-empty").text()).toBe("No tags");
  });

  it("uses index as key and skips icon/link when showIcon and clickable are false", async () => {
    const wrapper = mount(Tags, {
      props: {
        tags: [{ name: "NoId" }], // tag.id falsy -> :key falls back to index
        showIcon: false,
        clickable: false,
        variant: "card",
        size: "sm",
        colorScheme: "secondary",
      },
    });

    const items = wrapper.findAll(".tag-item");
    expect(items).toHaveLength(1);

    // showIcon false -> no icon.
    expect(wrapper.find(".tag-icon").exists()).toBe(false);
    // clickable false -> no tag-link overlay.
    expect(wrapper.find(".tag-link").exists()).toBe(false);

    // getTagClasses: non-pastel, clickable false -> no tag-clickable class.
    expect(items[0].classes()).toContain("tag-sm");
    expect(items[0].classes()).toContain("tag-secondary");
    expect(items[0].classes()).not.toContain("tag-clickable");

    // variantClass: card variant.
    expect(wrapper.find(".tag-display").classes()).toContain("tag-display-card");
  });

  it("applies deterministic pastel classes for the pastel colorScheme (detail variant)", () => {
    const wrapper = mount(Tags, {
      props: {
        tags: [{ id: 1, name: "Pastel" }],
        colorScheme: "pastel",
        variant: "detail",
        size: "lg",
      },
    });

    const item = wrapper.find(".tag-item");
    // pastel branch: tag-pastel + deterministic tag-pastel-N.
    expect(item.classes()).toContain("tag-pastel");
    expect(item.classes().some((c) => /^tag-pastel-\d$/.test(c))).toBe(true);
    expect(item.classes()).toContain("tag-lg");

    // variantClass: detail variant.
    expect(wrapper.find(".tag-display").classes()).toContain(
      "tag-display-detail"
    );
  });
});

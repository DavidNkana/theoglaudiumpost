import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Pagination from "@/views/News/Partials/Pagination.vue";

// Pagination.vue is a pure presentational <script setup> component. It imports
// no external boundaries (no services, store, router, composables, config or
// native plugins), so there is nothing to mock. The full surface is driven via
// props (`currentPage`, `pages`) and the single `change-page` emit.

describe("Pagination.vue", () => {
  it("uses the default props when none are supplied (currentPage 0, pages undefined)", () => {
    // pages has no `default`, so it is `undefined`; `pages ?? 0` -> 0 page items.
    const wrapper = mount(Pagination);

    // Only Previous + Next list items render when there are zero numbered pages.
    const items = wrapper.findAll("li.page-item");
    expect(items).toHaveLength(2);

    // currentPage === 0 default -> Previous item is disabled (true branch).
    expect(items[0].classes()).toContain("disabled");

    // currentPage (0) === pages - 1 (undefined - 1 === NaN) is false -> Next NOT
    // disabled (the `disabled: currentPage === pages - 1` false branch).
    expect(items[1].classes()).not.toContain("disabled");
  });

  it("renders a numbered page item per `pages` (v-for non-empty branch) and marks the active page", () => {
    // currentPage = 1 (zero-based 2nd page) of 3 pages.
    const wrapper = mount(Pagination, {
      props: { currentPage: 1, pages: 3 },
    });

    // Previous + 3 numbered pages + Next = 5 list items.
    const items = wrapper.findAll("li.page-item");
    expect(items).toHaveLength(5);

    // Numbered anchors show 1..pages, rendered from `page` (1-based).
    const numbered = items.slice(1, 4);
    expect(numbered.map((li) => li.text())).toEqual(["1", "2", "3"]);

    // active: page - 1 === currentPage -> page 2 (index 1) is active (true
    // branch); pages 1 and 3 are NOT active (false branch).
    expect(numbered[0].classes()).not.toContain("active"); // page 1 -> 0 !== 1
    expect(numbered[1].classes()).toContain("active"); // page 2 -> 1 === 1
    expect(numbered[2].classes()).not.toContain("active"); // page 3 -> 2 !== 1

    // currentPage (1) !== 0 -> Previous NOT disabled (false branch).
    expect(items[0].classes()).not.toContain("disabled");
    // currentPage (1) !== pages - 1 (2) -> Next NOT disabled (false branch).
    expect(items[4].classes()).not.toContain("disabled");
  });

  it("disables the Next item on the last page (currentPage === pages - 1 true branch)", () => {
    // currentPage = 2 is the last of 3 pages (pages - 1 === 2).
    const wrapper = mount(Pagination, {
      props: { currentPage: 2, pages: 3 },
    });

    const items = wrapper.findAll("li.page-item");
    // Last list item is the Next control.
    const nextItem = items[items.length - 1];
    expect(nextItem.classes()).toContain("disabled");

    // And the 3rd numbered page (index 3 -> page 3) is active here.
    expect(items[3].classes()).toContain("active");
  });

  it("emits change-page with currentPage - 1 when Previous is clicked", async () => {
    const wrapper = mount(Pagination, {
      props: { currentPage: 2, pages: 3 },
    });

    // First page-link anchor is the Previous control.
    const previousLink = wrapper.findAll("a.page-link")[0];
    await previousLink.trigger("click");

    const emitted = wrapper.emitted("change-page");
    expect(emitted).toBeTruthy();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual([1]); // currentPage (2) - 1
  });

  it("emits change-page with the zero-based index of a numbered page when clicked", async () => {
    const wrapper = mount(Pagination, {
      props: { currentPage: 0, pages: 3 },
    });

    // Anchors: [0]=Previous, [1..3]=pages 1..3, [last]=Next.
    const numberedLinks = wrapper.findAll("a.page-link").slice(1, 4);

    // Click page "2" (1-based) -> emits page - 1 === 1.
    await numberedLinks[1].trigger("click");

    const emitted = wrapper.emitted("change-page");
    expect(emitted).toBeTruthy();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual([1]); // page (2) - 1
  });

  it("emits change-page with currentPage + 1 when Next is clicked", async () => {
    const wrapper = mount(Pagination, {
      props: { currentPage: 0, pages: 3 },
    });

    const links = wrapper.findAll("a.page-link");
    const nextLink = links[links.length - 1];
    await nextLink.trigger("click");

    const emitted = wrapper.emitted("change-page");
    expect(emitted).toBeTruthy();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual([1]); // currentPage (0) + 1
  });

  it("renders no numbered pages when pages is explicitly 0 (v-for empty branch)", () => {
    const wrapper = mount(Pagination, {
      props: { currentPage: 0, pages: 0 },
    });

    // pages === 0 -> `pages ?? 0` === 0 -> no numbered <li> rendered.
    const items = wrapper.findAll("li.page-item");
    expect(items).toHaveLength(2); // only Previous + Next

    // currentPage (0) === pages - 1 (-1)? false -> Next not disabled.
    expect(items[1].classes()).not.toContain("disabled");
    // currentPage === 0 -> Previous disabled.
    expect(items[0].classes()).toContain("disabled");
  });
});

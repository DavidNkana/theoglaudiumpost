import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import ArticlesTable from "@/views/Admin/Articles/Partials/ArticlesTable.vue";

/* ------------------------------------------------------------------ */
/* ArticlesTable is a presentational component. Its only non-stub      */
/* import is the pure helper getStatusBadgeClass from "@/utils" which  */
/* has no heavy boundary, so we exercise the real implementation and   */
/* assert the rendered class it produces.                              */
/*                                                                     */
/* The two child components that pull heavy boundaries (Tags pulls     */
/* nothing heavy but TableImageWithPlaceholder imports the media       */
/* service) are stubbed so this spec stays scoped to ArticlesTable.    */
/* ------------------------------------------------------------------ */

const TableImageStub = {
  name: "TableImageWithPlaceholder",
  props: ["mediaId"],
  template: '<div class="table-image-stub" :data-media-id="mediaId"></div>',
};

const TagsStub = {
  name: "Tags",
  props: ["tags", "variant", "size", "colorScheme", "limit"],
  template: '<div class="tags-stub" :data-count="tags.length"></div>',
};

const mountTable = (props = {}) =>
  mount(ArticlesTable, {
    props: {
      articles: [],
      isLoading: false,
      ...props,
    },
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        TableImageWithPlaceholder: TableImageStub,
        Tags: TagsStub,
      },
    },
  });

describe("ArticlesTable.vue", () => {
  it("renders 5 shimmer rows while isLoading is true (loading branch)", () => {
    const wrapper = mountTable({ isLoading: true, articles: [] });

    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    // v-for="i in 5" -> exactly 5 shimmer rows
    expect(shimmerRows).toHaveLength(5);

    // loading branch -> no empty-state, no data buttons
    expect(wrapper.text()).not.toContain("No articles found");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders the 'Publish' header label when status is not scheduled (ternary false branch)", () => {
    const wrapper = mountTable({ isLoading: false, articles: [], status: "published" });

    const dateHeader = wrapper.findAll("thead th.date-col");
    expect(dateHeader).toHaveLength(1);
    expect(dateHeader[0].text()).toContain("Publish");
    expect(dateHeader[0].text()).not.toContain("Scheduled");
  });

  it("renders the 'Scheduled' header label when status is scheduled (ternary true branch)", () => {
    const wrapper = mountTable({ isLoading: false, articles: [], status: "scheduled" });

    const dateHeader = wrapper.find("thead th.date-col");
    expect(dateHeader.text()).toContain("Scheduled");
    expect(dateHeader.text()).not.toContain("Publish");
  });

  it("renders the empty state when not loading and articles is empty (articles.length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, articles: [] });

    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No articles found");

    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("9");
  });

  it("renders fully-populated article rows and drives every value-present branch", () => {
    const articles = [
      {
        id: 1,
        cover_id: 42, // truthy -> TableImageWithPlaceholder rendered
        title: "Full Article",
        summary: "A complete summary",
        category: { name: "News" }, // present -> name
        tags: [{ id: 1, name: "alpha" }, { id: 2, name: "beta" }],
        status: "published",
        scheduled_for: "2026-03-04T08:00:00Z", // present -> split("T")[0]
      },
    ];

    const wrapper = mountTable({
      isLoading: false,
      articles,
      page: 2,
      pageSize: 10,
      status: "published",
    });

    // No empty-state / no shimmer in the success render.
    expect(wrapper.text()).not.toContain("No articles found");
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);

    // Row number = page * pageSize + index + 1 = 2 * 10 + 0 + 1 = 21
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("21");

    // cover_id truthy -> TableImageWithPlaceholder rendered with media-id
    const img = wrapper.find(".table-image-stub");
    expect(img.exists()).toBe(true);
    expect(img.attributes("data-media-id")).toBe("42");

    // title + summary rendered
    expect(wrapper.text()).toContain("Full Article");
    expect(wrapper.text()).toContain("A complete summary");

    // category present -> name ("News")
    expect(wrapper.text()).toContain("News");

    // tags forwarded to the (stubbed) Tags child
    const tags = wrapper.find(".tags-stub");
    expect(tags.exists()).toBe(true);
    expect(tags.attributes("data-count")).toBe("2");

    // status present -> getStatusBadgeClass("published") = "badge bg-success"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("published");
    expect(statusSpan.classes()).toContain("bg-success");

    // scheduled_for present -> split("T")[0]
    expect(wrapper.text()).toContain("2026-03-04");

    // edit router-link points at the article edit route
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/admin/articles/edit/1");
  });

  it("renders article rows with optional values absent and drives every falsy/?? fallback branch", () => {
    const articles = [
      {
        id: 2,
        // cover_id absent -> v-if false (no image)
        title: "Sparse Article",
        summary: undefined,
        // category absent -> category?.name ?? "-" -> "-"
        // tags absent -> tags ?? [] -> empty
        status: "weird-status", // default badge branch
        // scheduled_for absent -> ?.split undefined -> empty render
      },
    ];

    const wrapper = mountTable({ isLoading: false, articles });

    // cover_id falsy -> no thumbnail image
    expect(wrapper.find(".table-image-stub").exists()).toBe(false);

    // page defaults to 0, pageSize 10 -> 0*10 + 0 + 1 = 1
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("1");

    // category absent -> "-" fallback
    expect(wrapper.text()).toContain("-");

    // tags absent -> forwarded default [] -> count 0
    const tags = wrapper.find(".tags-stub");
    expect(tags.exists()).toBe(true);
    expect(tags.attributes("data-count")).toBe("0");

    // status -> default badge branch "badge bg-secondary"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("weird-status");
    expect(statusSpan.classes()).toContain("bg-secondary");

    expect(wrapper.text()).toContain("Sparse Article");
  });

  it("emits handle-preview and handle-delete with the article id when action buttons are clicked", async () => {
    const articles = [{ id: 99, title: "Action Article", status: "draft" }];
    const wrapper = mountTable({ isLoading: false, articles });

    const previewBtn = wrapper.find("button.text-secondary");
    const deleteBtn = wrapper.find("button.text-danger");
    expect(previewBtn.exists()).toBe(true);
    expect(deleteBtn.exists()).toBe(true);

    await previewBtn.trigger("click");
    await deleteBtn.trigger("click");

    expect(wrapper.emitted("handle-preview")).toBeTruthy();
    expect(wrapper.emitted("handle-preview")[0]).toEqual([99]);
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([99]);
  });

  it("renders multiple rows with sequential numbering (v-for non-empty, index increments)", () => {
    const articles = [
      { id: 10, title: "Row A", status: "published" },
      { id: 11, title: "Row B", status: "scheduled" },
      { id: 12, title: "Row C", status: "archived" },
    ];
    const wrapper = mountTable({ isLoading: false, articles, page: 1, pageSize: 5 });

    // No empty state when articles present.
    expect(wrapper.text()).not.toContain("No articles found");

    // page * pageSize + index + 1 = 1*5 + {0,1,2} + 1 = 6, 7, 8
    const rowNumbers = wrapper
      .findAll("tbody tr")
      .map((tr) => tr.find("td").text());
    expect(rowNumbers).toEqual(["6", "7", "8"]);

    // status badge branches: published -> success, scheduled -> warning, archived -> danger
    const statusSpans = wrapper.findAll("span.capitalize");
    expect(statusSpans[0].classes()).toContain("bg-success");
    expect(statusSpans[1].classes()).toContain("bg-warning");
    expect(statusSpans[2].classes()).toContain("bg-danger");
  });
});

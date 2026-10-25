import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

import AdsTable from "@/views/Admin/Ads/Partials/AdsTable.vue";

/* ------------------------------------------------------------------ */
/* AdsTable is a purely presentational component. Its only import is   */
/* the pure helpers from "@/utils" (formatAdLocation,                  */
/* getAdLocationBadgeClass, getStatusBadgeClass) which have no heavy   */
/* boundaries, so we exercise the real implementations and assert the  */
/* rendered output they produce.                                       */
/* ------------------------------------------------------------------ */

const mountTable = (props = {}) =>
  mount(AdsTable, {
    props: {
      ads: [],
      isLoading: false,
      ...props,
    },
  });

describe("AdsTable.vue", () => {
  beforeEach(() => {
    // nothing to reset; component is stateless
  });

  it("renders 5 shimmer rows while isLoading is true (loading branch)", () => {
    const wrapper = mountTable({ isLoading: true, ads: [] });

    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    // v-for="i in 5" -> exactly 5 shimmer rows
    expect(shimmerRows).toHaveLength(5);
    // loading branch -> no "No ads found" empty-state, no data rows
    expect(wrapper.text()).not.toContain("No ads found");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders the empty state when not loading and ads is empty (ads.length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, ads: [] });

    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No ads found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("11");
  });

  it("renders fully-populated ad rows and drives every truthy/value-present branch", () => {
    const ads = [
      {
        id: 1,
        title: "Full Ad",
        image: { file: "https://cdn.example.com/a.png" },
        placement: { location: "home_banner" },
        business: { name: "Acme Co" },
        payment: { payment_method: "card" },
        total_cost: 1500,
        impressions: 42,
        clicks: 7,
        status: "active",
        placement_date: "2026-01-01T08:00:00Z",
        expiry_date: "2026-02-01T08:00:00Z",
      },
    ];

    const wrapper = mountTable({ isLoading: false, ads, page: 2, pageSize: 10 });

    // No empty-state / no shimmer in the success render.
    expect(wrapper.text()).not.toContain("No ads found");
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);

    // Row number = page * pageSize + index + 1 = 2 * 10 + 0 + 1 = 21
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("21");

    // ad.image truthy -> img rendered with ad.image.file
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn.example.com/a.png");

    // title rendered
    expect(wrapper.text()).toContain("Full Ad");

    // placement present -> formatAdLocation("home_banner") = "Home Banner"
    // and getAdLocationBadgeClass("home_banner") = "badge bg-primary"
    const placementSpan = wrapper.find("td.d-lg-none-custom span.text-uppercase");
    expect(placementSpan.text()).toBe("Home Banner");
    expect(placementSpan.classes()).toContain("bg-primary");

    // business / payment / total_cost present
    expect(wrapper.text()).toContain("Acme Co");
    expect(wrapper.text()).toContain("card");
    expect(wrapper.text()).toContain("1500");

    // impressions / clicks present
    expect(wrapper.text()).toContain("42");
    expect(wrapper.text()).toContain("7");

    // status present -> getStatusBadgeClass("active") = "badge bg-success"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("active");
    expect(statusSpan.classes()).toContain("bg-success");

    // placement_date / expiry_date present -> split("T")[0]
    expect(wrapper.text()).toContain("2026-01-01");
    expect(wrapper.text()).toContain("2026-02-01");
  });

  it("renders ad rows with all optional values absent and drives every falsy/?? fallback branch", () => {
    const ads = [
      {
        id: 2,
        title: "Sparse Ad",
        // image absent -> v-if="ad.image" false (no img)
        // placement absent -> location ?? "-" -> formatAdLocation("-")
        // business absent -> ?? "-"
        // payment absent -> ?? "-"
        // total_cost absent -> ?? "-"
        // impressions absent -> ?? "-"
        // clicks absent -> ?? "-"
        status: "unknown-status", // default badge branch
        // placement_date absent -> ?.split undefined
        // expiry_date absent -> ?.split undefined
      },
    ];

    const wrapper = mountTable({ isLoading: false, ads });

    // ad.image falsy -> no thumbnail image
    expect(wrapper.find("img").exists()).toBe(false);

    // page defaults to 0, pageSize 10 -> 0*10 + 0 + 1 = 1
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("1");

    // placement absent -> location coerced to "-" -> formatAdLocation("-") = "-"
    // getAdLocationBadgeClass(undefined) -> "badge bg-dark"
    const placementSpan = wrapper.find("td.d-lg-none-custom span.text-uppercase");
    expect(placementSpan.text()).toBe("-");
    expect(placementSpan.classes()).toContain("bg-dark");

    // business / payment / total_cost fallbacks render "-"
    const truncateSpans = wrapper.findAll("span.truncate-2");
    expect(truncateSpans).toHaveLength(3);
    truncateSpans.forEach((s) => expect(s.text()).toBe("-"));

    // impressions / clicks fallbacks render "-"
    // status -> default badge branch "badge bg-secondary"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("unknown-status");
    expect(statusSpan.classes()).toContain("bg-secondary");

    // placement_date / expiry_date absent -> optional chaining yields empty render
    // (the date cells are empty, not throwing)
    expect(wrapper.text()).toContain("Sparse Ad");
  });

  it("emits handle-edit and handle-delete with the ad id when action buttons are clicked", async () => {
    const ads = [{ id: 99, title: "Action Ad", status: "draft" }];
    const wrapper = mountTable({ isLoading: false, ads });

    const editBtn = wrapper.find("button.text-success");
    const deleteBtn = wrapper.find("button.text-danger");
    expect(editBtn.exists()).toBe(true);
    expect(deleteBtn.exists()).toBe(true);

    await editBtn.trigger("click");
    await deleteBtn.trigger("click");

    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([99]);
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([99]);
  });

  it("renders multiple rows with correct sequential numbering (v-for non-empty, index increments)", () => {
    const ads = [
      { id: 10, title: "Row A", status: "published" },
      { id: 11, title: "Row B", status: "scheduled" },
      { id: 12, title: "Row C", status: "archived" },
    ];
    const wrapper = mountTable({ isLoading: false, ads, page: 1, pageSize: 5 });

    // No empty state when ads present.
    expect(wrapper.text()).not.toContain("No ads found");

    // page * pageSize + index + 1 = 1*5 + {0,1,2} + 1 = 6, 7, 8
    const numberCells = wrapper.findAll("td.d-md-none-custom");
    // First cell of each data row is the "No." cell.
    const rowNumbers = wrapper
      .findAll("tbody tr")
      .map((tr) => tr.find("td").text());
    expect(rowNumbers).toEqual(["6", "7", "8"]);
    expect(numberCells.length).toBeGreaterThan(0);

    // status badge branches: published -> success, scheduled -> warning, archived -> danger
    const statusSpans = wrapper.findAll("span.capitalize");
    expect(statusSpans[0].classes()).toContain("bg-success");
    expect(statusSpans[1].classes()).toContain("bg-warning");
    expect(statusSpans[2].classes()).toContain("bg-danger");
  });
});

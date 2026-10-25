import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AdPlacementsTable from "./AdPlacementsTable.vue";

// Stub the child component because it imports a heavy media service boundary.
vi.mock("../../Articles/Partials/TableImageWithPlaceholder.vue", () => ({
  default: {
    name: "TableImageWithPlaceholder",
    props: ["mediaId"],
    template: '<div class="table-image-stub" :data-media-id="mediaId"></div>',
  },
}));

function makeAd(overrides = {}) {
  return {
    id: 1,
    image: "https://example.com/img.png",
    image_id: 99,
    location: "home_banner",
    description: "Some description",
    fee: 100,
    aspect_ratio: "16:9",
    fee_type: "flat",
    billing_unit: "month",
    is_rotating: true,
    status: "active",
    ...overrides,
  };
}

function mountTable(props = {}) {
  return mount(AdPlacementsTable, {
    props: {
      adPlacements: [],
      isLoading: false,
      ...props,
    },
  });
}

describe("AdPlacementsTable.vue", () => {
  it("renders 5 shimmer rows while loading (isLoading branch)", () => {
    const wrapper = mountTable({ isLoading: true, adPlacements: [] });
    const shimmerRows = wrapper.findAll(".shimmer-row");
    expect(shimmerRows).toHaveLength(5);
    // No empty/data rows should render in loading state.
    expect(wrapper.text()).not.toContain("No Ad Placements found");
  });

  it("renders empty-state row when not loading and list is empty (length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, adPlacements: [] });
    expect(wrapper.find(".shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No Ad Placements found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.attributes("colspan")).toBe("11");
  });

  it("renders a data row with <img> when ad.image is present (v-if image branch)", () => {
    const ad = makeAd({ image: "https://example.com/pic.png", image_id: 99 });
    const wrapper = mountTable({ adPlacements: [ad], isLoading: false, page: 0, pageSize: 10 });

    // No empty state.
    expect(wrapper.text()).not.toContain("No Ad Placements found");

    const img = wrapper.find("img.rounded");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.com/pic.png");

    // image branch wins over image_id -> stub must NOT render.
    expect(wrapper.find(".table-image-stub").exists()).toBe(false);
  });

  it("renders TableImageWithPlaceholder when no image but image_id present (v-else-if branch)", () => {
    const ad = makeAd({ image: null, image_id: 42 });
    const wrapper = mountTable({ adPlacements: [ad] });

    expect(wrapper.find("img.rounded").exists()).toBe(false);
    const stub = wrapper.find(".table-image-stub");
    expect(stub.exists()).toBe(true);
    expect(stub.attributes("data-media-id")).toBe("42");
  });

  it("renders neither image nor placeholder when both image and image_id are falsy", () => {
    const ad = makeAd({ image: null, image_id: null });
    const wrapper = mountTable({ adPlacements: [ad] });

    expect(wrapper.find("img.rounded").exists()).toBe(false);
    expect(wrapper.find(".table-image-stub").exists()).toBe(false);
  });

  it("computes the row number from page * pageSize + index + 1", () => {
    const ads = [makeAd({ id: 1 }), makeAd({ id: 2 })];
    const wrapper = mountTable({ adPlacements: ads, page: 2, pageSize: 10 });

    const rows = wrapper.findAll("tbody tr");
    // First data row index 0 -> 2*10 + 0 + 1 = 21
    expect(rows[0].find("td.d-md-none-custom").text()).toBe("21");
    // Second data row index 1 -> 2*10 + 1 + 1 = 22
    expect(rows[1].find("td.d-md-none-custom").text()).toBe("22");
  });

  it("uses default page/pageSize when not provided", () => {
    const ads = [makeAd({ id: 1 })];
    const wrapper = mount(AdPlacementsTable, {
      props: { adPlacements: ads, isLoading: false },
    });
    // default page 0, default pageSize 10 -> 0*10 + 0 + 1 = 1
    expect(wrapper.find("tbody tr td.d-md-none-custom").text()).toBe("1");
  });

  it("renders the location badge and formatted location (location present branch)", () => {
    const ad = makeAd({ location: "in_article_top" });
    const wrapper = mountTable({ adPlacements: [ad] });
    const locationSpan = wrapper.find("span.text-uppercase");
    expect(locationSpan.text()).toBe("In Article Top");
    // getAdLocationBadgeClass maps in_article_top -> badge bg-success
    expect(locationSpan.classes()).toContain("bg-success");
  });

  it("falls back to '-' label when location is null (?? branch) and uses default badge", () => {
    const ad = makeAd({ location: null });
    const wrapper = mountTable({ adPlacements: [ad] });
    const locationSpan = wrapper.find("span.text-uppercase");
    // formatAdLocation("-") -> "-"
    expect(locationSpan.text()).toBe("-");
    // getAdLocationBadgeClass(null) -> badge bg-dark (default)
    expect(locationSpan.classes()).toContain("bg-dark");
  });

  it("renders description when present (?? present branch)", () => {
    const ad = makeAd({ description: "Hello world" });
    const wrapper = mountTable({ adPlacements: [ad] });
    expect(wrapper.find("span.truncate-2").text()).toBe("Hello world");
  });

  it("renders '-' description fallback when description is null (?? null branch)", () => {
    const ad = makeAd({ description: null });
    const wrapper = mountTable({ adPlacements: [ad] });
    expect(wrapper.find("span.truncate-2").text()).toBe("-");
  });

  it("renders 'Yes' for is_rotating truthy and active status badge", () => {
    const ad = makeAd({ is_rotating: true, status: "active" });
    const wrapper = mountTable({ adPlacements: [ad] });
    const rotatingCells = wrapper.findAll("span.capitalize");
    // first capitalize span = rotating, second = status
    expect(rotatingCells[0].text()).toBe("Yes");
    // getStatusBadgeClass(Number(true)=1) -> badge bg-success
    expect(rotatingCells[0].classes()).toContain("bg-success");
    expect(rotatingCells[1].text()).toBe("active");
    expect(rotatingCells[1].classes()).toContain("bg-success");
  });

  it("renders 'No' for is_rotating falsy and draft status badge", () => {
    const ad = makeAd({ is_rotating: false, status: "draft" });
    const wrapper = mountTable({ adPlacements: [ad] });
    const cells = wrapper.findAll("span.capitalize");
    expect(cells[0].text()).toBe("No");
    // getStatusBadgeClass(Number(false)=0) -> badge bg-info
    expect(cells[0].classes()).toContain("bg-info");
    expect(cells[1].text()).toBe("draft");
    expect(cells[1].classes()).toContain("bg-info");
  });

  it("emits handle-edit with the ad id when the edit button is clicked", async () => {
    const ad = makeAd({ id: 777 });
    const wrapper = mountTable({ adPlacements: [ad] });
    const editBtn = wrapper.find("button.text-primary");
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger("click");

    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([777]);
  });

  it("renders fee, aspect_ratio, fee_type and billing_unit cell values", () => {
    const ad = makeAd({
      fee: 250,
      aspect_ratio: "4:3",
      fee_type: "recurring",
      billing_unit: "week",
    });
    const wrapper = mountTable({ adPlacements: [ad] });
    const text = wrapper.text();
    expect(text).toContain("250");
    expect(text).toContain("4:3");
    expect(text).toContain("recurring");
    expect(text).toContain("week");
  });
});

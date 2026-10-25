import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdsTable from "./AdsTable.vue";

function makeAd(overrides = {}) {
  return {
    id: 1,
    image: { file: "https://example.com/img.png" },
    title: "My Ad Title",
    placement: { location: "home_banner" },
    payment: { payment_method: "card" },
    total_cost: 1500,
    placement_date: "2026-01-01T10:00:00Z",
    expiry_date: "2026-02-01T10:00:00Z",
    status: "draft",
    impressions: 120,
    clicks: 45,
    ...overrides,
  };
}

function mountTable(props = {}) {
  return mount(AdsTable, {
    props: {
      ads: [],
      isLoading: false,
      ...props,
    },
  });
}

describe("AdsTable.vue", () => {
  it("renders 5 shimmer rows while loading (isLoading branch + v-for i in 5)", () => {
    const wrapper = mountTable({ isLoading: true, ads: [] });
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(5);
    // The else template must not render anything.
    expect(wrapper.text()).not.toContain("No ads found");
  });

  it("renders empty-state row when not loading and list is empty (length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, ads: [] });
    expect(wrapper.find(".shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No ads found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.attributes("colspan")).toBe("11");
  });

  it("renders a data row with <img> when ad.image is present (v-if image truthy branch)", () => {
    const ad = makeAd({ image: { file: "https://example.com/pic.png" } });
    const wrapper = mountTable({ ads: [ad], isLoading: false, page: 0, pageSize: 10 });

    expect(wrapper.text()).not.toContain("No ads found");
    const img = wrapper.find("img.rounded");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.com/pic.png");
    expect(img.attributes("alt")).toBe("article thumbnail");
    // title rendered
    expect(wrapper.text()).toContain("My Ad Title");
  });

  it("renders no <img> when ad.image is falsy (v-if image falsy branch)", () => {
    const ad = makeAd({ image: null });
    const wrapper = mountTable({ ads: [ad] });
    expect(wrapper.find("img.rounded").exists()).toBe(false);
  });

  it("handles ad.image present but image.file undefined (?. on image.file)", () => {
    const ad = makeAd({ image: {} }); // truthy image, but no .file
    const wrapper = mountTable({ ads: [ad] });
    const img = wrapper.find("img.rounded");
    expect(img.exists()).toBe(true);
    // src bound to undefined -> attribute absent
    expect(img.attributes("src")).toBeUndefined();
  });

  it("computes the row number from page * pageSize + index + 1", () => {
    const ads = [makeAd({ id: 1 }), makeAd({ id: 2 })];
    const wrapper = mountTable({ ads, page: 2, pageSize: 10 });
    const rows = wrapper.findAll("tbody tr");
    // index 0 -> 2*10 + 0 + 1 = 21
    expect(rows[0].find("td.d-md-none-custom").text()).toBe("21");
    // index 1 -> 2*10 + 1 + 1 = 22
    expect(rows[1].find("td.d-md-none-custom").text()).toBe("22");
  });

  it("uses default page/pageSize when not provided", () => {
    const wrapper = mount(AdsTable, {
      props: { ads: [makeAd({ id: 1 })], isLoading: false },
    });
    // default page 0, pageSize 10 -> 0*10 + 0 + 1 = 1
    expect(wrapper.find("tbody tr td.d-md-none-custom").text()).toBe("1");
  });

  it("renders location badge + formatted location (placement.location present branch)", () => {
    const ad = makeAd({ placement: { location: "in_article_top" } });
    const wrapper = mountTable({ ads: [ad] });
    const span = wrapper.find("span.text-uppercase");
    // formatAdLocation("in_article_top") -> "In Article Top"
    expect(span.text()).toBe("In Article Top");
    // getAdLocationBadgeClass("in_article_top") -> badge bg-success
    expect(span.classes()).toContain("bg-success");
  });

  it("falls back to '-' label and default badge when placement is undefined (?? + ?. branches)", () => {
    const ad = makeAd({ placement: undefined });
    const wrapper = mountTable({ ads: [ad] });
    const span = wrapper.find("span.text-uppercase");
    // ad.placement?.location -> undefined -> ?? "-" -> "-"
    expect(span.text()).toBe("-");
    // getAdLocationBadgeClass(undefined) -> badge bg-dark (default)
    expect(span.classes()).toContain("bg-dark");
  });

  it("renders payment_method when present (?? present branch)", () => {
    const ad = makeAd({ payment: { payment_method: "EFT" } });
    const wrapper = mountTable({ ads: [ad] });
    expect(wrapper.find("span.truncate-2").text()).toBe("EFT");
  });

  it("renders '-' payment fallback when payment is missing (?? null branch)", () => {
    const ad = makeAd({ payment: null });
    const wrapper = mountTable({ ads: [ad] });
    expect(wrapper.find("span.truncate-2").text()).toBe("-");
  });

  it("renders total_cost when present and '-' when missing (?? both branches)", () => {
    const withCost = mountTable({ ads: [makeAd({ total_cost: 999 })] });
    expect(withCost.find("td.fw-semibold").text()).toBe("999");

    const noCost = mountTable({ ads: [makeAd({ total_cost: null })] });
    expect(noCost.find("td.fw-semibold").text()).toBe("-");
  });

  it("renders split placement/expiry dates and handles missing dates (?. split branches)", () => {
    const withDates = mountTable({
      ads: [makeAd({ placement_date: "2026-01-05T08:00:00Z", expiry_date: "2026-03-09T08:00:00Z" })],
    });
    const t = withDates.text();
    expect(t).toContain("2026-01-05");
    expect(t).toContain("2026-03-09");

    // undefined dates -> ?. short-circuits, cells render empty
    const noDates = mountTable({
      ads: [makeAd({ placement_date: undefined, expiry_date: undefined })],
    });
    const dateCells = noDates.findAll("tbody tr td.d-md-none-custom");
    // dateCells: [No., start, end, impressions, clicks] -> start=index1, end=index2
    expect(dateCells[1].text()).toBe("");
    expect(dateCells[2].text()).toBe("");
  });

  it("renders impressions/clicks values and '-' fallbacks (?? both branches)", () => {
    const withVals = mountTable({ ads: [makeAd({ impressions: 300, clicks: 7 })] });
    let cells = withVals.findAll("tbody tr td.d-md-none-custom");
    // order: No.(0), start(1), end(2), impressions(3), clicks(4)
    expect(cells[3].text()).toBe("300");
    expect(cells[4].text()).toBe("7");

    const noVals = mountTable({ ads: [makeAd({ impressions: null, clicks: null })] });
    cells = noVals.findAll("tbody tr td.d-md-none-custom");
    expect(cells[3].text()).toBe("-");
    expect(cells[4].text()).toBe("-");
  });

  it("renders status badge class for draft status", () => {
    const ad = makeAd({ status: "draft" });
    const wrapper = mountTable({ ads: [ad] });
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("draft");
    // getStatusBadgeClass("draft") -> badge bg-info
    expect(statusSpan.classes()).toContain("bg-info");
  });

  it("shows the delete button when status != 'active' (v-if true branch) and emits handle-delete", async () => {
    const ad = makeAd({ id: 555, status: "draft" });
    const wrapper = mountTable({ ads: [ad] });
    const deleteBtn = wrapper.find("button.text-danger");
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger("click");
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([555]);
  });

  it("hides the delete button when status == 'active' (v-if false branch)", () => {
    const ad = makeAd({ id: 1, status: "active" });
    const wrapper = mountTable({ ads: [ad] });
    expect(wrapper.find("button.text-danger").exists()).toBe(false);
    // active status badge -> bg-success
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("active");
    expect(statusSpan.classes()).toContain("bg-success");
  });

  it("emits handle-preview with the ad id when the preview button is clicked", async () => {
    const ad = makeAd({ id: 111 });
    const wrapper = mountTable({ ads: [ad] });
    const previewBtn = wrapper.find("button.text-secondary");
    expect(previewBtn.exists()).toBe(true);
    await previewBtn.trigger("click");
    expect(wrapper.emitted("handle-preview")).toBeTruthy();
    expect(wrapper.emitted("handle-preview")[0]).toEqual([111]);
  });

  it("emits handle-edit with the ad id when the edit button is clicked", async () => {
    const ad = makeAd({ id: 222 });
    const wrapper = mountTable({ ads: [ad] });
    const editBtn = wrapper.find("button.text-success");
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger("click");
    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([222]);
  });
});

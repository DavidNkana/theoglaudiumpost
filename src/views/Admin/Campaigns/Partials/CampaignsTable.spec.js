import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import CampaignsTable from "@/views/Admin/Campaigns/Partials/CampaignsTable.vue";

/* ------------------------------------------------------------------ */
/* CampaignsTable is a purely presentational component. Its only       */
/* import is the pure helper getStatusBadgeClass from "@/utils", which */
/* has no heavy boundaries, so we exercise the real implementation and */
/* assert the rendered output / emitted events it produces.            */
/* ------------------------------------------------------------------ */

const mountTable = (props = {}) =>
  mount(CampaignsTable, {
    props: {
      campaigns: [],
      isLoading: false,
      ...props,
    },
  });

describe("CampaignsTable.vue", () => {
  it("renders 5 shimmer rows while isLoading is true (v-if=isLoading branch)", () => {
    const wrapper = mountTable({ isLoading: true, campaigns: [] });

    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    // v-for="i in 5" -> exactly 5 shimmer rows
    expect(shimmerRows).toHaveLength(5);
    // loading branch -> no empty-state, no data action buttons
    expect(wrapper.text()).not.toContain("No campaigns found");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders the empty state when not loading and campaigns is empty (campaigns.length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, campaigns: [] });

    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No campaigns found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("11");
    // empty list -> no data rows / no action buttons rendered
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders a fully-populated campaign row driving every truthy/value-present branch", () => {
    const campaigns = [
      {
        id: 1,
        name: "Summer Promo",
        business: { name: "Acme Co" },
        is_recurring: true,
        transaction_ref: "TXN-001",
        status: "active",
        start_date: "2026-01-01T08:00:00Z",
        end_date: "2026-02-01T08:00:00Z",
      },
    ];

    const wrapper = mountTable({
      isLoading: false,
      campaigns,
      page: 2,
      pageSize: 10,
    });

    // No empty-state / no shimmer in the success render.
    expect(wrapper.text()).not.toContain("No campaigns found");
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);

    // Row number = page * pageSize + index + 1 = 2 * 10 + 0 + 1 = 21
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("21");

    // name rendered
    expect(wrapper.find("div.truncate-1").text()).toBe("Summer Promo");

    // business present -> campaign.business?.name ?? "-" => "Acme Co"
    const businessSpan = wrapper.find("span.truncate-2");
    expect(businessSpan.text()).toBe("Acme Co");

    // is_recurring truthy -> "badge bg-success" + "Recurring" label
    const recurringSpan = wrapper.findAll("td.d-lg-none-custom span")[1];
    expect(recurringSpan.text()).toBe("Recurring");
    expect(recurringSpan.classes()).toContain("bg-success");

    // transaction_ref rendered
    expect(wrapper.text()).toContain("TXN-001");

    // status present -> getStatusBadgeClass("active") = "badge bg-success"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("active");
    expect(statusSpan.classes()).toContain("bg-success");

    // start_date / end_date present -> ?.split("T")[0]
    expect(wrapper.text()).toContain("2026-01-01");
    expect(wrapper.text()).toContain("2026-02-01");
  });

  it("renders a sparse campaign row driving every falsy/?? fallback branch", () => {
    const campaigns = [
      {
        id: 2,
        name: "Sparse Campaign",
        // business absent -> campaign.business?.name ?? "-" => "-"
        is_recurring: false, // ternary false -> "badge bg-secondary" + "One-time"
        // transaction_ref absent
        status: "unknown-status", // default badge branch -> "badge bg-secondary"
        // start_date absent -> ?.split undefined
        // end_date absent -> ?.split undefined
      },
    ];

    const wrapper = mountTable({ isLoading: false, campaigns });

    // page defaults to 0, pageSize 10 -> 0*10 + 0 + 1 = 1
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("1");

    // business absent -> "?? '-'" fallback
    const businessSpan = wrapper.find("span.truncate-2");
    expect(businessSpan.text()).toBe("-");

    // is_recurring falsy -> "One-time" + "badge bg-secondary"
    const recurringSpan = wrapper.findAll("td.d-lg-none-custom span")[1];
    expect(recurringSpan.text()).toBe("One-time");
    expect(recurringSpan.classes()).toContain("bg-secondary");

    // status -> default badge branch "badge bg-secondary"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("unknown-status");
    expect(statusSpan.classes()).toContain("bg-secondary");

    // start_date / end_date absent -> optional chaining yields empty render (no throw)
    expect(wrapper.text()).toContain("Sparse Campaign");
  });

  it("emits handle-edit and handle-delete with the campaign id when action buttons are clicked", async () => {
    const campaigns = [{ id: 99, name: "Action Campaign", status: "draft" }];
    const wrapper = mountTable({ isLoading: false, campaigns });

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

  it("renders multiple rows with sequential numbering and per-status badge branches (v-for non-empty)", () => {
    const campaigns = [
      { id: 10, name: "Row A", status: "published", is_recurring: true },
      { id: 11, name: "Row B", status: "scheduled", is_recurring: false },
      { id: 12, name: "Row C", status: "archived", is_recurring: true },
    ];
    const wrapper = mountTable({
      isLoading: false,
      campaigns,
      page: 1,
      pageSize: 5,
    });

    // No empty state when campaigns present.
    expect(wrapper.text()).not.toContain("No campaigns found");

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

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import CampaignsTable from "@/views/Business/Campaigns/Partials/CampaignsTable.vue";

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
  it("renders 5 shimmer rows while isLoading is true (loading branch)", () => {
    const wrapper = mountTable({ isLoading: true, campaigns: [] });

    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    // v-if="isLoading" -> v-for="i in 5" -> exactly 5 shimmer rows
    expect(shimmerRows).toHaveLength(5);
    // loading branch -> no empty-state, no data rows / buttons
    expect(wrapper.text()).not.toContain("No campaigns found");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders the empty state when not loading and campaigns is empty (length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, campaigns: [] });

    // v-else branch, campaigns.length === 0 -> empty-state row
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No campaigns found");

    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("11");

    // No data v-for rows render.
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders a fully-populated non-active recurring campaign (truthy + delete-visible branches)", async () => {
    const campaigns = [
      {
        id: 1,
        name: "Spring Sale",
        is_recurring: true,
        transaction_ref: "TXN-1001",
        status: "draft", // != 'active' -> delete button present; draft -> bg-info
        start_date: "2026-03-01T08:00:00Z",
        end_date: "2026-04-01T08:00:00Z",
      },
    ];

    const wrapper = mountTable({
      isLoading: false,
      campaigns,
      page: 2,
      pageSize: 10,
    });

    // Not loading, not empty -> no shimmer / no empty state.
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("No campaigns found");

    // Row number = page * pageSize + index + 1 = 2 * 10 + 0 + 1 = 21
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("21");

    // name rendered
    expect(wrapper.text()).toContain("Spring Sale");

    // is_recurring truthy -> "Recurring" / badge bg-success
    const recurringSpan = wrapper.find("td.d-lg-none-custom span");
    expect(recurringSpan.text()).toBe("Recurring");
    expect(recurringSpan.classes()).toContain("bg-success");

    // transaction_ref rendered
    expect(wrapper.text()).toContain("TXN-1001");

    // status present -> getStatusBadgeClass("draft") = "badge bg-info"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("draft");
    expect(statusSpan.classes()).toContain("bg-info");

    // start_date / end_date present -> optional chaining + split("T")[0]
    expect(wrapper.text()).toContain("2026-03-01");
    expect(wrapper.text()).toContain("2026-04-01");

    // Edit button always present -> emits handle-edit with id.
    const editBtn = wrapper.find("button.text-success");
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger("click");
    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([1]);

    // status != 'active' -> delete button present -> emits handle-delete with id.
    const deleteBtn = wrapper.find("button.text-danger");
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger("click");
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([1]);
  });

  it("renders a sparse one-time active campaign (falsy + delete-hidden + optional-chaining-absent branches)", () => {
    const campaigns = [
      {
        id: 2,
        name: "Always On",
        is_recurring: false, // -> "One-time" / badge bg-secondary
        // transaction_ref absent -> empty render
        status: "active", // == 'active' -> delete button hidden; active -> bg-success
        // start_date absent -> campaign.start_date?.split undefined (no throw)
        // end_date absent -> campaign.end_date?.split undefined (no throw)
      },
    ];

    const wrapper = mountTable({ isLoading: false, campaigns });

    // page defaults to 0, pageSize defaults to 10 -> 0*10 + 0 + 1 = 1
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("1");

    expect(wrapper.text()).toContain("Always On");

    // is_recurring falsy -> "One-time" / badge bg-secondary
    const recurringSpan = wrapper.find("td.d-lg-none-custom span");
    expect(recurringSpan.text()).toBe("One-time");
    expect(recurringSpan.classes()).toContain("bg-secondary");

    // status "active" -> getStatusBadgeClass -> "badge bg-success"
    const statusSpan = wrapper.find("span.capitalize");
    expect(statusSpan.text()).toBe("active");
    expect(statusSpan.classes()).toContain("bg-success");

    // status == 'active' -> delete button NOT rendered.
    expect(wrapper.find("button.text-danger").exists()).toBe(false);
    // Edit button still rendered.
    expect(wrapper.find("button.text-success").exists()).toBe(true);

    // start_date / end_date absent -> optional chaining yields empty render (no throw).
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
  });

  it("renders multiple rows with sequential numbering (v-for non-empty, index increments)", () => {
    const campaigns = [
      { id: 10, name: "Row A", is_recurring: true, status: "scheduled" },
      { id: 11, name: "Row B", is_recurring: false, status: "failed" },
      { id: 12, name: "Row C", is_recurring: true, status: "weird" },
    ];

    const wrapper = mountTable({
      isLoading: false,
      campaigns,
      page: 1,
      pageSize: 5,
    });

    expect(wrapper.text()).not.toContain("No campaigns found");

    // page * pageSize + index + 1 = 1*5 + {0,1,2} + 1 = 6, 7, 8
    const rowNumbers = wrapper
      .findAll("tbody tr")
      .map((tr) => tr.find("td").text());
    expect(rowNumbers).toEqual(["6", "7", "8"]);

    // status badge branches: scheduled -> warning, failed -> danger, default -> secondary
    const statusSpans = wrapper.findAll("span.capitalize");
    expect(statusSpans[0].classes()).toContain("bg-warning");
    expect(statusSpans[1].classes()).toContain("bg-danger");
    expect(statusSpans[2].classes()).toContain("bg-secondary");
  });
});

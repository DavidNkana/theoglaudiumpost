import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* BusinessesTable is a presentational table. Its only external        */
/* boundary is the useAuth composable, used solely for hasRole(). We   */
/* mock useAuth so we can drive hasRole() to BOTH true (superadmin ->  */
/* delete button rendered) and false (delete button v-if hidden).      */
/* ------------------------------------------------------------------ */

const hasRoleMock = vi.fn();

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    hasRole: hasRoleMock,
  }),
}));

import BusinessesTable from "@/views/Admin/Businesses/Partials/BusinessesTable.vue";

const mountTable = (props = {}) =>
  mount(BusinessesTable, {
    props: {
      businesses: [],
      isLoading: false,
      ...props,
    },
  });

describe("BusinessesTable.vue", () => {
  beforeEach(() => {
    hasRoleMock.mockReset();
    // default: not a superadmin
    hasRoleMock.mockReturnValue(false);
  });

  it("renders 5 shimmer rows while isLoading is true (loading branch)", () => {
    const wrapper = mountTable({ isLoading: true, businesses: [] });

    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    // v-for="i in 5" -> exactly 5 shimmer rows
    expect(shimmerRows).toHaveLength(5);
    // loading branch -> no empty-state, no data rows / action buttons
    expect(wrapper.text()).not.toContain("No businesses found");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders the empty state when not loading and businesses is empty (length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, businesses: [] });

    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No businesses found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("11");
  });

  it("renders fully-populated business rows and drives every value-present branch (superadmin)", () => {
    hasRoleMock.mockReturnValue(true); // superadmin -> delete button rendered

    const businesses = [
      {
        id: 1,
        name: "Acme Co",
        email: "acme@example.com",
        phone: "+27 11 555 0000",
        location: "Johannesburg",
        campaigns: 12,
        ads: 7,
      },
    ];

    const wrapper = mountTable({
      isLoading: false,
      businesses,
      page: 2,
      pageSize: 10,
    });

    // No empty-state / no shimmer in the success render.
    expect(wrapper.text()).not.toContain("No businesses found");
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);

    // Row number = page * pageSize + index + 1 = 2 * 10 + 0 + 1 = 21
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("21");

    // name / email / phone rendered
    expect(wrapper.text()).toContain("Acme Co");
    expect(wrapper.text()).toContain("acme@example.com");
    expect(wrapper.text()).toContain("+27 11 555 0000");

    // location / campaigns / ads present (?? fallbacks NOT taken)
    const truncate2 = wrapper.findAll("span.truncate-2");
    expect(truncate2).toHaveLength(3);
    expect(truncate2[0].text()).toBe("Johannesburg");
    expect(truncate2[1].text()).toBe("12");
    expect(truncate2[2].text()).toBe("7");

    // hasRole('superadmin') truthy -> delete button rendered
    expect(hasRoleMock).toHaveBeenCalledWith("superadmin");
    expect(wrapper.find("button.text-success").exists()).toBe(true);
    expect(wrapper.find("button.text-danger").exists()).toBe(true);
  });

  it("renders business rows with location/campaigns/ads absent driving every ?? fallback (non-superadmin)", () => {
    hasRoleMock.mockReturnValue(false); // delete button v-if false -> hidden

    const businesses = [
      {
        id: 2,
        name: "Sparse Biz",
        email: "sparse@example.com",
        phone: "000",
        // location absent -> location ?? "-"
        // campaigns absent -> business?.campaigns ?? "-"
        // ads absent -> business?.ads ?? "-"
      },
    ];

    const wrapper = mountTable({ isLoading: false, businesses });

    // page defaults to 0, pageSize 10 -> 0*10 + 0 + 1 = 1
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("1");

    // location / campaigns / ads fallbacks all render "-"
    const truncate2 = wrapper.findAll("span.truncate-2");
    expect(truncate2).toHaveLength(3);
    truncate2.forEach((s) => expect(s.text()).toBe("-"));

    // hasRole('superadmin') falsy -> only edit button, no delete button
    expect(wrapper.find("button.text-success").exists()).toBe(true);
    expect(wrapper.find("button.text-danger").exists()).toBe(false);
  });

  it("emits handle-edit (and handle-delete for superadmin) with the business id on button click", async () => {
    hasRoleMock.mockReturnValue(true); // ensure delete button exists

    const businesses = [
      { id: 99, name: "Action Biz", email: "a@b.c", phone: "1" },
    ];
    const wrapper = mountTable({ isLoading: false, businesses });

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
    hasRoleMock.mockReturnValue(false);

    const businesses = [
      { id: 10, name: "Row A", email: "a@x.c", phone: "1" },
      { id: 11, name: "Row B", email: "b@x.c", phone: "2" },
      { id: 12, name: "Row C", email: "c@x.c", phone: "3" },
    ];
    const wrapper = mountTable({
      isLoading: false,
      businesses,
      page: 1,
      pageSize: 5,
    });

    // No empty state when businesses present.
    expect(wrapper.text()).not.toContain("No businesses found");

    // page * pageSize + index + 1 = 1*5 + {0,1,2} + 1 = 6, 7, 8
    const rowNumbers = wrapper
      .findAll("tbody tr")
      .map((tr) => tr.find("td").text());
    expect(rowNumbers).toEqual(["6", "7", "8"]);

    // names rendered in order
    expect(wrapper.text()).toContain("Row A");
    expect(wrapper.text()).toContain("Row B");
    expect(wrapper.text()).toContain("Row C");
  });
});

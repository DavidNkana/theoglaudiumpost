import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* UsersTable is a purely presentational table partial. It has no      */
/* external boundaries (no composables, no store, no services), so no  */
/* mocking is required. Every branch is driven through props alone:    */
/*   - isLoading -> shimmer rows                                       */
/*   - users.length === 0 -> empty state                              */
/*   - populated rows exercise the role label ?? chain (match /       */
/*     no-match / nullish roleId) and the createdAt ?? default.       */
/* ------------------------------------------------------------------ */

import UsersTable from "@/views/Admin/Users/Partials/UsersTable.vue";

const mountTable = (props = {}) =>
  mount(UsersTable, {
    props: {
      users: [],
      isLoading: false,
      ...props,
    },
  });

describe("UsersTable.vue", () => {
  it("renders 5 shimmer rows while isLoading is true (loading branch)", () => {
    const wrapper = mountTable({ isLoading: true, users: [] });

    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    // v-for="i in 5" -> exactly 5 shimmer rows
    expect(shimmerRows).toHaveLength(5);
    // loading branch -> no empty-state, no data rows / action buttons
    expect(wrapper.text()).not.toContain("No users found");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("renders the empty state when not loading and users is empty (length === 0 branch)", () => {
    const wrapper = mountTable({ isLoading: false, users: [] });

    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No users found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("6");
  });

  it("renders a fully-populated user row: role matches a role in roles (shows role name) and createdAt present", () => {
    const roles = [
      { id: 1, name: "Admin" },
      { id: 2, name: "Editor" },
    ];
    const users = [
      {
        id: 10,
        name: "Alice",
        email: "alice@example.com",
        roleId: 2,
        createdAt: "2026-01-15",
      },
    ];

    const wrapper = mountTable({
      isLoading: false,
      users,
      roles,
      page: 2,
      pageSize: 10,
    });

    // No empty-state / no shimmer in the success render.
    expect(wrapper.text()).not.toContain("No users found");
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);

    // Row number = page * pageSize + index + 1 = 2 * 10 + 0 + 1 = 21
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("21");

    // name / email rendered
    expect(wrapper.text()).toContain("Alice");
    expect(wrapper.text()).toContain("alice@example.com");

    // role label resolved to the matching role's name (first ?? operand truthy)
    const truncate2 = wrapper.findAll("span.truncate-2");
    expect(truncate2[0].text()).toBe("Editor");
    // createdAt present -> ?? default NOT taken
    expect(truncate2[1].text()).toBe("2026-01-15");

    // both action buttons rendered
    expect(wrapper.find("button.text-success").exists()).toBe(true);
    expect(wrapper.find("button.text-danger").exists()).toBe(true);
  });

  it("falls back to roleId when no role matches, and shows '-' for null createdAt", () => {
    const roles = [{ id: 1, name: "Admin" }];
    const users = [
      {
        id: 20,
        name: "Bob",
        email: "bob@example.com",
        roleId: 99, // no match in roles -> first ?? operand nullish -> roleId
        createdAt: null, // createdAt ?? "-" -> "-"
      },
    ];

    const wrapper = mountTable({ isLoading: false, users, roles });

    // page defaults to 0, pageSize 10 -> 0*10 + 0 + 1 = 1
    const cells = wrapper.findAll("tbody td");
    expect(cells[0].text()).toBe("1");

    const truncate2 = wrapper.findAll("span.truncate-2");
    // role: no name match -> roleId (99)
    expect(truncate2[0].text()).toBe("99");
    // createdAt null -> "-"
    expect(truncate2[1].text()).toBe("-");
  });

  it("shows '-' for the role when roleId is nullish (both ?? operands fall through)", () => {
    const users = [
      {
        id: 30,
        name: "Carol",
        email: "carol@example.com",
        roleId: null, // no match (no roles) AND nullish roleId -> "-"
        createdAt: "2026-02-02",
      },
    ];

    // roles defaults to [] -> find() returns undefined -> ?.name undefined
    const wrapper = mountTable({ isLoading: false, users });

    const truncate2 = wrapper.findAll("span.truncate-2");
    // role label: undefined ?? null ?? "-" -> "-"
    expect(truncate2[0].text()).toBe("-");
    // createdAt present (covers the other side of the createdAt branch here)
    expect(truncate2[1].text()).toBe("2026-02-02");
  });

  it("emits handle-edit and handle-delete with the user id on button click", async () => {
    const users = [
      {
        id: 77,
        name: "Action User",
        email: "a@b.c",
        roleId: 1,
        createdAt: "2026-03-03",
      },
    ];
    const wrapper = mountTable({ isLoading: false, users });

    const editBtn = wrapper.find("button.text-success");
    const deleteBtn = wrapper.find("button.text-danger");
    expect(editBtn.exists()).toBe(true);
    expect(deleteBtn.exists()).toBe(true);

    await editBtn.trigger("click");
    await deleteBtn.trigger("click");

    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([77]);
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([77]);
  });

  it("renders multiple rows with correct sequential numbering (v-for index increments)", () => {
    const users = [
      { id: 1, name: "Row A", email: "a@x.c", roleId: 1, createdAt: "d1" },
      { id: 2, name: "Row B", email: "b@x.c", roleId: 1, createdAt: "d2" },
      { id: 3, name: "Row C", email: "c@x.c", roleId: 1, createdAt: "d3" },
    ];
    const wrapper = mountTable({
      isLoading: false,
      users,
      page: 1,
      pageSize: 5,
    });

    expect(wrapper.text()).not.toContain("No users found");

    // page * pageSize + index + 1 = 1*5 + {0,1,2} + 1 = 6, 7, 8
    const rowNumbers = wrapper
      .findAll("tbody tr")
      .map((tr) => tr.find("td").text());
    expect(rowNumbers).toEqual(["6", "7", "8"]);

    expect(wrapper.text()).toContain("Row A");
    expect(wrapper.text()).toContain("Row B");
    expect(wrapper.text()).toContain("Row C");
  });
});

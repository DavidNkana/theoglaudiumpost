import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock bootstrap Modal (external boundary) ---------------------------------
const showSpy = vi.fn();
const hideSpy = vi.fn();
const ModalSpy = vi.fn();

vi.mock("bootstrap", () => ({
  Modal: class {
    constructor(el) {
      ModalSpy(el);
      this.show = showSpy;
      this.hide = hideSpy;
    }
  },
}));

// --- Mock users service -------------------------------------------------------
const getUsers = vi.fn();
const getRoles = vi.fn();
const removeUser = vi.fn();
vi.mock("@/features/users/UsersService", () => ({
  getUsers: (...a) => getUsers(...a),
  getRoles: (...a) => getRoles(...a),
  removeUser: (...a) => removeUser(...a),
}));

import Index from "./Index.vue";

const makeUser = (id, name = `User ${id}`, email = `user${id}@mail.com`) => ({
  id,
  name,
  email,
  roleId: 1,
  createdAt: "2026-01-01",
});

const mountView = () =>
  mount(Index, {
    global: {
      stubs: {
        UsersTable: true,
        UserForm: true,
      },
    },
    attachTo: document.body,
  });

describe("Admin/Users/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsers.mockResolvedValue({ data: [makeUser(1), makeUser(2)] });
    getRoles.mockResolvedValue({ data: [{ id: 1, name: "Admin" }] });
    removeUser.mockResolvedValue({ data: { message: "ok" } });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success path for users + roles)
  // ---------------------------------------------------------------------------
  it("constructs both modals and fetches users and roles on mount (success)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getUsers).toHaveBeenCalledTimes(1);
    expect(getRoles).toHaveBeenCalledTimes(1);
    expect(ModalSpy).toHaveBeenCalledTimes(2);

    expect(wrapper.vm.users.map((u) => u.id)).toEqual([1, 2]);
    expect(wrapper.vm.roles).toEqual([{ id: 1, name: "Admin" }]);
    expect(wrapper.vm.loading).toBe(false);

    const table = wrapper.findComponent({ name: "UsersTable" });
    expect(table.exists()).toBe(true);
    expect(table.props("users").map((u) => u.id)).toEqual([1, 2]);
    expect(table.props("page")).toBe(0);
    expect(table.props("pageSize")).toBe(10);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchUsers: null data on a successful response -> empty list (?? branch)
  // ---------------------------------------------------------------------------
  it("defaults to an empty list when getUsers returns null data (?? branch)", async () => {
    getUsers.mockResolvedValue({ data: null });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.users).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchUsers catch -> real error state, no fake-empty fallback
  // ---------------------------------------------------------------------------
  it("surfaces an error state when getUsers rejects (no fake-empty fallback)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUsers.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.loadError).toBe("Failed to load users. Please try again.");
    expect(errorSpy).toHaveBeenCalledWith("Failed to load users", expect.any(Error));
    expect(wrapper.vm.loading).toBe(false);

    // Real error state is shown; the table (and its empty "no users" state) is hidden.
    const alert = wrapper.find(".alert.alert-danger");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Failed to load users");
    expect(wrapper.findComponent({ name: "UsersTable" }).exists()).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchRoles: null data on a successful response -> empty list (?? branch)
  // ---------------------------------------------------------------------------
  it("defaults to an empty list when getRoles returns null data (?? branch)", async () => {
    getRoles.mockResolvedValue({ data: null });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.roles).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchRoles catch -> real error state, no fake-empty fallback
  // ---------------------------------------------------------------------------
  it("surfaces an error state when getRoles rejects (no fake-empty fallback)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getRoles.mockRejectedValue(new Error("roles boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.loadError).toBe("Failed to load roles. Please try again.");
    expect(errorSpy).toHaveBeenCalledWith("Failed to load roles", expect.any(Error));
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // filteredUsers: empty query returns all
  // ---------------------------------------------------------------------------
  it("returns all users when the search query is empty", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.filteredUsers.map((u) => u.id)).toEqual([1, 2]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // filteredUsers: query matches by name and by email, and no-match
  // + name/email nullish (?? "") default branches
  // ---------------------------------------------------------------------------
  it("filters users by name and email and applies the nullish defaults", async () => {
    getUsers.mockResolvedValue({
      data: [
        makeUser(1, "Alice", "alice@mail.com"),
        makeUser(2, "Bob", "bob@mail.com"),
        // missing name + email -> exercises (u.name ?? "") and (u.email ?? "")
        { id: 3, roleId: 1, createdAt: "x" },
      ],
    });
    const wrapper = mountView();
    await flushPromises();

    // match by name
    wrapper.vm.search = "alice";
    await nextTick();
    expect(wrapper.vm.filteredUsers.map((u) => u.id)).toEqual([1]);

    // match by email
    wrapper.vm.search = "bob@mail";
    await nextTick();
    expect(wrapper.vm.filteredUsers.map((u) => u.id)).toEqual([2]);

    // no match -> empty
    wrapper.vm.search = "zzz-nope";
    await nextTick();
    expect(wrapper.vm.filteredUsers).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // totalPages + pagedUsers slicing
  // ---------------------------------------------------------------------------
  it("computes totalPages and pages the users list", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    // ceil(25/10) = 3
    expect(wrapper.vm.totalPages).toBe(3);
    expect(wrapper.vm.pagedUsers.map((u) => u.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);

    wrapper.vm.currentPage = 3;
    await nextTick();
    expect(wrapper.vm.pagedUsers.map((u) => u.id)).toEqual([21, 22, 23, 24, 25]);
    wrapper.unmount();
  });

  it("totalPages is at least 1 even when there are no users", async () => {
    getUsers.mockResolvedValue({ data: [] });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.totalPages).toBe(1);
    expect(wrapper.vm.pagedUsers).toEqual([]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // watch(search) resets currentPage to 1
  // ---------------------------------------------------------------------------
  it("resets currentPage to 1 when the search changes", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.currentPage = 3;
    await nextTick();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("user");
    await nextTick();

    expect(wrapper.vm.search).toBe("user");
    expect(wrapper.vm.currentPage).toBe(1);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openCreateModal -> clears selection + shows form modal
  // ---------------------------------------------------------------------------
  it("openCreateModal clears the selection and shows the form modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.selectedUser = makeUser(1);
    await wrapper.find("button.btn-success").trigger("click");

    expect(wrapper.vm.selectedUser).toBe(null);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openEditModal found
  // ---------------------------------------------------------------------------
  it("openEditModal selects the matching user and shows the form modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.openEditModal(2);
    expect(wrapper.vm.selectedUser.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openEditModal not found -> null (?? branch)
  // ---------------------------------------------------------------------------
  it("openEditModal sets selection to null when the user is not found", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.openEditModal(9999);
    expect(wrapper.vm.selectedUser).toBe(null);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm hides modal
  // ---------------------------------------------------------------------------
  it("closeForm hides the form modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closeForm();
    expect(hideSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // addUser -> prepends
  // ---------------------------------------------------------------------------
  it("addUser prepends a new user", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.addUser(makeUser(99, "New"));
    expect(wrapper.vm.users[0].id).toBe(99);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // updateUser found + not-found (both branches of i !== -1)
  // ---------------------------------------------------------------------------
  it("updateUser replaces the matching user (found branch)", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.updateUser({ id: 2, name: "Updated 2" });
    const found = wrapper.vm.users.find((u) => u.id === 2);
    expect(found.name).toBe("Updated 2");
    wrapper.unmount();
  });

  it("updateUser leaves the list unchanged when no user matches (not-found branch)", async () => {
    const wrapper = mountView();
    await flushPromises();

    const before = wrapper.vm.users.map((u) => u.id);
    wrapper.vm.updateUser({ id: 12345, name: "Nope" });
    expect(wrapper.vm.users.map((u) => u.id)).toEqual(before);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete -> stores id + shows delete modal
  // ---------------------------------------------------------------------------
  it("confirmDelete stores the id and shows the delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(2);
    expect(wrapper.vm.deleteId).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteUser success -> removes, hides, resets isDeleting
  // ---------------------------------------------------------------------------
  it("deletes the selected user successfully", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    hideSpy.mockClear();

    await wrapper.vm.deleteUser();
    await flushPromises();

    expect(removeUser).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.users.map((u) => u.id)).toEqual([2]);
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteUser catch -> real error state + console.error, isDeleting reset
  // ---------------------------------------------------------------------------
  it("surfaces an error state when removeUser rejects (catch branch)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();

    removeUser.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteUser();
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to delete user",
      expect.any(Error)
    );
    expect(wrapper.vm.loadError).toBe("Failed to delete user. Please try again.");
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: in-bounds + out-of-bounds (below 1 and above totalPages)
  // ---------------------------------------------------------------------------
  it("changePage moves to a valid page and ignores out-of-range pages", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    // totalPages = 3
    wrapper.vm.changePage(0); // below 1 -> ignored
    expect(wrapper.vm.currentPage).toBe(1);

    wrapper.vm.changePage(99); // above totalPages -> ignored
    expect(wrapper.vm.currentPage).toBe(1);

    wrapper.vm.changePage(2); // valid
    expect(wrapper.vm.currentPage).toBe(2);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // getPageNumbers: simple window [1..totalPages] (span < 4 -> recompute branch)
  // ---------------------------------------------------------------------------
  it("getPageNumbers returns the full window when there are few pages (startPage recompute)", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    // totalPages = 3, currentPage = 1 ->
    // startPage = max(1, -1) = 1, endPage = min(3, 5) = 3, span 2 < 4 ->
    // startPage = max(1, -1) = 1.
    expect(wrapper.vm.getPageNumbers()).toEqual([1, 2, 3]);
    wrapper.unmount();
  });

  it("getPageNumbers windows around the current page near the end (no recompute branch)", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 100 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    // totalPages = 10, currentPage = 10 ->
    // startPage = max(1, 8) = 8, endPage = min(10, 12) = 10, span 2 < 4 ->
    // startPage = max(1, 6) = 6 (recompute branch).
    wrapper.vm.currentPage = 10;
    await nextTick();
    expect(wrapper.vm.getPageNumbers()).toEqual([6, 7, 8, 9, 10]);

    // currentPage = 5 -> startPage = max(1, 3) = 3, endPage = min(10, 7) = 7,
    // span 4 not < 4 -> NO recompute (else-of-if branch).
    wrapper.vm.currentPage = 5;
    await nextTick();
    expect(wrapper.vm.getPageNumbers()).toEqual([3, 4, 5, 6, 7]);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Pagination markup: Previous disabled on first page, navigates via numbers/Next
  // + active-class branch
  // ---------------------------------------------------------------------------
  it("renders Previous disabled on the first page and the active page link", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // First li is Previous -> disabled because currentPage === 1
    expect(items[0].classes()).toContain("disabled");

    // active class on page 1
    const active = wrapper
      .findAll("ul.pagination li.page-item")
      .find((li) => li.classes().includes("active"));
    expect(active.text().trim()).toBe("1");

    // Click Next (last li) -> page 2
    const nextLink = items[items.length - 1].find("a");
    await nextLink.trigger("click");
    expect(wrapper.vm.currentPage).toBe(2);

    // Click Previous (first li) -> back to page 1 (covers the Previous handler)
    const prevLink = wrapper
      .findAll("ul.pagination li.page-item")[0]
      .find("a");
    await prevLink.trigger("click");
    expect(wrapper.vm.currentPage).toBe(1);
    wrapper.unmount();
  });

  it("renders Next disabled on the last page and navigates via a numbered link", async () => {
    getUsers.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => makeUser(i + 1)),
    });
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.currentPage = 3; // last page
    await nextTick();

    const items = wrapper.findAll("ul.pagination li.page-item");
    expect(items[items.length - 1].classes()).toContain("disabled");

    // Click the first numbered link (page 1)
    const numbered = wrapper
      .findAll("ul.pagination li.page-item")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    await numbered[0].find("a").trigger("click");
    expect(wrapper.vm.currentPage).toBe(1);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Child events wired through the template (openEditModal / confirmDelete)
  // ---------------------------------------------------------------------------
  it("wires UsersTable edit/delete events to the handlers", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    const table = wrapper.findComponent({ name: "UsersTable" });
    table.vm.$emit("handle-edit", 2);
    await nextTick();
    expect(wrapper.vm.selectedUser.id).toBe(2);

    table.vm.$emit("handle-delete", 1);
    await nextTick();
    expect(wrapper.vm.deleteId).toBe(1);
    expect(showSpy).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Child events wired through the template (closeForm / addUser / updateUser)
  // ---------------------------------------------------------------------------
  it("wires UserForm close/add/update events to the handlers", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    const form = wrapper.findComponent({ name: "UserForm" });

    form.vm.$emit("add-user", makeUser(50, "Added"));
    await nextTick();
    expect(wrapper.vm.users[0].id).toBe(50);

    form.vm.$emit("update-user", { id: 50, name: "Edited" });
    await nextTick();
    expect(wrapper.vm.users.find((u) => u.id === 50).name).toBe("Edited");

    form.vm.$emit("close");
    await nextTick();
    expect(hideSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal rendered state: spinner + label while deleting
  // ---------------------------------------------------------------------------
  it("renders the deleting label and spinner in the delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("Delete User");
    expect(modal.find(".spinner-border").exists()).toBe(false);
    expect(
      modal.find("button.btn-danger").attributes("disabled")
    ).toBeUndefined();

    wrapper.vm.isDeleting = true;
    await nextTick();
    expect(modal.text()).toContain("Deleting...");
    expect(modal.find(".spinner-border").exists()).toBe(true);
    expect(
      modal.find("button.btn-danger").attributes("disabled")
    ).toBeDefined();
    wrapper.unmount();
  });
});

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// Hoisted mock state so the vi.mock factories (hoisted to top of file) can see
// these without "cannot access before initialization" errors.
const h = vi.hoisted(() => ({
  getPayments: vi.fn(),
  removePayment: vi.fn(),
  routerReplace: vi.fn(),
  routeQuery: { value: {} },
  modalShow: vi.fn(),
  modalHide: vi.fn(),
  ModalCtor: vi.fn(),
  debouncedCalls: vi.fn(),
}));
const {
  getPayments,
  removePayment,
  routerReplace,
  modalShow,
  modalHide,
  ModalCtor,
  debouncedCalls,
} = h;

// --- Mock the payments service boundary -------------------------------------
vi.mock("@/features/payments/PaymentsService", () => ({
  getPayments: (...args) => h.getPayments(...args),
  removePayment: (...args) => h.removePayment(...args),
}));

// --- Mock vue-router --------------------------------------------------------
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: h.routerReplace }),
  useRoute: () => ({ query: h.routeQuery.value }),
}));

// --- Mock bootstrap Modal ---------------------------------------------------
vi.mock("bootstrap", () => ({
  Modal: function Modal(...args) {
    h.ModalCtor(...args);
    this.show = h.modalShow;
    this.hide = h.modalHide;
  },
}));

// --- Mock lodash debounce (run synchronously, but track call) ---------------
vi.mock("lodash", () => ({
  // Return a wrapper that records invocation and immediately calls fn so the
  // watch-triggered fetch path is exercised deterministically.
  debounce: (fn) => {
    const wrapped = (...args) => {
      h.debouncedCalls(...args);
      return fn(...args);
    };
    return wrapped;
  },
}));

import Index from "@/views/Admin/Ads/Payments/Index.vue";

const PaymentsTableStub = {
  name: "PaymentsTable",
  props: ["payments", "isLoading", "page", "pageSize"],
  emits: ["handle-delete", "handle-edit"],
  template:
    '<div class="payments-table-stub" :data-count="payments.length" :data-loading="isLoading" :data-page="page" :data-size="pageSize"></div>',
};

const PaymentFormStub = {
  name: "PaymentForm",
  props: ["payment"],
  emits: ["close", "add-payment", "update-payment"],
  template: '<div class="payment-form-stub"></div>',
};

function makeResponse(overrides = {}) {
  return {
    status: 200,
    data: {
      payments: [
        { id: 1, reference: "REF-1" },
        { id: 2, reference: "REF-2" },
      ],
      page: 0,
      size: 10,
      totalPages: 3,
      ...(overrides.data || {}),
    },
    ...(overrides.status !== undefined ? { status: overrides.status } : {}),
  };
}

async function mountIndex() {
  const wrapper = mount(Index, {
    attachTo: document.body,
    global: {
      stubs: {
        PaymentsTable: PaymentsTableStub,
        PaymentForm: PaymentFormStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.routeQuery.value = {};
  getPayments.mockResolvedValue(makeResponse());
  removePayment.mockResolvedValue({});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Admin/Ads/Payments/Index.vue", () => {
  it("fetches and renders payments on mount with default (empty) route query", async () => {
    const wrapper = await mountIndex();

    // onMounted defaults: route.query.* are all undefined => fallbacks used
    expect(getPayments).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });

    const table = wrapper.find(".payments-table-stub");
    expect(table.exists()).toBe(true);
    expect(table.attributes("data-count")).toBe("2");
    expect(table.attributes("data-loading")).toBe("false");

    // Two Modal instances constructed (delete + form)
    expect(ModalCtor).toHaveBeenCalledTimes(2);

    // pagination.total > 0 => nav rendered
    expect(wrapper.find('nav[aria-label="Payments pagination"]').exists()).toBe(
      true
    );
  });

  it("seeds filters and pagination from route query on mount", async () => {
    h.routeQuery.value = {
      search: "abc",
      status: "PENDING",
      page: "2",
      size: "25",
    };
    await mountIndex();

    expect(getPayments).toHaveBeenCalledWith({
      page: 2,
      search: "abc",
      size: 25,
      status: "PENDING",
    });
  });

  it("does not start a second fetch while one is already loading (loading guard)", async () => {
    // getPayments never resolves on the mount call so loading stays true.
    let resolveFn;
    getPayments.mockImplementationOnce(
      () => new Promise((res) => (resolveFn = res))
    );
    const wrapper = await mountIndex();

    expect(getPayments).toHaveBeenCalledTimes(1);

    // Trigger applyFilters via page-size change while still loading -> guarded.
    // First make the nav render by resolving is not possible; instead call
    // changeStatus through the status select which calls fetchPayments.
    await wrapper.find("select.form-select").setValue("COMPLETED");
    await flushPromises();
    // still only the original (in-flight) call because loading.value === true
    expect(getPayments).toHaveBeenCalledTimes(1);

    // release the in-flight promise
    resolveFn(makeResponse());
    await flushPromises();
  });

  it("handles a non-200 response by going through the catch branch", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getPayments.mockResolvedValueOnce(makeResponse({ status: 500 }));
    const wrapper = await mountIndex();

    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching payments:",
      expect.any(Error)
    );
    // payments stay empty -> no pagination nav (total still 0)
    expect(
      wrapper.find('nav[aria-label="Payments pagination"]').exists()
    ).toBe(false);
    expect(wrapper.find(".payments-table-stub").attributes("data-count")).toBe(
      "0"
    );
  });

  it("handles a rejected getPayments promise via the catch branch", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getPayments.mockRejectedValueOnce(new Error("boom"));
    await mountIndex();

    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching payments:",
      expect.any(Error)
    );
  });

  it("shows the Clear Filters button only when a filter is set and clears them", async () => {
    h.routeQuery.value = { search: "abc" };
    const wrapper = await mountIndex();

    // search filter set => clear button visible (v-if true branch)
    const clearBtn = wrapper.find("button.btn-outline-secondary");
    expect(clearBtn.exists()).toBe(true);

    getPayments.mockClear();
    getPayments.mockResolvedValue(makeResponse());
    await clearBtn.trigger("click");
    await flushPromises();

    // clearFilters resets search+status and re-fetches at page 0
    expect(getPayments).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: expect.any(Number),
      status: "",
    });
    // button now hidden (v-if false branch)
    expect(wrapper.find("button.btn-outline-secondary").exists()).toBe(false);
  });

  it("hides the Clear Filters button when no filter is set (v-if false branch)", async () => {
    const wrapper = await mountIndex();
    expect(wrapper.find("button.btn-outline-secondary").exists()).toBe(false);
  });

  it("updates the status filter via the status select (v-model)", async () => {
    const wrapper = await mountIndex();
    const select = wrapper.find("select.form-select");

    routerReplace.mockClear();
    await select.setValue("COMPLETED");
    await flushPromises();

    // v-model write triggers the route-sync watch with the new status
    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.status).toBe("COMPLETED");
    // and the Clear Filters button now appears (filters.status truthy)
    expect(wrapper.find("button.btn-outline-secondary").exists()).toBe(true);
  });

  it("re-fetches (debounced) when the search input changes", async () => {
    const wrapper = await mountIndex();
    getPayments.mockClear();

    await wrapper.find('input[type="text"]').setValue("query");
    await flushPromises();

    expect(debouncedCalls).toHaveBeenCalled();
    expect(getPayments).toHaveBeenCalled();
  });

  it("renders pagination page numbers and navigates via changePage", async () => {
    // totalPages large enough to exercise getPageNumbers windowing
    getPayments.mockResolvedValue(
      makeResponse({ data: { page: 3, totalPages: 10 } })
    );
    const wrapper = await mountIndex();

    const pageLinks = wrapper.findAll("ul.pagination li.page-item");
    expect(pageLinks.length).toBeGreaterThan(0);

    // Click a numbered page link (valid page within range)
    getPayments.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li.page-item a.page-link")
      .filter((a) => /^\d+$/.test(a.text()));
    await numbered[0].trigger("click");
    await flushPromises();
    expect(getPayments).toHaveBeenCalled();
  });

  it("guards changePage against out-of-range pages (Previous on first page)", async () => {
    // current_page 0 => Previous goes to -1 => guarded (no fetch)
    getPayments.mockResolvedValue(
      makeResponse({ data: { page: 0, totalPages: 5 } })
    );
    const wrapper = await mountIndex();

    getPayments.mockClear();
    const prev = wrapper
      .findAll("ul.pagination a.page-link")
      .find((a) => a.text() === "Previous");
    await prev.trigger("click");
    await flushPromises();
    expect(getPayments).not.toHaveBeenCalled();
  });

  it("guards changePage when Next goes beyond last page", async () => {
    // current_page == last_page so Next (current+1) is > last_page => guarded.
    // totalPages 1 => last_page = 0, page 0 => current === last.
    getPayments.mockResolvedValue(
      makeResponse({ data: { page: 0, totalPages: 1 } })
    );
    const wrapper = await mountIndex();

    getPayments.mockClear();
    const next = wrapper
      .findAll("ul.pagination a.page-link")
      .find((a) => a.text() === "Next");
    await next.trigger("click");
    await flushPromises();
    expect(getPayments).not.toHaveBeenCalled();
  });

  it("changes page size which calls applyFilters and re-fetches at page 0", async () => {
    getPayments.mockResolvedValue(
      makeResponse({ data: { page: 2, totalPages: 5 } })
    );
    const wrapper = await mountIndex();

    getPayments.mockClear();
    const pageSizeSelect = wrapper.find("#pageSizeSelect");
    await pageSizeSelect.setValue("25");
    await flushPromises();
    expect(getPayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0 })
    );
  });

  it("falls back to an empty array when the API returns null payments (?? branch)", async () => {
    // response.data.payments === null exercises the `payments ?? []` fallback
    // in the PaymentsTable binding.
    getPayments.mockResolvedValue(
      makeResponse({ data: { payments: null, totalPages: 2 } })
    );
    const wrapper = await mountIndex();

    expect(wrapper.find(".payments-table-stub").attributes("data-count")).toBe(
      "0"
    );
  });

  it("hides the pagination nav when total is 0 (v-if false branch)", async () => {
    getPayments.mockResolvedValue(
      makeResponse({ data: { payments: [], totalPages: 0 } })
    );
    const wrapper = await mountIndex();
    expect(
      wrapper.find('nav[aria-label="Payments pagination"]').exists()
    ).toBe(false);
  });

  it("confirms delete then deletes a payment successfully", async () => {
    const wrapper = await mountIndex();

    // confirmDelete with an existing id -> selectedPayment set, modal shown
    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-delete", 1);
    await flushPromises();
    expect(modalShow).toHaveBeenCalled();

    // selectedPayment.reference rendered in delete modal
    expect(wrapper.find("#deleteModal p.fw-bold").text()).toBe("REF-1");

    // Click Delete Payment -> success path
    removePayment.mockResolvedValueOnce({});
    await wrapper.find("#deleteModal button.btn-danger").trigger("click");
    await flushPromises();

    expect(removePayment).toHaveBeenCalledWith(1);
    expect(modalHide).toHaveBeenCalled();
    // payment 1 removed from list -> table count 1
    expect(wrapper.find(".payments-table-stub").attributes("data-count")).toBe(
      "1"
    );
  });

  it("confirmDelete does nothing when id is not found (selectedPayment falsy)", async () => {
    const wrapper = await mountIndex();
    modalShow.mockClear();
    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-delete", 999);
    await flushPromises();
    expect(modalShow).not.toHaveBeenCalled();
  });

  it("handles a delete failure via the catch branch (alert)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = await mountIndex();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-delete", 1);
    await flushPromises();

    removePayment.mockRejectedValueOnce(new Error("delete failed"));
    const delBtn = wrapper.find("#deleteModal button.btn-danger");
    await delBtn.trigger("click");
    // while deleting, button text shows "Deleting..." and is disabled
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(
      "Error deleting payment:",
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete payment. Please try again."
    );
  });

  it("shows the Deleting... label while a delete is in flight (isDeleting true branch)", async () => {
    let resolveDelete;
    removePayment.mockImplementationOnce(
      () => new Promise((res) => (resolveDelete = res))
    );
    const wrapper = await mountIndex();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-delete", 1);
    await flushPromises();

    const delBtn = wrapper.find("#deleteModal button.btn-danger");
    await delBtn.trigger("click");
    await wrapper.vm.$nextTick();

    expect(delBtn.text()).toBe("Deleting...");
    expect(delBtn.attributes("disabled")).toBeDefined();

    resolveDelete({});
    await flushPromises();
    expect(delBtn.text()).toBe("Delete Payment");
  });

  it("opens the update modal for an existing payment via handle-edit", async () => {
    const wrapper = await mountIndex();
    modalShow.mockClear();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-edit", 2);
    await flushPromises();

    expect(modalShow).toHaveBeenCalled();
    // selectedPayment passed to PaymentForm
    expect(wrapper.findComponent(PaymentFormStub).props("payment")).toEqual({
      id: 2,
      reference: "REF-2",
    });
  });

  it("openUpdateModal does nothing for an unknown id (selectedPayment falsy)", async () => {
    const wrapper = await mountIndex();
    modalShow.mockClear();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-edit", 12345);
    await flushPromises();
    expect(modalShow).not.toHaveBeenCalled();
  });

  it("closeForm hides the form modal and clears the selected payment", async () => {
    const wrapper = await mountIndex();
    // first select a payment
    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-edit", 1);
    await flushPromises();

    modalHide.mockClear();
    wrapper.findComponent(PaymentFormStub).vm.$emit("close");
    await flushPromises();

    expect(modalHide).toHaveBeenCalled();
    expect(wrapper.findComponent(PaymentFormStub).props("payment")).toBe(null);
  });

  it("addPayment prepends a new payment from the form event", async () => {
    const wrapper = await mountIndex();
    expect(wrapper.find(".payments-table-stub").attributes("data-count")).toBe(
      "2"
    );

    wrapper
      .findComponent(PaymentFormStub)
      .vm.$emit("add-payment", { id: 99, reference: "NEW" });
    await flushPromises();

    expect(wrapper.find(".payments-table-stub").attributes("data-count")).toBe(
      "3"
    );
  });

  it("updatePayment updates a matching payment and leaves others untouched", async () => {
    const wrapper = await mountIndex();

    wrapper
      .findComponent(PaymentFormStub)
      .vm.$emit("update-payment", { id: 1, reference: "UPDATED" });
    await flushPromises();

    // open update modal on the updated payment to assert the new value flowed through
    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-edit", 1);
    await flushPromises();
    expect(
      wrapper.findComponent(PaymentFormStub).props("payment").reference
    ).toBe("UPDATED");

    // non-matching id branch already exercised (payment 2 untouched)
    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-edit", 2);
    await flushPromises();
    expect(
      wrapper.findComponent(PaymentFormStub).props("payment").reference
    ).toBe("REF-2");
  });

  it("syncs the route query on filter/pagination changes (both || branches)", async () => {
    const wrapper = await mountIndex();

    routerReplace.mockClear();
    // set search + status so the truthy side of `|| undefined` is taken
    await wrapper.find('input[type="text"]').setValue("hello");
    await wrapper.find("select.form-select").setValue("PENDING");
    await flushPromises();

    expect(routerReplace).toHaveBeenCalled();
    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBe("hello");
    expect(lastCall.query.status).toBe("PENDING");

    // now clear both -> falsy side of `|| undefined`
    routerReplace.mockClear();
    await wrapper.find('input[type="text"]').setValue("");
    await wrapper.find("select.form-select").setValue("");
    await flushPromises();

    const cleared = routerReplace.mock.calls.at(-1)[0];
    expect(cleared.query.search).toBeUndefined();
    expect(cleared.query.status).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// Hoisted mock state so the vi.mock factories (hoisted to top of file) can see
// these without "cannot access before initialization" errors.
const h = vi.hoisted(() => ({
  getPayments: vi.fn(),
  routerReplace: vi.fn(),
  routeQuery: { value: {} },
  modalShow: vi.fn(),
  modalHide: vi.fn(),
  ModalCtor: vi.fn(),
  debouncedCalls: vi.fn(),
  user: { value: { businessId: "biz-1" } },
}));
const { getPayments, routerReplace, modalShow, modalHide, ModalCtor, debouncedCalls } = h;

// --- Mock the businesses service boundary -----------------------------------
vi.mock("@/features/businesses/BusinessesService", () => ({
  getPayments: (...args) => h.getPayments(...args),
}));

// --- Mock the auth composable -----------------------------------------------
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user: h.user }),
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
  debounce: (fn) => {
    const wrapped = (...args) => {
      h.debouncedCalls(...args);
      return fn(...args);
    };
    return wrapped;
  },
}));

import Index from "@/views/Business/Payments/Index.vue";

const PaymentsTableStub = {
  name: "PaymentsTable",
  props: ["payments", "isLoading", "page", "pageSize"],
  emits: ["handle-preview"],
  template:
    '<div class="payments-table-stub" :data-count="payments.length" :data-loading="isLoading" :data-page="page" :data-size="pageSize"></div>',
};

function makeResponse(overrides = {}) {
  const data = {
    payments: [
      { id: 1, reference: "REF-1", status: "paid", payment_method: "eft" },
      { id: 2, reference: "REF-2", status: "pending", payment_method: "payfast" },
    ],
    page: 0,
    size: 10,
    totalPages: 3,
    ...(overrides.data || {}),
  };
  return {
    status: overrides.status !== undefined ? overrides.status : 200,
    data,
  };
}

async function mountIndex() {
  const wrapper = mount(Index, {
    attachTo: document.body,
    global: {
      stubs: {
        PaymentsTable: PaymentsTableStub,
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
  h.user.value = { businessId: "biz-1" };
  getPayments.mockResolvedValue(makeResponse());
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Business/Payments/Index.vue", () => {
  it("fetches and renders payments on mount with default (empty) route query", async () => {
    const wrapper = await mountIndex();

    // onMounted defaults: route.query.* are all undefined => fallbacks used
    expect(getPayments).toHaveBeenCalledWith({
      businessId: "biz-1",
      page: 0,
      search: "",
      size: 10,
      status: "",
    });

    const table = wrapper.find(".payments-table-stub");
    expect(table.exists()).toBe(true);
    expect(table.attributes("data-count")).toBe("2");
    expect(table.attributes("data-loading")).toBe("false");

    // Modal constructed once for the preview modal (previewModal.value truthy)
    expect(ModalCtor).toHaveBeenCalledTimes(1);

    // pagination.total > 0 => nav rendered
    expect(wrapper.find('nav[aria-label="Payments pagination"]').exists()).toBe(
      true
    );
  });

  it("seeds filters and pagination from route query on mount", async () => {
    h.routeQuery.value = {
      search: "abc",
      status: "pending",
      page: "2",
      size: "25",
    };
    await mountIndex();

    expect(getPayments).toHaveBeenCalledWith({
      businessId: "biz-1",
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

    // Trigger fetchPayments via a status button while still loading -> guarded.
    await wrapper.findAll("div.btn-group button")[0].trigger("click");
    await flushPromises();
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
    expect(
      wrapper.find(".payments-table-stub").attributes("data-count")
    ).toBe("0");
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

  it("clears filters and re-fetches at page 0", async () => {
    h.routeQuery.value = { search: "abc", status: "pending" };
    const wrapper = await mountIndex();

    getPayments.mockClear();
    getPayments.mockResolvedValue(makeResponse());

    const clearBtn = wrapper.find("button.btn-outline-secondary");
    expect(clearBtn.exists()).toBe(true);
    await clearBtn.trigger("click");
    await flushPromises();

    // clearFilters resets search+status and re-fetches at page 0
    expect(getPayments).toHaveBeenCalledWith({
      businessId: "biz-1",
      page: 0,
      search: "",
      size: expect.any(Number),
      status: "",
    });
  });

  it("toggles the Completed status button on and off (changeStatus)", async () => {
    const wrapper = await mountIndex();
    const completedBtn = wrapper.findAll("div.btn-group button")[0];

    getPayments.mockClear();
    // first click sets status to 'complete' (status !== status branch)
    await completedBtn.trigger("click");
    await flushPromises();
    expect(getPayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "COMPLETE" })
    );

    // second click toggles it back to "" (status === status branch)
    await completedBtn.trigger("click");
    await flushPromises();
    expect(getPayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "" })
    );
  });

  it("applies the active class to the Completed button for completed/paid status", async () => {
    h.routeQuery.value = { status: "completed" };
    const wrapper = await mountIndex();
    const completedBtn = wrapper.findAll("div.btn-group button")[0];
    expect(completedBtn.classes()).toContain("btn-success");
    expect(completedBtn.classes()).not.toContain("btn-outline-success");
  });

  it("applies the active class to the Pending button for pending status", async () => {
    h.routeQuery.value = { status: "pending" };
    const wrapper = await mountIndex();
    const pendingBtn = wrapper.findAll("div.btn-group button")[1];
    expect(pendingBtn.classes()).toContain("btn-warning");
  });

  it("applies the active class to the Cancelled button for cancelled/failed status", async () => {
    h.routeQuery.value = { status: "failed" };
    const wrapper = await mountIndex();
    const cancelledBtn = wrapper.findAll("div.btn-group button")[2];
    expect(cancelledBtn.classes()).toContain("btn-danger");
  });

  it("triggers the Pending and Cancelled status buttons", async () => {
    const wrapper = await mountIndex();
    getPayments.mockClear();

    await wrapper.findAll("div.btn-group button")[1].trigger("click");
    await flushPromises();
    expect(getPayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "PENDING" })
    );

    // toggling pending off then cancelled on
    await wrapper.findAll("div.btn-group button")[2].trigger("click");
    await flushPromises();
    expect(getPayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "CANCELLED" })
    );
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

  it("exercises getPageNumbers windowing near the start (endPage-startPage<4 branch)", async () => {
    // page 0, totalPages 3 => currentPage=1, startPage=1, endPage=min(3,5)=3,
    // endPage-startPage = 2 < 4 => startPage = max(1, 3-4) = 1 (true branch).
    getPayments.mockResolvedValue(
      makeResponse({ data: { page: 0, totalPages: 3 } })
    );
    const wrapper = await mountIndex();
    const numbered = wrapper
      .findAll("ul.pagination a.page-link")
      .filter((a) => /^\d+$/.test(a.text()))
      .map((a) => a.text());
    expect(numbered).toEqual(["1", "2", "3"]);
  });

  it("exercises getPageNumbers full window (endPage-startPage>=4 branch)", async () => {
    // page 5 (0-based) => currentPage=6, startPage=max(1,4)=4, endPage=min(10,8)=8,
    // endPage-startPage = 4 (not < 4) => false branch, window is 4..8.
    getPayments.mockResolvedValue(
      makeResponse({ data: { page: 5, totalPages: 10 } })
    );
    const wrapper = await mountIndex();
    const numbered = wrapper
      .findAll("ul.pagination a.page-link")
      .filter((a) => /^\d+$/.test(a.text()))
      .map((a) => a.text());
    expect(numbered).toEqual(["4", "5", "6", "7", "8"]);
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

    expect(
      wrapper.find(".payments-table-stub").attributes("data-count")
    ).toBe("0");
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

  it("opens the preview modal for an existing payment and renders all detail branches", async () => {
    // Rich payment that exercises every truthy/primary branch in the modal body.
    getPayments.mockResolvedValue(
      makeResponse({
        data: {
          payments: [
            {
              id: 7,
              reference: "REF-7",
              amount: 100,
              status: "completed",
              payment_date: "2024-01-15",
              payment_method: "credit_card",
              description: "Custom description",
              ad_id: "AD-1",
              campaign_id: "CAMP-1",
              notes: "Some notes here",
            },
          ],
          totalPages: 1,
        },
      })
    );
    const wrapper = await mountIndex();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-preview", 7);
    await flushPromises();

    expect(modalShow).toHaveBeenCalled();

    const body = wrapper.find(".modal-body");
    expect(body.exists()).toBe(true);
    const text = body.text();
    expect(text).toContain("REF-7");
    expect(text).toContain("completed");
    expect(text).toContain("Credit Card");
    expect(text).toContain("Custom description");
    expect(text).toContain("AD-1");
    expect(text).toContain("CAMP-1");
    expect(text).toContain("Some notes here");
    // formatCurrency produced a ZAR amount and formatDate a non-N/A date
    expect(text).toContain("R");
    expect(text).not.toContain("N/A");
    // known status -> bg-success badge class
    expect(wrapper.find(".modal-body span.bg-success").exists()).toBe(true);
  });

  it("renders the fallback (secondary) branches of the preview modal", async () => {
    // Payment lacking reference/amount/payment_date/description/ad_id/campaign_id/notes
    // and with an unknown status + payment method to hit the || / fallback branches.
    getPayments.mockResolvedValue(
      makeResponse({
        data: {
          payments: [
            {
              id: 8,
              payment_id: "PAY-8",
              amount_gross: 250,
              status: "weird-status",
              created_at: null,
              payment_method: "unknown_method",
            },
          ],
          totalPages: 1,
        },
      })
    );
    const wrapper = await mountIndex();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-preview", 8);
    await flushPromises();

    const body = wrapper.find(".modal-body");
    const text = body.text();
    // reference || payment_id
    expect(text).toContain("PAY-8");
    // description || "Advertisement payment"
    expect(text).toContain("Advertisement payment");
    // getPaymentMethodDisplay falls back to the raw method string
    expect(text).toContain("unknown_method");
    // formatDate(null) -> "N/A"
    expect(text).toContain("N/A");
    // unknown status -> bg-secondary badge fallback
    expect(wrapper.find(".modal-body span.bg-secondary").exists()).toBe(true);
    // ad_id / campaign_id / notes absent -> those v-if blocks not rendered
    expect(text).not.toContain("Ad ID:");
    expect(text).not.toContain("Campaign ID:");
    expect(wrapper.find(".modal-body h6").exists()).toBe(false);
  });

  it("does nothing when handle-preview gets an unknown id (selectedPayment falsy)", async () => {
    const wrapper = await mountIndex();
    modalShow.mockClear();

    wrapper.findComponent(PaymentsTableStub).vm.$emit("handle-preview", 99999);
    await flushPromises();

    expect(modalShow).not.toHaveBeenCalled();
    // modal body absent because selectedPayment is null
    expect(wrapper.find(".modal-body").exists()).toBe(false);
  });

  it("syncs the route query on filter/pagination changes (both || branches)", async () => {
    const wrapper = await mountIndex();

    routerReplace.mockClear();
    // set search + status so the truthy side of `|| undefined` is taken
    await wrapper.find('input[type="text"]').setValue("hello");
    await wrapper.findAll("div.btn-group button")[1].trigger("click");
    await flushPromises();

    expect(routerReplace).toHaveBeenCalled();
    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBe("hello");
    expect(lastCall.query.status).toBe("pending");

    // now clear both -> falsy side of `|| undefined`
    routerReplace.mockClear();
    await wrapper.find('input[type="text"]').setValue("");
    // toggle pending off
    await wrapper.findAll("div.btn-group button")[1].trigger("click");
    await flushPromises();

    const cleared = routerReplace.mock.calls.at(-1)[0];
    expect(cleared.query.search).toBeUndefined();
    expect(cleared.query.status).toBeUndefined();
  });

  it("constructs exactly one preview Modal on mount with the modal element ref", async () => {
    await mountIndex();
    expect(ModalCtor).toHaveBeenCalledTimes(1);
    // the modal element was passed to the Modal constructor
    expect(ModalCtor.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
  });
});

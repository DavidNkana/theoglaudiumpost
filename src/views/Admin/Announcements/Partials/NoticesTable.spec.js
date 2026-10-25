import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import NoticesTable from "@/views/Admin/Announcements/Partials/NoticesTable.vue";

function makeAnnouncement(overrides = {}) {
  return {
    id: 1,
    title: "First Notice",
    description: "A description here.",
    location: "Town Hall",
    category: { name: "Community" },
    priority: "high",
    status: "published",
    image: { file: "https://cdn.example.com/a.jpg" },
    publish_date: "2025-03-09T14:05:00Z",
    expire_date: "2025-04-09T14:05:00Z",
    ...overrides,
  };
}

function mountTable(props = {}) {
  return mount(NoticesTable, {
    props: {
      announcements: [],
      isLoading: false,
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("NoticesTable", () => {
  it("renders 5 shimmer rows while loading (isLoading branch)", () => {
    const wrapper = mountTable({ isLoading: true, announcements: [] });
    const shimmerRows = wrapper.findAll("tr.shimmer-row");
    expect(shimmerRows).toHaveLength(5);
    // The empty / data rows must not render in the loading branch.
    expect(wrapper.text()).not.toContain("No announcements found");
  });

  it("renders the empty state when not loading and the list is empty", () => {
    const wrapper = mountTable({ isLoading: false, announcements: [] });
    expect(wrapper.find("tr.shimmer-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("No announcements found");
    const emptyCell = wrapper.find("td.text-center");
    expect(emptyCell.exists()).toBe(true);
    expect(emptyCell.attributes("colspan")).toBe("11");
  });

  it("renders a data row with all fields populated (truthy branches)", () => {
    const wrapper = mountTable({
      isLoading: false,
      announcements: [makeAnnouncement()],
      page: 2,
      pageSize: 10,
    });

    // No empty state when there is data.
    expect(wrapper.text()).not.toContain("No announcements found");

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(1);
    const cells = rows[0].findAll("td");

    // Row number = page * pageSize + index + 1 = 2*10 + 0 + 1 = 21
    expect(cells[0].text()).toBe("21");

    // Image present branch.
    const img = wrapper.find("td img.rounded");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn.example.com/a.jpg");

    // Title.
    expect(wrapper.text()).toContain("First Notice");
    // Description.
    expect(wrapper.text()).toContain("A description here.");
    // Location present.
    expect(wrapper.text()).toContain("Town Hall");
    // Category present.
    expect(wrapper.text()).toContain("Community");
    // Priority present.
    expect(wrapper.text()).toContain("high");

    // Status badge class (published -> badge bg-success).
    const statusSpan = wrapper.find("span.badge.bg-success");
    expect(statusSpan.exists()).toBe(true);
    expect(statusSpan.text()).toBe("published");

    // Dates split on "T".
    expect(wrapper.text()).toContain("2025-03-09");
    expect(wrapper.text()).toContain("2025-04-09");
  });

  it("renders fallback dashes and skips the image when optional fields are missing (falsy branches)", () => {
    const wrapper = mountTable({
      isLoading: false,
      announcements: [
        makeAnnouncement({
          image: null,
          location: null,
          category: null,
          priority: null,
          status: "unknown-status",
          publish_date: null,
          expire_date: null,
        }),
      ],
    });

    // Image absent branch -> no img element.
    expect(wrapper.find("td img.rounded").exists()).toBe(false);

    // location ?? "-", category?.name ?? "-", priority ?? "-"
    const dashes = wrapper.findAll("span.truncate-2").filter((s) => s.text() === "-");
    // location, category, priority all collapse to "-"
    expect(dashes.length).toBe(3);

    // Unknown status -> default badge class.
    const statusSpan = wrapper.find("span.badge.bg-secondary");
    expect(statusSpan.exists()).toBe(true);
    expect(statusSpan.text()).toBe("unknown-status");

    // publish_date / expire_date null -> optional chaining yields nothing rendered.
    expect(wrapper.text()).not.toContain("2025-03-09");
    expect(wrapper.text()).not.toContain("2025-04-09");
  });

  it("renders multiple rows and numbers them with page=0 default", () => {
    const wrapper = mountTable({
      isLoading: false,
      announcements: [
        makeAnnouncement({ id: 1, title: "One" }),
        makeAnnouncement({ id: 2, title: "Two" }),
        makeAnnouncement({ id: 3, title: "Three" }),
      ],
    });
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(3);
    // page default 0, pageSize default 10 -> 1, 2, 3
    expect(rows[0].findAll("td")[0].text()).toBe("1");
    expect(rows[1].findAll("td")[0].text()).toBe("2");
    expect(rows[2].findAll("td")[0].text()).toBe("3");
  });

  it("emits handle-preview with the announcement id when the eye button is clicked", async () => {
    const wrapper = mountTable({
      isLoading: false,
      announcements: [makeAnnouncement({ id: 42 })],
    });
    await wrapper.find("button.text-secondary").trigger("click");
    expect(wrapper.emitted("handle-preview")).toBeTruthy();
    expect(wrapper.emitted("handle-preview")[0]).toEqual([42]);
  });

  it("emits handle-delete with the announcement id when the trash button is clicked", async () => {
    const wrapper = mountTable({
      isLoading: false,
      announcements: [makeAnnouncement({ id: 7 })],
    });
    await wrapper.find("button.text-danger").trigger("click");
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([7]);
  });

  it("renders the edit router-link to the announcement edit route", () => {
    const wrapper = mountTable({
      isLoading: false,
      announcements: [makeAnnouncement({ id: 99 })],
    });
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("announcements/edit/99");
  });
});

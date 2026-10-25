import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import Dashboard from "@/views/Admin/Dashboard.vue";

// Dashboard.vue is a purely presentational admin overview page: it imports
// nothing, has no reactive state, no methods, and no template branches
// (no v-if / v-else / v-for). The only instrumented executable code is the
// component options object (`export default { name: "AdminDashboard" }`), which
// is exercised simply by mounting the component. We still assert the rendered
// static structure so the test is meaningful, not just a coverage stamp.

function mountDashboard() {
  return mount(Dashboard, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe("Dashboard.vue", () => {
  it("registers the component under the AdminDashboard name", () => {
    const wrapper = mountDashboard();
    expect(wrapper.vm.$options.name).toBe("AdminDashboard");
  });

  it("renders the page header and the Add New Post action", () => {
    const wrapper = mountDashboard();

    expect(wrapper.find("h1.h3").text()).toBe("Dashboard");
    expect(wrapper.find("p.text-muted").text()).toContain("Welcome back");

    const addBtn = wrapper.find("button.btn-primary");
    expect(addBtn.exists()).toBe(true);
    expect(addBtn.text()).toContain("Add New Post");
  });

  it("renders all four statistics cards with their metrics", () => {
    const wrapper = mountDashboard();

    const cards = wrapper.findAll(".row.g-3.mb-4 .card");
    expect(cards).toHaveLength(4);

    const text = wrapper.text();
    expect(text).toContain("Total Posts");
    expect(text).toContain("58");
    expect(text).toContain("Total Videos");
    expect(text).toContain("24");
    expect(text).toContain("Businesses");
    expect(text).toContain("42");
    expect(text).toContain("Total Users");
    expect(text).toContain("1,254");
  });

  it("renders the recent activity feed with five items", () => {
    const wrapper = mountDashboard();

    expect(wrapper.find(".card-title").text()).toBe("Recent Articles");

    const activityItems = wrapper.findAll(".list-group-item.py-3");
    // 5 recent-activity entries + 5 pending-task entries
    expect(activityItems.length).toBe(10);

    const text = wrapper.text();
    expect(text).toContain("New post published");
    expect(text).toContain("New user registered");
    expect(text).toContain("New business added");
    expect(text).toContain("New comment");
    expect(text).toContain("New event created");
    expect(wrapper.find(".card-footer a").text()).toBe("View all activity");
  });

  it("renders the Quick Draft form with title and body inputs", () => {
    const wrapper = mountDashboard();

    const form = wrapper.find("form");
    expect(form.exists()).toBe(true);
    expect(form.find("input[type='text']").attributes("placeholder")).toBe(
      "Title"
    );
    expect(form.find("textarea").attributes("placeholder")).toBe(
      "Write something..."
    );
    expect(form.find("button[type='submit']").text()).toBe("Save Draft");
  });

  it("renders the five pending tasks with priority badges", () => {
    const wrapper = mountDashboard();

    const checkboxes = wrapper.findAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(5);

    const badges = wrapper.findAll(".list-group-item .badge");
    const badgeText = badges.map((b) => b.text());
    expect(badgeText).toContain("Important");
    expect(badgeText).toContain("This week");
    expect(badgeText).toContain("Urgent");
  });
});

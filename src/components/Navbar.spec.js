import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Navbar from "@/components/Navbar.vue";

function mountNavbar() {
  return mount(Navbar, {
    global: {
      // `drop-down` is referenced in the template but registered globally in the
      // host app; stub it with a component that renders its default slot so the
      // slotted notification links (and istanbul's slot-content branch) are
      // exercised rather than skipped.
      stubs: {
        "drop-down": {
          name: "drop-down",
          template: '<div class="drop-down-stub"><slot /></div>',
        },
      },
    },
  });
}

describe("Navbar", () => {
  it("renders the navbar shell with the expand/light bootstrap classes", () => {
    const wrapper = mountNavbar();
    const nav = wrapper.find("nav.navbar");
    expect(nav.exists()).toBe(true);
    expect(nav.classes()).toEqual(
      expect.arrayContaining([
        "navbar",
        "navbar-expand-lg",
        "navbar-light",
      ])
    );
    expect(wrapper.find("div.container-fluid").exists()).toBe(true);
    expect(wrapper.find("div.collapse.navbar-collapse").exists()).toBe(true);
  });

  it("renders the Stats and Settings nav items with their icons", () => {
    const wrapper = mountNavbar();
    const links = wrapper.findAll("ul.navbar-nav > li.nav-item a.nav-link");
    expect(links).toHaveLength(2);

    expect(wrapper.find("i.ti-panel").exists()).toBe(true);
    expect(wrapper.find("i.ti-settings").exists()).toBe(true);

    const text = wrapper.text();
    expect(text).toContain("Stats");
    expect(text).toContain("Settings");
  });

  it("renders the notifications drop-down with its slotted notification items", () => {
    const wrapper = mountNavbar();
    const dropdown = wrapper.find("div.drop-down-stub");
    expect(dropdown.exists()).toBe(true);

    const items = dropdown.findAll("a.dropdown-item");
    expect(items).toHaveLength(5);
    expect(items.map((a) => a.text())).toEqual([
      "Notification 1",
      "Notification 2",
      "Notification 3",
      "Notification 4",
      "Another notification",
    ]);
  });
});

import { describe, it, expect, vi } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import { createStore } from "vuex";
import BottomNav from "@/components/BottomNav.vue";

function mountNav({ drawerOpen = false, toggleDrawer = vi.fn() } = {}) {
  const store = createStore({
    state: () => ({ drawerOpen }),
    actions: { toggleDrawer },
  });
  const wrapper = mount(BottomNav, {
    global: { plugins: [store], stubs: { RouterLink: RouterLinkStub } },
  });
  return { wrapper, toggleDrawer };
}

describe("BottomNav", () => {
  it("renders the four primary tabs plus a More button", () => {
    const { wrapper } = mountNav();
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(4);
    expect(wrapper.find("button.bn-more").exists()).toBe(true);
  });

  it("links the primary tabs to the expected routes", () => {
    const { wrapper } = mountNav();
    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(targets).toEqual(["/", "/news", "/community", "/podcasts"]);
  });

  it("dispatches toggleDrawer when More is tapped", async () => {
    const { wrapper, toggleDrawer } = mountNav();
    await wrapper.find("button.bn-more").trigger("click");
    expect(toggleDrawer).toHaveBeenCalledTimes(1);
  });

  it("marks More active while the drawer is open", () => {
    const { wrapper } = mountNav({ drawerOpen: true });
    expect(wrapper.find("button.bn-more").classes()).toContain("active");
  });

  it("does not mark More active while the drawer is closed", () => {
    const { wrapper } = mountNav({ drawerOpen: false });
    expect(wrapper.find("button.bn-more").classes()).not.toContain("active");
  });
});

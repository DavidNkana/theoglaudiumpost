import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the only external boundary this view imports: NewspaperView.
// We render it as a lightweight component that exposes the `mode` prop it
// receives so the wrapper's behaviour can be asserted on real rendered output.
vi.mock("@/views/Newspaper/NewspaperView.vue", () => ({
  default: {
    name: "NewspaperView",
    props: {
      mode: { type: String, default: "latest" },
    },
    template: '<div class="newspaper-view-stub" :data-mode="mode">news</div>',
  },
}));

import Archive from "@/views/News/Archive.vue";

describe("News/Archive.vue", () => {
  it("renders the NewspaperView child", async () => {
    const wrapper = mount(Archive);
    await flushPromises();

    const child = wrapper.find(".newspaper-view-stub");
    expect(child.exists()).toBe(true);
    expect(child.text()).toBe("news");
  });

  it("passes mode=\"archive\" down to NewspaperView", async () => {
    const wrapper = mount(Archive);
    await flushPromises();

    const child = wrapper.findComponent({ name: "NewspaperView" });
    expect(child.exists()).toBe(true);
    expect(child.props("mode")).toBe("archive");
    expect(wrapper.find(".newspaper-view-stub").attributes("data-mode")).toBe(
      "archive"
    );
  });
});

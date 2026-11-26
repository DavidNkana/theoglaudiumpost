import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CommunityPostGrid from "./CommunityPostGrid.vue";

describe("CommunityPostGrid", () => {
  it("renders image-led links and dispatches published post loading", async () => {
    const dispatch = vi.fn().mockResolvedValue([]);
    const wrapper = mount(CommunityPostGrid, {
      global: { provide: { store: { getters: { "communityPosts/posts": [{ id: "1", slug: "street-fair", title: "Street Fair", image_url: "/fair.jpg", published_at: "2026-01-01" }] }, state: { communityPosts: { loading: false } }, dispatch } }, stubs: { RouterLink: { template: "<a :href='to'><slot /></a>", props: ["to"] } } },
    });
    expect(wrapper.find("img").attributes("src")).toBe("/fair.jpg");
    expect(wrapper.find("a").attributes("href")).toBe("/community/street-fair");
    expect(dispatch).toHaveBeenCalledWith("communityPosts/fetchPosts", { status: "published" });
  });
});

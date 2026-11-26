import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Detail from "@/views/Advertisements/Detail.vue";

const { getAd, trackClick } = vi.hoisted(() => ({ getAd: vi.fn(), trackClick: vi.fn() }));
vi.mock("@/features/ads/AdsService", () => ({ getAd, trackClick }));
vi.mock("@/features/media/MediaService", () => ({ getMediaObjectUrl: vi.fn() }));

describe("advertisement detail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and renders admin-managed ad content and keeps the CTA external", async () => {
    getAd.mockResolvedValue({ data: {
      id: "ad-1", title: "Opening special", description: "Save today", business_name: "Market",
      images: ["https://cdn.test/one.jpg", "https://cdn.test/two.jpg"], files: ["https://cdn.test/one.jpg", "https://cdn.test/two.jpg"],
      click_url: "https://market.test/offer", campaign_id: "campaign-1", placement_date: "2026-01-01",
    } });

    const wrapper = mount(Detail, { props: { id: "ad-1" } });
    await flushPromises();
    expect(getAd).toHaveBeenCalledWith("ad-1");
    expect(wrapper.text()).toContain("Opening special");
    expect(wrapper.text()).toContain("Market");
    expect(wrapper.findAll("img")).toHaveLength(2);
    const cta = wrapper.get("a.btn");
    expect(cta.attributes("href")).toBe("https://market.test/offer");
    expect(cta.attributes("target")).toBe("_blank");
    expect(cta.attributes("rel")).toBe("noopener noreferrer");
    await cta.trigger("click");
    expect(trackClick).toHaveBeenCalledWith("ad-1");
  });

  it("does not render a clickable CTA for unsafe destinations", async () => {
    getAd.mockResolvedValue({ data: { id: "ad-2", title: "Unsafe", click_url: "javascript:alert(1)" } });
    const wrapper = mount(Detail, { props: { id: "ad-2" } });
    await flushPromises();
    expect(wrapper.find("a.btn").exists()).toBe(false);
    expect(wrapper.text()).toContain("no valid destination");
  });
});

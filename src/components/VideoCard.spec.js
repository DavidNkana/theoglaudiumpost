import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import VideoCard from "@/components/VideoCard.vue";

// Fixed ISO timestamp so date-derived assertions are stable across machines.
const FIXED_DATE = "2025-03-09T14:05:00Z";

function makeVideo(overrides = {}) {
  return {
    id: { videoId: "abc123XYZ" },
    snippet: {
      title: "Sample Video Title",
      description: "An informative description of the video.",
      publishedAt: FIXED_DATE,
    },
    ...overrides,
  };
}

function mountCard(props = {}) {
  return mount(VideoCard, {
    props: { video: makeVideo(), ...props },
  });
}

describe("VideoCard", () => {
  it("embeds the YouTube iframe with the video id, title, and allow attrs", () => {
    const wrapper = mountCard();
    const iframe = wrapper.find("iframe");
    expect(iframe.exists()).toBe(true);
    expect(iframe.attributes("src")).toBe(
      "https://www.youtube.com/embed/abc123XYZ"
    );
    expect(iframe.attributes("title")).toBe("Sample Video Title");
    expect(iframe.attributes("allowfullscreen")).toBeDefined();
    expect(iframe.attributes("allow")).toContain("autoplay");
  });

  it("renders the title and description text from snippet", () => {
    const wrapper = mountCard();
    expect(wrapper.find("h5.video-title").text()).toBe("Sample Video Title");
    expect(wrapper.find("p.card-text").text()).toBe(
      "An informative description of the video."
    );
  });

  it("reflects different video data through reactive bindings", () => {
    const wrapper = mountCard({
      video: makeVideo({
        id: { videoId: "zzz999" },
        snippet: {
          title: "Another Title",
          description: "Different description.",
          publishedAt: FIXED_DATE,
        },
      }),
    });
    expect(wrapper.find("iframe").attributes("src")).toBe(
      "https://www.youtube.com/embed/zzz999"
    );
    expect(wrapper.find("h5.video-title").text()).toBe("Another Title");
    expect(wrapper.find("p.card-text").text()).toBe("Different description.");
  });

  it("formatDate returns a localized en-ZA date string", () => {
    const wrapper = mountCard();
    const expected = new Date(FIXED_DATE).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    expect(wrapper.vm.formatDate(FIXED_DATE)).toBe(expected);
  });
});

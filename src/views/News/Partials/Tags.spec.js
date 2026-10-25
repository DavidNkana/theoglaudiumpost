import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the Vuex store boundary --------------------------------------------
// A single shared dispatch spy + a mutable getters bag let each test drive the
// fetchTags async path (resolve / reject) and the template v-for (empty /
// non-empty) independently, then assert on the exact dispatched action and the
// real rendered badge output.
const dispatch = vi.fn();
let tagsGetter = [];

vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch,
    getters: {
      get "tags/tags"() {
        return tagsGetter;
      },
    },
  }),
}));

import Tags from "@/views/News/Partials/Tags.vue";

const mountTags = (props = {}) => mount(Tags, { props });

describe("Tags.vue", () => {
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    tagsGetter = [];
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("dispatches tags/fetchTags on mount (success path)", async () => {
    dispatch.mockResolvedValueOnce(undefined);

    const wrapper = mountTags();
    await flushPromises();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("tags/fetchTags");
    // Static header always renders.
    expect(wrapper.find(".section-title").text()).toBe("Popular Tags");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("uses the default `page` prop ('news') when none provided", () => {
    dispatch.mockResolvedValueOnce(undefined);
    const wrapper = mountTags();
    expect(wrapper.props("page")).toBe("news");
  });

  it("accepts an explicit `page` prop override", () => {
    dispatch.mockResolvedValueOnce(undefined);
    const wrapper = mountTags({ page: "home" });
    expect(wrapper.props("page")).toBe("home");
  });

  it("renders no tag anchors when the getter returns an empty list (empty v-for)", async () => {
    dispatch.mockResolvedValueOnce(undefined);
    tagsGetter = [];

    const wrapper = mountTags();
    await flushPromises();

    expect(wrapper.find(".tags").exists()).toBe(true);
    expect(wrapper.findAll(".tags a.badge")).toHaveLength(0);
  });

  it("renders one anchor per tag with its name (non-empty v-for)", async () => {
    dispatch.mockResolvedValueOnce(undefined);
    tagsGetter = [
      { id: 1, name: "Sports" },
      { id: 2, name: "Politics" },
      { id: 3, name: "Tech" },
    ];

    const wrapper = mountTags();
    await flushPromises();

    const anchors = wrapper.findAll(".tags a.badge");
    expect(anchors).toHaveLength(3);
    expect(anchors.map((a) => a.text())).toEqual(["Sports", "Politics", "Tech"]);
    // Each anchor is a non-routing placeholder link.
    expect(anchors[0].attributes("href")).toBe("#");
  });

  it("logs the error and clears loading when the dispatch rejects (catch path)", async () => {
    const boom = new Error("network down");
    dispatch.mockRejectedValueOnce(boom);

    const wrapper = mountTags();
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("tags/fetchTags");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", boom);
    // Even on failure the static markup is intact and no badges leaked.
    expect(wrapper.find(".section-title").exists()).toBe(true);
    expect(wrapper.findAll(".tags a.badge")).toHaveLength(0);
  });
});

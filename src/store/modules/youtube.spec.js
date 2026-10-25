import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock external boundaries the source imports ----

vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/features/youtube/YoutubeService", () => ({
  getChannelVideos: vi.fn(),
  getVideoDetails: vi.fn(),
  getChannelInfo: vi.fn(),
  searchVideos: vi.fn(),
}));

vi.mock("@/config/app", () => ({
  YOUTUBE_DEFAULT_CHANNEL_ID: "DEFAULT_CHANNEL",
}));

import {
  getChannelVideos,
  getVideoDetails,
  getChannelInfo,
  searchVideos as searchVideosService,
} from "@/features/youtube/YoutubeService";

import youtubeModule from "@/store/modules/youtube";

const { state: stateFactory, getters, mutations, actions } = youtubeModule;

// Helper: fresh state for each test
function freshState() {
  return stateFactory();
}

// Helper: build a video object with a videoId
function makeVideo(id) {
  return { id: { videoId: id }, snippet: { title: `Video ${id}` } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("youtube module structure", () => {
  it("is a namespaced module with all slices", () => {
    expect(youtubeModule.namespaced).toBe(true);
    expect(typeof youtubeModule.state).toBe("function");
    expect(youtubeModule.getters).toBe(getters);
    expect(youtubeModule.mutations).toBe(mutations);
    expect(youtubeModule.actions).toBe(actions);
  });

  it("state factory returns default shape including default channel id", () => {
    const s = freshState();
    expect(s.page).toBe(0);
    expect(s.all).toEqual({
      videosByPage: {},
      hasMore: true,
      total: 0,
      totalPages: 0,
      page: 0,
      size: 8,
    });
    expect(s.recent).toEqual([]);
    expect(s.channelInfo).toBeNull();
    expect(s.error).toBeNull();
    expect(s.defaultChannelId).toBe("DEFAULT_CHANNEL");
  });
});

describe("getters", () => {
  it("currentPage returns state.page", () => {
    const s = freshState();
    s.page = 3;
    expect(getters.currentPage(s)).toBe(3);
  });

  it("videos flattens all pages into a single array", () => {
    const s = freshState();
    s.all.videosByPage = {
      0: [makeVideo("a"), makeVideo("b")],
      1: [makeVideo("c")],
    };
    const result = getters.videos(s);
    expect(result.map((v) => v.id.videoId)).toEqual(["a", "b", "c"]);
  });

  it("recent returns state.recent", () => {
    const s = freshState();
    const vids = [makeVideo("x")];
    s.recent = vids;
    expect(getters.recent(s)).toBe(vids);
  });

  it("channelInfo returns state.channelInfo", () => {
    const s = freshState();
    s.channelInfo = { id: "chan" };
    expect(getters.channelInfo(s)).toEqual({ id: "chan" });
  });

  it("hasMore returns state.all.hasMore", () => {
    const s = freshState();
    expect(getters.hasMore(s)).toBe(true);
    s.all.hasMore = false;
    expect(getters.hasMore(s)).toBe(false);
  });
});

describe("mutations", () => {
  it("setRecent sets the recent videos array", () => {
    const s = freshState();
    const vids = [makeVideo("r1")];
    mutations.setRecent(s, vids);
    expect(s.recent).toBe(vids);
  });

  it("setByType updates the matching page when type is 'all' (true branch)", () => {
    const s = freshState();
    const videos = [makeVideo("v1")];
    mutations.setByType(s, {
      type: "all",
      videos,
      page: 2,
      total: 99,
      totalResults: 50,
      hasMore: true,
      nextPageToken: "TOKEN_X",
    });
    expect(s.all.videosByPage[2]).toBe(videos);
    expect(s.all.page).toBe(2);
    expect(s.all.total).toBe(50);
    expect(s.all.nextPageToken).toBe("TOKEN_X");
    expect(s.all.hasMore).toBe(true);
  });

  it("setByType ignores unknown type not present in state (false branch: not in state)", () => {
    const s = freshState();
    const before = JSON.parse(JSON.stringify(s.all));
    mutations.setByType(s, {
      type: "unknownType",
      videos: [makeVideo("z")],
      page: 0,
      totalResults: 1,
      hasMore: true,
      nextPageToken: "T",
    });
    expect(s.all).toEqual(before);
  });

  it("setByType ignores type that is in state but not equal to 'all' (false branch: type != all)", () => {
    const s = freshState();
    const before = JSON.parse(JSON.stringify(s.all));
    // "recent" is a key in state, so `type in state` is true, but type != "all"
    mutations.setByType(s, {
      type: "recent",
      videos: [makeVideo("z")],
      page: 0,
      totalResults: 1,
      hasMore: true,
      nextPageToken: "T",
    });
    expect(s.all).toEqual(before);
  });

  it("setChannelInfo sets channel info", () => {
    const s = freshState();
    mutations.setChannelInfo(s, { id: "chanA" });
    expect(s.channelInfo).toEqual({ id: "chanA" });
    mutations.setChannelInfo(s, null);
    expect(s.channelInfo).toBeNull();
  });

  it("setError sets the error message", () => {
    const s = freshState();
    mutations.setError(s, "boom");
    expect(s.error).toBe("boom");
  });

  describe("addVideo", () => {
    it("adds a video, creating the current page array when missing (page object missing branch)", () => {
      const s = freshState();
      s.page = 0;
      // videosByPage[0] does not exist yet
      mutations.addVideo(s, { video: makeVideo("new1") });
      expect(s.all.videosByPage[0].map((v) => v.id.videoId)).toEqual(["new1"]);
    });

    it("appends to the existing current page array (page object exists branch)", () => {
      const s = freshState();
      s.page = 0;
      s.all.videosByPage[0] = [makeVideo("existing")];
      mutations.addVideo(s, { video: makeVideo("new2") });
      expect(s.all.videosByPage[0].map((v) => v.id.videoId)).toEqual([
        "existing",
        "new2",
      ]);
    });

    it("does not add a duplicate video (exists -> early return)", () => {
      const s = freshState();
      s.page = 0;
      s.all.videosByPage[0] = [makeVideo("dup")];
      mutations.addVideo(s, { video: makeVideo("dup") });
      expect(s.all.videosByPage[0].length).toBe(1);
    });

    it("treats a null/empty page entry as empty when scanning for duplicates (page || [] branch)", () => {
      const s = freshState();
      s.page = 1;
      // a null page should be coerced to [] by flatMap(page => page || [])
      s.all.videosByPage[0] = null;
      mutations.addVideo(s, { video: makeVideo("brandnew") });
      expect(s.all.videosByPage[1].map((v) => v.id.videoId)).toEqual([
        "brandnew",
      ]);
    });
  });

  it("clearVideos resets the all slice", () => {
    const s = freshState();
    s.all.videosByPage = { 0: [makeVideo("a")] };
    s.all.hasMore = false;
    s.all.total = 10;
    mutations.clearVideos(s);
    expect(s.all).toEqual({
      videosByPage: {},
      hasMore: true,
      total: 0,
      totalPages: 0,
      page: 0,
      size: 8,
      nextPageToken: null,
    });
  });
});

describe("actions.fetchRecentVideos", () => {
  it("skips API call when recent videos already loaded", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.recent = [makeVideo("already")];
    await actions.fetchRecentVideos({ commit, state: s }, {});
    expect(getChannelVideos).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("uses provided channelId and commits setRecent on success", async () => {
    const commit = vi.fn();
    const s = freshState();
    const items = [makeVideo("rv1")];
    getChannelVideos.mockResolvedValue({ items });
    await actions.fetchRecentVideos(
      { commit, state: s },
      { channelId: "MY_CHANNEL", size: 5, page: 0 }
    );
    expect(getChannelVideos).toHaveBeenCalledWith("MY_CHANNEL", {
      maxResults: 5,
      pageToken: "",
    });
    expect(commit).toHaveBeenCalledWith("setRecent", items);
  });

  it("falls back to default channel when channelId omitted (default params + || fallback)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue({ items: [] });
    await actions.fetchRecentVideos({ commit, state: s }, {});
    expect(getChannelVideos).toHaveBeenCalledWith("DEFAULT_CHANNEL", {
      maxResults: 8,
      pageToken: "",
    });
    expect(commit).toHaveBeenCalledWith("setRecent", []);
  });

  it("throws and commits setError when no channel id available", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.defaultChannelId = "";
    await expect(
      actions.fetchRecentVideos({ commit, state: s }, { channelId: "" })
    ).rejects.toThrow("No channel ID provided");
    expect(commit).toHaveBeenCalledWith("setError", "No channel ID provided");
    expect(getChannelVideos).not.toHaveBeenCalled();
  });

  it("throws when response is missing items (response present, no items)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue({});
    await expect(
      actions.fetchRecentVideos({ commit, state: s }, { channelId: "C" })
    ).rejects.toThrow("Failed to fetch recent videos");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch recent videos"
    );
  });

  it("throws when response is null/falsy (response falsy branch)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue(null);
    await expect(
      actions.fetchRecentVideos({ commit, state: s }, { channelId: "C" })
    ).rejects.toThrow("Failed to fetch recent videos");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch recent videos"
    );
  });

  it("propagates service rejection (catch path)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockRejectedValue(new Error("network down"));
    await expect(
      actions.fetchRecentVideos({ commit, state: s }, { channelId: "C" })
    ).rejects.toThrow("network down");
    expect(commit).toHaveBeenCalledWith("setError", "network down");
  });
});

describe("actions.fetchVideos", () => {
  it("skips when hasMore is false", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.hasMore = false;
    await actions.fetchVideos({ commit, state: s, getters: {} }, {});
    expect(getChannelVideos).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("skips when the requested page already has videos", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.videosByPage[0] = [makeVideo("p0")];
    await actions.fetchVideos(
      { commit, state: s, getters: {} },
      { page: 0 }
    );
    expect(getChannelVideos).not.toHaveBeenCalled();
  });

  it("does not skip when page entry exists but is empty (length == 0 branch)", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.videosByPage[0] = []; // exists but empty -> should NOT skip
    getChannelVideos.mockResolvedValue({
      items: [makeVideo("v")],
      nextPageToken: "N",
      pageInfo: { totalResults: 3 },
    });
    await actions.fetchVideos({ commit, state: s, getters: {} }, { page: 0 });
    expect(getChannelVideos).toHaveBeenCalled();
  });

  it("fetches with default channel and page 0 token empty, commits setByType", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue({
      items: [makeVideo("v1")],
      nextPageToken: "NEXT",
      pageInfo: { totalResults: 25 },
    });
    await actions.fetchVideos(
      { commit, state: s, getters: {} },
      { channelId: "", size: 10, page: 0 }
    );
    expect(getChannelVideos).toHaveBeenCalledWith("DEFAULT_CHANNEL", {
      maxResults: 10,
      pageToken: "",
    });
    expect(commit).toHaveBeenCalledWith("setByType", {
      type: "all",
      videos: [makeVideo("v1")],
      page: 0,
      totalResults: 25,
      hasMore: true,
      nextPageToken: "NEXT",
    });
  });

  it("uses nextPageToken when page > 0 (ternary true branch) and provided channelId", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.nextPageToken = "STORED_TOKEN";
    getChannelVideos.mockResolvedValue({
      items: [makeVideo("v2")],
      nextPageToken: null,
      pageInfo: { totalResults: 5 },
    });
    await actions.fetchVideos(
      { commit, state: s, getters: {} },
      { channelId: "PROVIDED", size: 4, page: 2 }
    );
    expect(getChannelVideos).toHaveBeenCalledWith("PROVIDED", {
      maxResults: 4,
      pageToken: "STORED_TOKEN",
    });
    // nextPageToken null -> hasMore false, totalResults default branch handled separately
    expect(commit).toHaveBeenCalledWith("setByType", {
      type: "all",
      videos: [makeVideo("v2")],
      page: 2,
      totalResults: 5,
      hasMore: false,
      nextPageToken: null,
    });
  });

  it("defaults totalResults to 0 when pageInfo missing (pageInfo?.totalResults || 0 branch)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue({
      items: [makeVideo("v3")],
      nextPageToken: "T",
      // no pageInfo
    });
    await actions.fetchVideos({ commit, state: s, getters: {} }, { page: 0 });
    expect(commit).toHaveBeenCalledWith(
      "setByType",
      expect.objectContaining({ totalResults: 0 })
    );
  });

  it("throws and commits setError when no channel id available", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.defaultChannelId = "";
    await expect(
      actions.fetchVideos(
        { commit, state: s, getters: {} },
        { channelId: "" }
      )
    ).rejects.toThrow("No channel ID provided");
    expect(commit).toHaveBeenCalledWith("setError", "No channel ID provided");
  });

  it("throws when response missing items", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue({});
    await expect(
      actions.fetchVideos({ commit, state: s, getters: {} }, { page: 0 })
    ).rejects.toThrow("Failed to fetch videos");
    expect(commit).toHaveBeenCalledWith("setError", "Failed to fetch videos");
  });

  it("throws when response falsy", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockResolvedValue(null);
    await expect(
      actions.fetchVideos({ commit, state: s, getters: {} }, { page: 0 })
    ).rejects.toThrow("Failed to fetch videos");
  });

  it("propagates service rejection (catch path)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelVideos.mockRejectedValue(new Error("api error"));
    await expect(
      actions.fetchVideos({ commit, state: s, getters: {} }, { page: 0 })
    ).rejects.toThrow("api error");
    expect(commit).toHaveBeenCalledWith("setError", "api error");
  });
});

describe("actions.fetchChannelInfo", () => {
  it("skips when channelInfo already loaded", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.channelInfo = { id: "loaded" };
    await actions.fetchChannelInfo({ commit, state: s }, "C");
    expect(getChannelInfo).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("uses provided channel id and commits setChannelInfo on success", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelInfo.mockResolvedValue({ items: [{ id: "chan1" }] });
    await actions.fetchChannelInfo({ commit, state: s }, "PROVIDED");
    expect(getChannelInfo).toHaveBeenCalledWith("PROVIDED");
    expect(commit).toHaveBeenCalledWith("setChannelInfo", { id: "chan1" });
  });

  it("falls back to default channel when channelId omitted (default param + fallback)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelInfo.mockResolvedValue({ items: [{ id: "chanD" }] });
    await actions.fetchChannelInfo({ commit, state: s });
    expect(getChannelInfo).toHaveBeenCalledWith("DEFAULT_CHANNEL");
    expect(commit).toHaveBeenCalledWith("setChannelInfo", { id: "chanD" });
  });

  it("throws when no channel id available", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.defaultChannelId = "";
    await expect(
      actions.fetchChannelInfo({ commit, state: s }, "")
    ).rejects.toThrow("No channel ID provided");
    expect(commit).toHaveBeenCalledWith("setError", "No channel ID provided");
  });

  it("throws when response missing items", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelInfo.mockResolvedValue({});
    await expect(
      actions.fetchChannelInfo({ commit, state: s }, "C")
    ).rejects.toThrow("Failed to fetch channel info");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch channel info"
    );
  });

  it("throws when response falsy", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelInfo.mockResolvedValue(null);
    await expect(
      actions.fetchChannelInfo({ commit, state: s }, "C")
    ).rejects.toThrow("Failed to fetch channel info");
  });

  it("throws when items array is empty (items.length === 0 branch)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelInfo.mockResolvedValue({ items: [] });
    await expect(
      actions.fetchChannelInfo({ commit, state: s }, "C")
    ).rejects.toThrow("Failed to fetch channel info");
  });

  it("propagates service rejection (catch path)", async () => {
    const commit = vi.fn();
    const s = freshState();
    getChannelInfo.mockRejectedValue(new Error("chan fail"));
    await expect(
      actions.fetchChannelInfo({ commit, state: s }, "C")
    ).rejects.toThrow("chan fail");
    expect(commit).toHaveBeenCalledWith("setError", "chan fail");
  });
});

describe("actions.fetchVideoDetails", () => {
  it("fetches details, commits addVideo and returns the video", async () => {
    const commit = vi.fn();
    const video = makeVideo("vid1");
    getVideoDetails.mockResolvedValue({ items: [video] });
    const result = await actions.fetchVideoDetails({ commit }, "vid1");
    expect(getVideoDetails).toHaveBeenCalledWith("vid1");
    expect(commit).toHaveBeenCalledWith("addVideo", { video });
    expect(result).toBe(video);
  });

  it("throws when response missing items", async () => {
    const commit = vi.fn();
    getVideoDetails.mockResolvedValue({});
    await expect(
      actions.fetchVideoDetails({ commit }, "vidX")
    ).rejects.toThrow("Video not found");
    expect(commit).toHaveBeenCalledWith("setError", "Video not found");
  });

  it("throws when response falsy", async () => {
    const commit = vi.fn();
    getVideoDetails.mockResolvedValue(null);
    await expect(
      actions.fetchVideoDetails({ commit }, "vidX")
    ).rejects.toThrow("Video not found");
  });

  it("throws when items array empty (items.length === 0 branch)", async () => {
    const commit = vi.fn();
    getVideoDetails.mockResolvedValue({ items: [] });
    await expect(
      actions.fetchVideoDetails({ commit }, "vidX")
    ).rejects.toThrow("Video not found");
  });

  it("propagates service rejection (catch path)", async () => {
    const commit = vi.fn();
    getVideoDetails.mockRejectedValue(new Error("detail fail"));
    await expect(
      actions.fetchVideoDetails({ commit }, "vidX")
    ).rejects.toThrow("detail fail");
    expect(commit).toHaveBeenCalledWith("setError", "detail fail");
  });
});

describe("actions.searchVideos", () => {
  it("skips when hasMore is false", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.hasMore = false;
    await actions.searchVideos({ commit, state: s }, { query: "q" });
    expect(searchVideosService).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("skips when requested page already has videos", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.videosByPage[0] = [makeVideo("existing")];
    await actions.searchVideos(
      { commit, state: s },
      { query: "q", page: 0 }
    );
    expect(searchVideosService).not.toHaveBeenCalled();
  });

  it("does not skip when page entry exists but is empty (length == 0 branch)", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.videosByPage[0] = [];
    searchVideosService.mockResolvedValue({
      items: [makeVideo("sv")],
      nextPageToken: "N",
      pageInfo: { totalResults: 2 },
    });
    await actions.searchVideos(
      { commit, state: s },
      { query: "q", page: 0 }
    );
    expect(searchVideosService).toHaveBeenCalled();
  });

  it("throws when no query provided (default query + validation)", async () => {
    const commit = vi.fn();
    const s = freshState();
    await expect(
      actions.searchVideos({ commit, state: s }, {})
    ).rejects.toThrow("No search query provided");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "No search query provided"
    );
    expect(searchVideosService).not.toHaveBeenCalled();
  });

  it("throws when default channel id missing", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.defaultChannelId = "";
    await expect(
      actions.searchVideos({ commit, state: s }, { query: "q" })
    ).rejects.toThrow("No channel ID provided");
    expect(commit).toHaveBeenCalledWith("setError", "No channel ID provided");
  });

  it("searches with empty token at page 0, commits setByType + setChannelInfo, returns items", async () => {
    const commit = vi.fn();
    const s = freshState();
    const items = [makeVideo("res1")];
    searchVideosService.mockResolvedValue({
      items,
      nextPageToken: "NEXT",
      pageInfo: { totalResults: 12 },
    });
    const result = await actions.searchVideos(
      { commit, state: s },
      { query: "hymns", size: 6, page: 0 }
    );
    expect(searchVideosService).toHaveBeenCalledWith("hymns", {
      maxResults: 6,
      pageToken: "",
      channelId: "DEFAULT_CHANNEL",
    });
    expect(commit).toHaveBeenCalledWith("setByType", {
      type: "all",
      videos: items,
      page: 0,
      totalResults: 12,
      hasMore: true,
      nextPageToken: "NEXT",
    });
    expect(commit).toHaveBeenCalledWith("setChannelInfo", null);
    expect(result).toBe(items);
  });

  it("uses stored nextPageToken when page > 0 (ternary true) and defaults totalResults (pageInfo missing)", async () => {
    const commit = vi.fn();
    const s = freshState();
    s.all.nextPageToken = "STORED";
    const items = [makeVideo("res2")];
    searchVideosService.mockResolvedValue({
      items,
      nextPageToken: null,
      // no pageInfo -> totalResults || 0
    });
    const result = await actions.searchVideos(
      { commit, state: s },
      { query: "psalms", size: 3, page: 1 }
    );
    expect(searchVideosService).toHaveBeenCalledWith("psalms", {
      maxResults: 3,
      pageToken: "STORED",
      channelId: "DEFAULT_CHANNEL",
    });
    expect(commit).toHaveBeenCalledWith("setByType", {
      type: "all",
      videos: items,
      page: 1,
      totalResults: 0,
      hasMore: false,
      nextPageToken: null,
    });
    expect(result).toBe(items);
  });

  it("throws when response missing items", async () => {
    const commit = vi.fn();
    const s = freshState();
    searchVideosService.mockResolvedValue({});
    await expect(
      actions.searchVideos({ commit, state: s }, { query: "q" })
    ).rejects.toThrow("Failed to search videos");
    expect(commit).toHaveBeenCalledWith("setError", "Failed to search videos");
  });

  it("throws when response falsy", async () => {
    const commit = vi.fn();
    const s = freshState();
    searchVideosService.mockResolvedValue(null);
    await expect(
      actions.searchVideos({ commit, state: s }, { query: "q" })
    ).rejects.toThrow("Failed to search videos");
  });

  it("propagates service rejection (catch path)", async () => {
    const commit = vi.fn();
    const s = freshState();
    searchVideosService.mockRejectedValue(new Error("search fail"));
    await expect(
      actions.searchVideos({ commit, state: s }, { query: "q" })
    ).rejects.toThrow("search fail");
    expect(commit).toHaveBeenCalledWith("setError", "search fail");
  });
});

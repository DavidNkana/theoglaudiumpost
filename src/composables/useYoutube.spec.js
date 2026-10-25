import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ------------------------------------------------------------------ */
/* Boundary mocks                                                      */
/* ------------------------------------------------------------------ */

// The only external collaborator: the YouTube resource service. Each domain
// function is a vi.fn so we can assert exact calls and force success/failure.
vi.mock("@/features/youtube/YoutubeService", () => ({
  getChannelVideos: vi.fn(),
  getVideoDetails: vi.fn(),
  getChannelInfo: vi.fn(),
}));

import {
  getChannelVideos,
  getVideoDetails,
  getChannelInfo,
} from "@/features/youtube/YoutubeService";
import { useYoutube } from "@/composables/useYoutube";

describe("useYoutube", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    // Swallow the expected console.error output from the catch branches.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /* Initial reactive state                                            */
  /* ---------------------------------------------------------------- */
  it("exposes the expected initial reactive state", () => {
    const yt = useYoutube();

    expect(yt.videos.value).toEqual([]);
    expect(yt.channelInfo.value).toBeNull();
    expect(yt.videoDetails.value).toEqual([]);
    expect(yt.loading.value).toBe(false);
    expect(yt.error.value).toBeNull();
    expect(yt.pagination).toEqual({
      nextPageToken: null,
      prevPageToken: null,
      totalResults: 0,
      resultsPerPage: 0,
    });
    expect(typeof yt.fetchChannelVideos).toBe("function");
    expect(typeof yt.fetchNextPage).toBe("function");
    expect(typeof yt.fetchPrevPage).toBe("function");
    expect(typeof yt.fetchVideoDetails).toBe("function");
    expect(typeof yt.fetchChannelInfo).toBe("function");
  });

  /* ---------------------------------------------------------------- */
  /* fetchChannelVideos                                                */
  /* ---------------------------------------------------------------- */
  describe("fetchChannelVideos", () => {
    it("sets an error and returns early when channelId is missing", async () => {
      const yt = useYoutube();

      await yt.fetchChannelVideos();

      expect(yt.error.value).toBe("Channel ID is required");
      expect(yt.loading.value).toBe(false);
      expect(getChannelVideos).not.toHaveBeenCalled();
    });

    it("treats an empty string channelId as missing too", async () => {
      const yt = useYoutube();

      await yt.fetchChannelVideos("");

      expect(yt.error.value).toBe("Channel ID is required");
      expect(getChannelVideos).not.toHaveBeenCalled();
    });

    it("loads videos and full pagination info on success (default options)", async () => {
      const yt = useYoutube();
      const response = {
        items: [{ id: "v1" }, { id: "v2" }],
        nextPageToken: "next-tok",
        prevPageToken: "prev-tok",
        pageInfo: { totalResults: 42, resultsPerPage: 10 },
      };
      getChannelVideos.mockResolvedValue(response);

      await yt.fetchChannelVideos("chan-1");

      // default options param exercised (called WITHOUT options)
      expect(getChannelVideos).toHaveBeenCalledWith("chan-1", {});
      expect(yt.videos.value).toEqual(response.items);
      expect(yt.pagination.nextPageToken).toBe("next-tok");
      expect(yt.pagination.prevPageToken).toBe("prev-tok");
      expect(yt.pagination.totalResults).toBe(42);
      expect(yt.pagination.resultsPerPage).toBe(10);
      expect(yt.loading.value).toBe(false);
      expect(yt.error.value).toBeNull();
    });

    it("forwards explicit options to the service", async () => {
      const yt = useYoutube();
      getChannelVideos.mockResolvedValue({ items: [] });
      const options = { maxResults: 5, order: "viewCount" };

      await yt.fetchChannelVideos("chan-2", options);

      expect(getChannelVideos).toHaveBeenCalledWith("chan-2", options);
    });

    it("falls back to null tokens and skips pagination counts when pageInfo is absent", async () => {
      const yt = useYoutube();
      // nextPageToken / prevPageToken falsy -> `|| null`; no pageInfo -> if() false
      getChannelVideos.mockResolvedValue({
        items: [{ id: "only" }],
        nextPageToken: undefined,
        prevPageToken: null,
      });

      await yt.fetchChannelVideos("chan-3");

      expect(yt.videos.value).toEqual([{ id: "only" }]);
      expect(yt.pagination.nextPageToken).toBeNull();
      expect(yt.pagination.prevPageToken).toBeNull();
      // pageInfo branch not taken -> counts stay at their initial 0
      expect(yt.pagination.totalResults).toBe(0);
      expect(yt.pagination.resultsPerPage).toBe(0);
    });

    it("falls back to 0 counts when pageInfo is present but fields are missing", async () => {
      const yt = useYoutube();
      // pageInfo truthy (if true) but totalResults/resultsPerPage falsy -> `|| 0`
      getChannelVideos.mockResolvedValue({
        items: [],
        pageInfo: { totalResults: 0, resultsPerPage: undefined },
      });

      await yt.fetchChannelVideos("chan-4");

      expect(yt.pagination.totalResults).toBe(0);
      expect(yt.pagination.resultsPerPage).toBe(0);
    });

    it("captures err.message on failure", async () => {
      const yt = useYoutube();
      const err = new Error("network down");
      getChannelVideos.mockRejectedValue(err);

      await yt.fetchChannelVideos("chan-5");

      expect(yt.error.value).toBe("network down");
      expect(yt.loading.value).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in useYoutube.fetchChannelVideos:",
        err
      );
    });

    it("uses a fallback message when the error has no message", async () => {
      const yt = useYoutube();
      // err.message falsy -> `|| "Failed to fetch YouTube videos"`
      getChannelVideos.mockRejectedValue({});

      await yt.fetchChannelVideos("chan-6");

      expect(yt.error.value).toBe("Failed to fetch YouTube videos");
    });
  });

  /* ---------------------------------------------------------------- */
  /* fetchNextPage                                                     */
  /* ---------------------------------------------------------------- */
  describe("fetchNextPage", () => {
    it("returns early when there is no nextPageToken", async () => {
      const yt = useYoutube();

      await yt.fetchNextPage("chan");

      expect(getChannelVideos).not.toHaveBeenCalled();
    });

    it("fetches the next page merging the token with default options", async () => {
      const yt = useYoutube();
      // Prime pagination via a successful first fetch.
      getChannelVideos.mockResolvedValue({
        items: [],
        nextPageToken: "page-2",
        prevPageToken: "page-0",
        pageInfo: { totalResults: 1, resultsPerPage: 1 },
      });
      await yt.fetchChannelVideos("chan");
      getChannelVideos.mockClear();
      getChannelVideos.mockResolvedValue({ items: [] });

      // called WITHOUT options -> default {}
      await yt.fetchNextPage("chan");

      expect(getChannelVideos).toHaveBeenCalledWith("chan", {
        pageToken: "page-2",
      });
    });

    it("merges provided options with the next page token", async () => {
      const yt = useYoutube();
      getChannelVideos.mockResolvedValue({
        items: [],
        nextPageToken: "page-2",
      });
      await yt.fetchChannelVideos("chan");
      getChannelVideos.mockClear();
      getChannelVideos.mockResolvedValue({ items: [] });

      await yt.fetchNextPage("chan", { order: "date" });

      expect(getChannelVideos).toHaveBeenCalledWith("chan", {
        order: "date",
        pageToken: "page-2",
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* fetchPrevPage                                                     */
  /* ---------------------------------------------------------------- */
  describe("fetchPrevPage", () => {
    it("returns early when there is no prevPageToken", async () => {
      const yt = useYoutube();

      await yt.fetchPrevPage("chan");

      expect(getChannelVideos).not.toHaveBeenCalled();
    });

    it("fetches the previous page merging the token with default options", async () => {
      const yt = useYoutube();
      getChannelVideos.mockResolvedValue({
        items: [],
        prevPageToken: "page-0",
      });
      await yt.fetchChannelVideos("chan");
      getChannelVideos.mockClear();
      getChannelVideos.mockResolvedValue({ items: [] });

      // called WITHOUT options -> default {}
      await yt.fetchPrevPage("chan");

      expect(getChannelVideos).toHaveBeenCalledWith("chan", {
        pageToken: "page-0",
      });
    });

    it("merges provided options with the previous page token", async () => {
      const yt = useYoutube();
      getChannelVideos.mockResolvedValue({
        items: [],
        prevPageToken: "page-0",
      });
      await yt.fetchChannelVideos("chan");
      getChannelVideos.mockClear();
      getChannelVideos.mockResolvedValue({ items: [] });

      await yt.fetchPrevPage("chan", { maxResults: 3 });

      expect(getChannelVideos).toHaveBeenCalledWith("chan", {
        maxResults: 3,
        pageToken: "page-0",
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* fetchVideoDetails                                                 */
  /* ---------------------------------------------------------------- */
  describe("fetchVideoDetails", () => {
    it("sets an error and returns early when videoIds is missing", async () => {
      const yt = useYoutube();

      await yt.fetchVideoDetails();

      expect(yt.error.value).toBe("Video ID(s) are required");
      expect(getVideoDetails).not.toHaveBeenCalled();
    });

    it("loads details from response.items on success", async () => {
      const yt = useYoutube();
      const items = [{ id: "a" }, { id: "b" }];
      getVideoDetails.mockResolvedValue({ items });

      await yt.fetchVideoDetails(["a", "b"]);

      expect(getVideoDetails).toHaveBeenCalledWith(["a", "b"]);
      expect(yt.videoDetails.value).toEqual(items);
      expect(yt.loading.value).toBe(false);
      expect(yt.error.value).toBeNull();
    });

    it("falls back to an empty array when response has no items", async () => {
      const yt = useYoutube();
      // response.items undefined -> `|| []`
      getVideoDetails.mockResolvedValue({});

      await yt.fetchVideoDetails("single");

      expect(yt.videoDetails.value).toEqual([]);
    });

    it("captures err.message on failure", async () => {
      const yt = useYoutube();
      const err = new Error("details boom");
      getVideoDetails.mockRejectedValue(err);

      await yt.fetchVideoDetails("v1");

      expect(yt.error.value).toBe("details boom");
      expect(yt.loading.value).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in useYoutube.fetchVideoDetails:",
        err
      );
    });

    it("uses a fallback message when the error has no message", async () => {
      const yt = useYoutube();
      getVideoDetails.mockRejectedValue({});

      await yt.fetchVideoDetails("v1");

      expect(yt.error.value).toBe("Failed to fetch video details");
    });
  });

  /* ---------------------------------------------------------------- */
  /* fetchChannelInfo                                                  */
  /* ---------------------------------------------------------------- */
  describe("fetchChannelInfo", () => {
    it("sets an error and returns early when channelId is missing", async () => {
      const yt = useYoutube();

      await yt.fetchChannelInfo();

      expect(yt.error.value).toBe("Channel ID is required");
      expect(getChannelInfo).not.toHaveBeenCalled();
    });

    it("stores the first channel item on success", async () => {
      const yt = useYoutube();
      const first = { id: "chan", title: "My Channel" };
      getChannelInfo.mockResolvedValue({ items: [first, { id: "other" }] });

      await yt.fetchChannelInfo("chan");

      expect(getChannelInfo).toHaveBeenCalledWith("chan");
      expect(yt.channelInfo.value).toEqual(first);
      expect(yt.loading.value).toBe(false);
      expect(yt.error.value).toBeNull();
    });

    it("stores null when the response has no items array", async () => {
      const yt = useYoutube();
      // response.items undefined -> optional chaining short-circuits -> `|| null`
      getChannelInfo.mockResolvedValue({});

      await yt.fetchChannelInfo("chan");

      expect(yt.channelInfo.value).toBeNull();
    });

    it("stores null when the items array is empty", async () => {
      const yt = useYoutube();
      // items[0] undefined -> `|| null`
      getChannelInfo.mockResolvedValue({ items: [] });

      await yt.fetchChannelInfo("chan");

      expect(yt.channelInfo.value).toBeNull();
    });

    it("captures err.message on failure", async () => {
      const yt = useYoutube();
      const err = new Error("channel boom");
      getChannelInfo.mockRejectedValue(err);

      await yt.fetchChannelInfo("chan");

      expect(yt.error.value).toBe("channel boom");
      expect(yt.loading.value).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in useYoutube.fetchChannelInfo:",
        err
      );
    });

    it("uses a fallback message when the error has no message", async () => {
      const yt = useYoutube();
      getChannelInfo.mockRejectedValue({});

      await yt.fetchChannelInfo("chan");

      expect(yt.error.value).toBe("Failed to fetch channel information");
    });
  });
});

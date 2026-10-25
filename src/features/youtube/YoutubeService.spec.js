import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ------------------------------------------------------------------ */
/* Boundary mocks                                                      */
/* ------------------------------------------------------------------ */

// Direct axios client used by the YouTube API calls.
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Central HTTP client wrapped by BaseService.
vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// config/app reads env at import time; we control YOUTUBE_API_KEY here so the
// `!YOUTUBE_API_KEY` guard can be exercised on both sides via vi.doMock +
// dynamic import.
vi.mock("@/config/app", () => ({
  YOUTUBE_API_KEY: "test-key",
}));

import axios from "axios";
import api from "@/services/api";

const BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Imports the service fresh with a specific YOUTUBE_API_KEY value, so both the
 * configured and "not configured" branches of every function are reachable.
 */
async function importWithKey(key) {
  vi.resetModules();
  vi.doMock("axios", () => ({ default: { get: axios.get } }));
  vi.doMock("@/services/api", () => ({ default: api }));
  vi.doMock("@/config/app", () => ({ YOUTUBE_API_KEY: key }));
  return import("@/features/youtube/YoutubeService");
}

describe("YoutubeService", () => {
  let mod;
  // BaseService from the same reset module graph as `mod`, so `instanceof`
  // checks hold (a top-level import would be a different module realm).
  let SameRealmBaseService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default module instance: API key configured.
    mod = await importWithKey("test-key");
    ({ BaseService: SameRealmBaseService } = await import(
      "@/shared/services/BaseService"
    ));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /* getChannelVideos                                                  */
  /* ---------------------------------------------------------------- */
  describe("getChannelVideos", () => {
    it("throws when channelId is missing", async () => {
      await expect(mod.getChannelVideos()).rejects.toThrow(
        "Channel ID is required"
      );
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("throws when the API key is not configured", async () => {
      const noKey = await importWithKey("");
      await expect(noKey.getChannelVideos("chan")).rejects.toThrow(
        "YouTube API key is not configured"
      );
    });

    it("fetches videos applying defaults and omits empty pageToken", async () => {
      const data = {
        items: [{ id: "v1" }],
        nextPageToken: "next",
        prevPageToken: "prev",
        pageInfo: { totalResults: 1 },
      };
      axios.get.mockResolvedValue({ data });

      const result = await mod.getChannelVideos("chan");

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/search`, {
        params: {
          part: "snippet",
          channelId: "chan",
          maxResults: 10,
          order: "date",
          type: "video",
          pageToken: undefined,
          key: "test-key",
        },
      });
      expect(result).toEqual({
        items: data.items,
        nextPageToken: "next",
        prevPageToken: "prev",
        pageInfo: { totalResults: 1 },
      });
    });

    it("forwards provided options and caps maxResults at 50", async () => {
      axios.get.mockResolvedValue({ data: { items: [] } });

      await mod.getChannelVideos("chan", {
        pageToken: "tok",
        maxResults: 200,
        order: "viewCount",
      });

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/search`, {
        params: {
          part: "snippet",
          channelId: "chan",
          maxResults: 50,
          order: "viewCount",
          type: "video",
          pageToken: "tok",
          key: "test-key",
        },
      });
    });

    it("logs and rethrows when the request fails", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("boom");
      axios.get.mockRejectedValue(err);

      await expect(mod.getChannelVideos("chan")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Error fetching YouTube videos:",
        err
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /* getVideoDetails                                                   */
  /* ---------------------------------------------------------------- */
  describe("getVideoDetails", () => {
    it("throws when videoIds is falsy", async () => {
      await expect(mod.getVideoDetails()).rejects.toThrow(
        "Video ID(s) are required"
      );
    });

    it("throws when an empty array is passed", async () => {
      await expect(mod.getVideoDetails([])).rejects.toThrow(
        "Video ID(s) are required"
      );
    });

    it("throws when the API key is not configured", async () => {
      const noKey = await importWithKey("");
      await expect(noKey.getVideoDetails("v1")).rejects.toThrow(
        "YouTube API key is not configured"
      );
    });

    it("joins an array of ids and returns the raw data", async () => {
      const data = { items: [{ id: "a" }, { id: "b" }] };
      axios.get.mockResolvedValue({ data });

      const result = await mod.getVideoDetails(["a", "b"]);

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/videos`, {
        params: {
          part: "snippet,contentDetails,statistics",
          id: "a,b",
          key: "test-key",
        },
      });
      expect(result).toBe(data);
    });

    it("accepts a single string id", async () => {
      const data = { items: [] };
      axios.get.mockResolvedValue({ data });

      const result = await mod.getVideoDetails("single");

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/videos`, {
        params: {
          part: "snippet,contentDetails,statistics",
          id: "single",
          key: "test-key",
        },
      });
      expect(result).toBe(data);
    });

    it("logs and rethrows on failure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("fail");
      axios.get.mockRejectedValue(err);

      await expect(mod.getVideoDetails("v")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Error fetching YouTube video details:",
        err
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /* getChannelInfo                                                    */
  /* ---------------------------------------------------------------- */
  describe("getChannelInfo", () => {
    it("throws when channelId is missing", async () => {
      await expect(mod.getChannelInfo()).rejects.toThrow(
        "Channel ID is required"
      );
    });

    it("throws when the API key is not configured", async () => {
      const noKey = await importWithKey("");
      await expect(noKey.getChannelInfo("chan")).rejects.toThrow(
        "YouTube API key is not configured"
      );
    });

    it("returns the raw channel data on success", async () => {
      const data = { items: [{ id: "chan" }] };
      axios.get.mockResolvedValue({ data });

      const result = await mod.getChannelInfo("chan");

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/channels`, {
        params: {
          part: "snippet,contentDetails,statistics",
          id: "chan",
          key: "test-key",
        },
      });
      expect(result).toBe(data);
    });

    it("logs and rethrows on failure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("nope");
      axios.get.mockRejectedValue(err);

      await expect(mod.getChannelInfo("chan")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Error fetching YouTube channel info:",
        err
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /* searchVideos                                                      */
  /* ---------------------------------------------------------------- */
  describe("searchVideos", () => {
    it("throws when query is missing", async () => {
      await expect(mod.searchVideos()).rejects.toThrow(
        "Search query is required"
      );
    });

    it("throws when the API key is not configured", async () => {
      const noKey = await importWithKey("");
      await expect(noKey.searchVideos("cats")).rejects.toThrow(
        "YouTube API key is not configured"
      );
    });

    it("searches applying defaults and omits empty pageToken", async () => {
      const data = {
        items: [{ id: "s1" }],
        nextPageToken: "n",
        prevPageToken: "p",
        pageInfo: { totalResults: 5 },
      };
      axios.get.mockResolvedValue({ data });

      const result = await mod.searchVideos("cats");

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/search`, {
        params: {
          part: "snippet",
          q: "cats",
          maxResults: 10,
          order: "relevance",
          type: "video",
          pageToken: undefined,
          channelId: "",
          key: "test-key",
        },
      });
      expect(result).toEqual({
        items: data.items,
        nextPageToken: "n",
        prevPageToken: "p",
        pageInfo: { totalResults: 5 },
      });
    });

    it("forwards provided options and caps maxResults at 50", async () => {
      axios.get.mockResolvedValue({ data: { items: [] } });

      await mod.searchVideos("dogs", {
        pageToken: "tk",
        maxResults: 99,
        order: "date",
        channelId: "chan",
      });

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/search`, {
        params: {
          part: "snippet",
          q: "dogs",
          maxResults: 50,
          order: "date",
          type: "video",
          pageToken: "tk",
          channelId: "chan",
          key: "test-key",
        },
      });
    });

    it("logs and rethrows on failure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("searcherr");
      axios.get.mockRejectedValue(err);

      await expect(mod.searchVideos("x")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Error searching YouTube videos:",
        err
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /* YoutubeService class + singleton + default export                */
  /* ---------------------------------------------------------------- */
  describe("YoutubeService class and singleton", () => {
    it("extends BaseService and uses the 'youtube' resource", () => {
      const svc = new mod.YoutubeService();
      expect(svc).toBeInstanceOf(SameRealmBaseService);
      expect(svc.resource).toBe("youtube");
      expect(svc.api).toBe(api);
    });

    it("exposes the domain functions as instance methods", async () => {
      const data = { items: [{ id: "vv" }] };
      axios.get.mockResolvedValue({ data });

      const result = await mod.youtubeService.getChannelInfo("chan");

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/channels`, {
        params: {
          part: "snippet,contentDetails,statistics",
          id: "chan",
          key: "test-key",
        },
      });
      expect(result).toBe(data);
    });

    it("inherits BaseService REST verbs via the 'youtube' resource", () => {
      const res = { data: 1 };
      api.get.mockReturnValue(res);
      expect(mod.youtubeService.list({ page: 1 })).toBe(res);
      expect(api.get).toHaveBeenCalledWith("/youtube", {
        params: { page: 1 },
      });
    });

    it("default export is the singleton instance", () => {
      expect(mod.default).toBe(mod.youtubeService);
      expect(mod.default).toBeInstanceOf(mod.YoutubeService);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/api", () => ({ default: { get: vi.fn() } }));

import api from "@/services/api";
import {
  getMediaById,
  getMediaBlob,
  getMediaObjectUrl,
  getMediaDataUrl,
  mediaService,
} from "@/features/media/MediaService";

describe("MediaService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getMediaById() without storyType sends empty params", () => {
    api.get.mockResolvedValue({ data: {} });
    getMediaById(7);
    expect(api.get).toHaveBeenCalledWith("/media/7", { params: {} });
  });

  it("getMediaById() with storyType forwards it as a query param", () => {
    api.get.mockResolvedValue({ data: {} });
    getMediaById(7, "top");
    expect(api.get).toHaveBeenCalledWith("/media/7", { params: { storyType: "top" } });
  });

  it("getMediaBlob() requests a blob and returns the response body", async () => {
    const blob = new Blob(["x"]);
    api.get.mockResolvedValue({ data: blob });
    const result = await getMediaBlob(3);
    expect(api.get).toHaveBeenCalledWith(
      "/media/3",
      expect.objectContaining({ responseType: "blob", withCredentials: false })
    );
    expect(result).toBe(blob);
  });

  it("getMediaObjectUrl() wraps the blob in an object URL", async () => {
    api.get.mockResolvedValue({ data: new Blob(["x"]) });
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:abc");
    try {
      expect(await getMediaObjectUrl(1)).toBe("blob:abc");
    } finally {
      URL.createObjectURL = original;
    }
  });

  it("getMediaDataUrl() resolves a base64 data URL", async () => {
    api.get.mockResolvedValue({ data: new Blob(["hello"], { type: "text/plain" }) });
    const url = await getMediaDataUrl(1);
    expect(url.startsWith("data:")).toBe(true);
  });

  describe("getMediaDataUrl() error path", () => {
    let OriginalFileReader;
    beforeEach(() => {
      OriginalFileReader = globalThis.FileReader;
      globalThis.FileReader = class {
        readAsDataURL() {
          this.onerror(new Error("read failed"));
        }
      };
    });
    afterEach(() => {
      globalThis.FileReader = OriginalFileReader;
    });

    it("rejects when the FileReader errors", async () => {
      api.get.mockResolvedValue({ data: new Blob(["x"]) });
      await expect(getMediaDataUrl(1)).rejects.toBeInstanceOf(Error);
    });
  });

  it("mediaService singleton delegates to the same methods", () => {
    api.get.mockResolvedValue({ data: {} });
    mediaService.getMediaById(9);
    expect(api.get).toHaveBeenCalledWith("/media/9", { params: {} });
  });
});

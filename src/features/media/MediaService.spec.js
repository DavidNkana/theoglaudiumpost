import { describe, it, expect, vi, beforeEach } from "vitest";
import { callsTo } from "../../../tests/helpers/supabaseMock.js";

const state = vi.hoisted(() => ({
  tables: {},
  builders: {},
  session: null,
  user: null,
}));

vi.mock("@/services/supabase.js", async () => {
  const { buildSupabaseModule } = await import(
    "../../../tests/helpers/supabaseModuleMock.js"
  );
  return buildSupabaseModule(state);
});

import {
  getMediaById,
  getMediaBlob,
  getMediaObjectUrl,
  getMediaDataUrl,
  uploadMedia,
  uploadDataUrl,
  removeMedia,
} from "@/features/media/MediaService.js";

describe("features/media/MediaService", () => {
  beforeEach(reset);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a media record and resolves its public URL", async () => {
    state.tables.media = {
      data: { id: "m1", file: "latest/cover.jpg", storage_path: "latest/cover.jpg" },
      error: null,
    };

    const response = await getMediaById("m1");

    expect(response.status).toBe(200);
    expect(response.data.file).toBe("https://cdn.test/latest/cover.jpg");
  });

  it("falls back to the media row when no story variant exists", async () => {
    state.tables.media = {
      data: { id: "m1", file: "latest/cover.jpg", storage_path: "latest/cover.jpg" },
      error: null,
    };

    const response = await getMediaById("m1", "top");

    expect(response.data.id).toBe("m1");
  });

  it("reports a missing media record", async () => {
    state.tables.media = { data: null, error: null };

    await expect(getMediaById("m1")).rejects.toThrow("Media not found");
  });

  it("loads an image as a blob from a URL", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, blob: async () => blob })),
    );

    const result = await getMediaBlob("https://cdn.test/a.png");

    expect(result).toBeInstanceOf(Blob);
  });

  it("reports a failed image load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );

    await expect(getMediaBlob("https://cdn.test/a.png")).rejects.toThrow(
      "Failed to load media",
    );
  });

  it("wraps an image in an object URL", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, blob: async () => blob })),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:url"),
    });

    const result = await getMediaObjectUrl("https://cdn.test/a.png");

    expect(result).toBe("blob:url");
  });

  it("reads an image as a data URL", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, blob: async () => blob })),
    );

    const result = await getMediaDataUrl("https://cdn.test/a.png");

    expect(result).toBeTruthy();
  });

  it("uploads an image and records it", async () => {
    state.tables.media = { data: { id: "m1" }, error: null };

    const file = new File(["x"], "cover.png", { type: "image/png" });
    const response = await uploadMedia(file, "latest");

    expect(response.status).toBe(201);
    expect(callsTo(state.builders.media, "insert")[0].args[0]).toMatchObject({
      storage_path: expect.stringContaining("latest/"),
      story_type: "latest",
    });
  });

  it("refuses to upload without a file", async () => {
    await expect(uploadMedia(null, "latest")).rejects.toThrow(
      "No file provided",
    );
  });

  it("uploads an image supplied as a data URL", async () => {
    state.tables.media = { data: { id: "m1" }, error: null };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, blob: async () => new Blob(["x"]) })),
    );

    const media = await uploadDataUrl("data:image/png;base64,AAA", "ad");

    expect(media.id).toBe("m1");
    expect(media.file).toMatch(/^https:\/\/cdn\.test\/ad\//);
  });

  it("refuses to upload an empty data URL", async () => {
    await expect(uploadDataUrl("", "ad")).rejects.toThrow("No image provided");
  });

  it("removes a media record and its file", async () => {
    state.tables.media = {
      data: { id: "m1", storage_path: "latest/cover.jpg" },
      error: null,
    };

    const response = await removeMedia("m1");

    expect(response.status).toBe(200);
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

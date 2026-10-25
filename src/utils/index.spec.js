import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as utils from "@/utils/index";
import {
  HOME_BANNER,
  FIXED_BOTTOM,
  IN_ARTICLE_TOP,
  IN_ARTICLE_MID,
  IN_ARTICLE_BOTTOM,
  SIDEBAR_TOP,
  SIDEBAR_BOTTOM,
  SIDEBAR_MID,
  getAdDimensions,
  stripCodeBlockMarkers,
  parseArticleResponse,
  formatTimeAgo,
  formatDate,
  formatDateToLongString,
  setDefaultImage,
  getStatusBadgeClass,
  getAdLocationBadgeClass,
  formatAdLocation,
  delay,
  processImageForAd,
  isMobileDevice,
} from "@/utils/index";

describe("utils/index — placement constants", () => {
  it("exports the expected ad placement location string constants", () => {
    expect(HOME_BANNER).toBe("home_banner");
    expect(FIXED_BOTTOM).toBe("fixed_bottom");
    expect(IN_ARTICLE_TOP).toBe("in_article_top");
    expect(IN_ARTICLE_MID).toBe("in_article_mid");
    expect(IN_ARTICLE_BOTTOM).toBe("in_article_bottom");
    expect(SIDEBAR_TOP).toBe("sidebar_top");
    expect(SIDEBAR_BOTTOM).toBe("sidebar_bottom");
    expect(SIDEBAR_MID).toBe("sidebar_mid");
  });
});

describe("getAdDimensions", () => {
  it("returns 6:1 for FIXED_BOTTOM", () => {
    expect(getAdDimensions(FIXED_BOTTOM)).toBe("6:1");
  });

  it("returns 6:1 for HOME_BANNER", () => {
    expect(getAdDimensions(HOME_BANNER)).toBe("6:1");
  });

  it("returns 16:9 for the in-article placements (fall-through cases)", () => {
    expect(getAdDimensions(IN_ARTICLE_TOP)).toBe("16:9");
    expect(getAdDimensions(IN_ARTICLE_MID)).toBe("16:9");
    expect(getAdDimensions(IN_ARTICLE_BOTTOM)).toBe("16:9");
  });

  it("returns 1:1 for the sidebar placements (fall-through cases)", () => {
    expect(getAdDimensions(SIDEBAR_TOP)).toBe("1:1");
    expect(getAdDimensions(SIDEBAR_MID)).toBe("1:1");
    expect(getAdDimensions(SIDEBAR_BOTTOM)).toBe("1:1");
  });

  it("returns 4:3 fallback for an unknown placement (default case)", () => {
    expect(getAdDimensions("something_else")).toBe("4:3");
    expect(getAdDimensions(undefined)).toBe("4:3");
  });
});

describe("stripCodeBlockMarkers", () => {
  it("removes a leading ```html marker (case-insensitive) and trailing ```", () => {
    // The opening "```html\s*" matches the trailing whitespace (the newline)
    // too, so it is consumed along with the marker.
    const input = "```html\n<p>Hello</p>\n```";
    expect(stripCodeBlockMarkers(input)).toBe("<p>Hello</p>\n");
  });

  it("removes a leading ```HTML marker regardless of case", () => {
    const input = "```HTML <p>x</p>```";
    expect(stripCodeBlockMarkers(input)).toBe("<p>x</p>");
  });

  it("removes a bare leading ``` when there is no 'html' keyword", () => {
    const input = "```<div></div>```";
    expect(stripCodeBlockMarkers(input)).toBe("<div></div>");
  });

  it("leaves text without code block markers unchanged", () => {
    const input = "<p>plain</p>";
    expect(stripCodeBlockMarkers(input)).toBe("<p>plain</p>");
  });
});

describe("parseArticleResponse", () => {
  it("splits html and summary when the Summary: marker is present", () => {
    const input = "<p>Body content</p>\n\nSummary:\nThis is the summary.";
    const result = parseArticleResponse(input);
    expect(result.html).toBe("<p>Body content</p>");
    expect(result.summary).toBe("This is the summary.");
  });

  it("falls back to trimmed text with empty summary when marker is absent", () => {
    const input = "   <p>Only body</p>   ";
    const result = parseArticleResponse(input);
    expect(result.html).toBe("<p>Only body</p>");
    expect(result.summary).toBe("");
  });
});

describe("formatTimeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fixed "now" so relative math is deterministic.
    vi.setSystemTime(new Date("2026-06-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Unknown time' when no date is provided (falsy guard)", () => {
    expect(formatTimeAgo(null)).toBe("Unknown time");
    expect(formatTimeAgo(undefined)).toBe("Unknown time");
    expect(formatTimeAgo("")).toBe("Unknown time");
  });

  it("returns 'a few seconds ago' for differences under a minute", () => {
    const date = new Date("2026-06-18T11:59:30.000Z"); // 30s ago
    expect(formatTimeAgo(date)).toBe("a few seconds ago");
  });

  it("returns minutes with pluralization for the minutes branch", () => {
    const date = new Date("2026-06-18T11:58:00.000Z"); // 2 minutes ago
    expect(formatTimeAgo(date)).toBe("2 minutes ago");
  });

  it("uses singular form when value === 1 (label ternary false branch)", () => {
    const date = new Date("2026-06-18T11:59:00.000Z"); // 1 minute ago
    expect(formatTimeAgo(date)).toBe("1 minute ago");
  });

  it("returns hours for the hours branch", () => {
    const date = new Date("2026-06-18T09:00:00.000Z"); // 3 hours ago
    expect(formatTimeAgo(date)).toBe("3 hours ago");
  });

  it("returns days for the days branch", () => {
    const date = new Date("2026-06-15T12:00:00.000Z"); // 3 days ago
    expect(formatTimeAgo(date)).toBe("3 days ago");
  });

  it("returns weeks for the weeks branch", () => {
    const date = new Date("2026-05-28T12:00:00.000Z"); // 21 days ago -> 3 weeks
    expect(formatTimeAgo(date)).toBe("3 weeks ago");
  });

  it("returns months for the months branch", () => {
    const date = new Date("2026-02-18T12:00:00.000Z"); // 120 days ago -> 4 months
    expect(formatTimeAgo(date)).toBe("4 months ago");
  });

  it("returns years for the years branch (else clause)", () => {
    const date = new Date("2024-06-18T12:00:00.000Z"); // ~2 years ago
    expect(formatTimeAgo(date)).toBe("2 years ago");
  });

  it("prefixes 'Due in' for future dates (isFuture true branch)", () => {
    const date = new Date("2026-06-18T14:00:00.000Z"); // 2 hours in the future
    expect(formatTimeAgo(date)).toBe("Due in 2 hours");
  });
});

describe("formatDate", () => {
  it("formats a date with weekday, full date and time using en-ZA locale", () => {
    const result = formatDate("2025-01-15T10:30:00.000Z");
    // Locale formatting varies by environment; assert it is a non-empty string
    // and that the underlying call produced the expected value.
    const expected = new Date("2025-01-15T10:30:00.000Z").toLocaleDateString(
      "en-ZA",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
    expect(result).toBe(expected);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatDateToLongString", () => {
  it("formats a date as a long string without time", () => {
    const result = formatDateToLongString("2025-01-15T10:30:00.000Z");
    const expected = new Date("2025-01-15T10:30:00.000Z").toLocaleDateString(
      "en-ZA",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
    expect(result).toBe(expected);
    expect(typeof result).toBe("string");
  });
});

describe("setDefaultImage", () => {
  it("sets the placeholder src on the event target image", () => {
    const event = { target: { src: "broken.png" } };
    setDefaultImage(event);
    expect(event.target.src).toBe(
      "https://placehold.co/800x450?text=Laudium+POST+News"
    );
  });
});

describe("getStatusBadgeClass", () => {
  it("returns success badge for published/active/1", () => {
    expect(getStatusBadgeClass("published")).toBe("badge bg-success");
    expect(getStatusBadgeClass("active")).toBe("badge bg-success");
    expect(getStatusBadgeClass(1)).toBe("badge bg-success");
  });

  it("returns info badge for draft/pending/0", () => {
    expect(getStatusBadgeClass("draft")).toBe("badge bg-info");
    expect(getStatusBadgeClass("pending")).toBe("badge bg-info");
    expect(getStatusBadgeClass(0)).toBe("badge bg-info");
  });

  it("returns danger badge for archived/failed", () => {
    expect(getStatusBadgeClass("archived")).toBe("badge bg-danger");
    expect(getStatusBadgeClass("failed")).toBe("badge bg-danger");
  });

  it("returns warning badge for scheduled", () => {
    expect(getStatusBadgeClass("scheduled")).toBe("badge bg-warning");
  });

  it("returns secondary badge for any other status (default case)", () => {
    expect(getStatusBadgeClass("unknown")).toBe("badge bg-secondary");
    expect(getStatusBadgeClass(99)).toBe("badge bg-secondary");
  });
});

describe("getAdLocationBadgeClass", () => {
  it("maps known locations to their badge classes", () => {
    expect(getAdLocationBadgeClass("home_banner")).toBe("badge bg-primary");
    expect(getAdLocationBadgeClass("in_article_top")).toBe("badge bg-success");
    expect(getAdLocationBadgeClass("in_article_mid")).toBe("badge bg-info");
    expect(getAdLocationBadgeClass("in_article_bottom")).toBe(
      "badge bg-warning"
    );
    expect(getAdLocationBadgeClass("sidebar")).toBe("badge bg-secondary");
  });

  it("returns dark badge for unknown locations (|| fallback)", () => {
    expect(getAdLocationBadgeClass("nope")).toBe("badge bg-dark");
    expect(getAdLocationBadgeClass(undefined)).toBe("badge bg-dark");
  });
});

describe("formatAdLocation", () => {
  it("returns empty string for falsy input (guard)", () => {
    expect(formatAdLocation("")).toBe("");
    expect(formatAdLocation(null)).toBe("");
    expect(formatAdLocation(undefined)).toBe("");
  });

  it("converts a snake_case location into a Title Case label", () => {
    expect(formatAdLocation("home_banner")).toBe("Home Banner");
    expect(formatAdLocation("in_article_bottom")).toBe("In Article Bottom");
  });

  it("handles a single-word location", () => {
    expect(formatAdLocation("sidebar")).toBe("Sidebar");
  });
});

describe("delay", () => {
  it("resolves after the specified number of milliseconds", async () => {
    vi.useFakeTimers();
    try {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      let resolved = false;
      const p = delay(500).then(() => {
        resolved = true;
      });
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
      expect(resolved).toBe(false);
      await vi.advanceTimersByTimeAsync(500);
      await p;
      expect(resolved).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * Helper that installs a controllable fake Image constructor so processImageForAd
 * can be driven synchronously. The returned `instances` array captures created
 * images so the test can trigger onload / onerror.
 */
function installFakeImage() {
  const instances = [];
  class FakeImage {
    constructor() {
      this.width = 800;
      this.height = 400;
      this.onload = null;
      this.onerror = null;
      this._src = "";
      instances.push(this);
    }
    set src(value) {
      this._src = value;
    }
    get src() {
      return this._src;
    }
  }
  vi.stubGlobal("Image", FakeImage);
  return instances;
}

/**
 * Installs a fake canvas via document.createElement so drawing operations and
 * output (toBlob / toDataURL) are observable and controllable.
 */
function installFakeCanvas({ blob = new Blob(["x"]), dataUrl = "data:img" } = {}) {
  const ctx = {
    fillStyle: "",
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb) => cb(blob)),
    toDataURL: vi.fn(() => dataUrl),
  };
  const original = document.createElement.bind(document);
  const spy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "canvas") return canvas;
    return original(tag);
  });
  return { canvas, ctx, spy };
}

describe("processImageForAd", () => {
  let imageInstances;
  let canvasParts;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("processes a data: URL string with default cover fit and base64 output (wide image crops width)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas({ dataUrl: "data:cover-base64" });

    const promise = processImageForAd("data:image/png;base64,AAA", "16:9");
    // The image src was set directly (data: branch); fire onload.
    const img = imageInstances[0];
    expect(img.src).toBe("data:image/png;base64,AAA");
    img.width = 1600; // wider than 16:9 target -> crop width branch
    img.height = 400;
    img.onload();

    const result = await promise;
    expect(result).toBe("data:cover-base64");
    expect(canvasParts.canvas.toDataURL).toHaveBeenCalledWith(
      "image/jpeg",
      0.8
    );
    // crop-width branch computes an offsetX and draws.
    expect(canvasParts.ctx.drawImage).toHaveBeenCalled();
  });

  it("processes a remote URL string (sets crossOrigin) with cover fit where image is taller (crop height branch)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas({ dataUrl: "data:tall" });

    const promise = processImageForAd("https://cdn/x.png", "1:1");
    const img = imageInstances[0];
    expect(img.crossOrigin).toBe("anonymous");
    expect(img.src).toBe("https://cdn/x.png");
    img.width = 200; // taller than 1:1 -> crop height branch
    img.height = 800;
    img.onload();

    const result = await promise;
    expect(result).toBe("data:tall");
    expect(canvasParts.ctx.drawImage).toHaveBeenCalled();
  });

  it("applies targetWidth in cover mode and returns a blob output", async () => {
    imageInstances = installFakeImage();
    const blob = new Blob(["binary"]);
    canvasParts = installFakeCanvas({ blob });

    const promise = processImageForAd("https://cdn/y.png", "4:3", {
      targetWidth: 320,
      outputType: "blob",
      quality: 0.5,
      format: "png",
    });
    const img = imageInstances[0];
    img.width = 1600;
    img.height = 400;
    img.onload();

    const result = await promise;
    expect(result).toBe(blob);
    expect(canvasParts.canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/png",
      0.5
    );
    // targetWidth applied -> canvas width is the rounded targetWidth.
    expect(canvasParts.canvas.width).toBe(320);
  });

  it("contain fit + jpeg fills background and uses targetWidth (targetWidth branch)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas({ dataUrl: "data:contain-jpeg" });

    const promise = processImageForAd("data:foo", "16:9", {
      fit: "contain",
      targetWidth: 400,
      backgroundColor: "#abcdef",
    });
    const img = imageInstances[0];
    img.width = 800;
    img.height = 600;
    img.onload();

    const result = await promise;
    expect(result).toBe("data:contain-jpeg");
    // jpeg path fills the background instead of clearing.
    expect(canvasParts.ctx.fillRect).toHaveBeenCalled();
    expect(canvasParts.ctx.clearRect).not.toHaveBeenCalled();
    expect(canvasParts.ctx.fillStyle).toBe("#abcdef");
    expect(canvasParts.canvas.width).toBe(400);
  });

  it("contain fit + png clears the canvas and uses wider-than-target branch (no targetWidth)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas({ dataUrl: "data:contain-png" });

    const promise = processImageForAd("data:foo", "1:1", {
      fit: "contain",
      format: "png",
    });
    const img = imageInstances[0];
    img.width = 1600; // imgAspectRatio (4) > target (1) -> wider branch
    img.height = 400;
    img.onload();

    const result = await promise;
    expect(result).toBe("data:contain-png");
    // png path clears transparency instead of filling.
    expect(canvasParts.ctx.clearRect).toHaveBeenCalled();
    expect(canvasParts.ctx.fillRect).not.toHaveBeenCalled();
  });

  it("contain fit taller-than-target branch (no targetWidth, image taller)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas({ dataUrl: "data:contain-tall" });

    const promise = processImageForAd("data:foo", "1:1", {
      fit: "contain",
    });
    const img = imageInstances[0];
    img.width = 200; // imgAspectRatio (0.25) <= target (1) -> taller branch
    img.height = 800;
    img.onload();

    const result = await promise;
    expect(result).toBe("data:contain-tall");
    // jpeg default -> fillRect was used.
    expect(canvasParts.ctx.fillRect).toHaveBeenCalled();
  });

  it("reads a File input via FileReader and processes it", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas({ dataUrl: "data:from-file" });

    // Fake FileReader that triggers onload with a data result.
    const readerInstances = [];
    class FakeFileReader {
      constructor() {
        this.onload = null;
        this.onerror = null;
        readerInstances.push(this);
      }
      readAsDataURL() {
        this._read = true;
      }
    }
    vi.stubGlobal("FileReader", FakeFileReader);

    const file = new Blob(["file-bytes"]); // non-string input -> File branch
    const promise = processImageForAd(file, "16:9");

    // FileReader.onload sets img.src; trigger it.
    const reader = readerInstances[0];
    reader.onload({ target: { result: "data:file-content" } });
    const img = imageInstances[0];
    expect(img.src).toBe("data:file-content");
    img.width = 1600;
    img.height = 400;
    img.onload();

    const result = await promise;
    expect(result).toBe("data:from-file");
  });

  it("rejects when the FileReader fails to read the file (reader.onerror branch)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas();

    const readerInstances = [];
    class FakeFileReader {
      constructor() {
        this.onload = null;
        this.onerror = null;
        readerInstances.push(this);
      }
      readAsDataURL() {}
    }
    vi.stubGlobal("FileReader", FakeFileReader);

    const file = new Blob(["bytes"]);
    const promise = processImageForAd(file, "16:9");
    const reader = readerInstances[0];
    reader.onerror();

    await expect(promise).rejects.toThrow("Failed to read file");
  });

  it("rejects when the image fails to load (img.onerror branch)", async () => {
    imageInstances = installFakeImage();
    canvasParts = installFakeCanvas();

    const promise = processImageForAd("https://cdn/broken.png", "16:9");
    const img = imageInstances[0];
    img.onerror();

    await expect(promise).rejects.toThrow("Failed to load image");
  });

  it("rejects when image construction throws synchronously (outer catch)", async () => {
    // Make the Image constructor throw so the try/catch in the executor fires.
    class ThrowingImage {
      constructor() {
        throw new Error("boom");
      }
    }
    vi.stubGlobal("Image", ThrowingImage);

    await expect(
      processImageForAd("data:foo", "16:9")
    ).rejects.toThrow("boom");
  });
});

describe("isMobileDevice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns false when window is undefined (SSR guard)", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      expect(isMobileDevice()).toBe(false);
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("returns true when matchMedia reports a narrow viewport (matchMedia true branch)", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true });
    expect(isMobileDevice()).toBe(true);
  });

  it("falls back to user-agent detection when matchMedia is false but UA is mobile", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
    );
    expect(isMobileDevice()).toBe(true);
  });

  it("returns false when matchMedia is false and UA is a desktop browser", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    );
    expect(isMobileDevice()).toBe(false);
  });
});

describe("module exports surface", () => {
  it("exposes all the documented helpers", () => {
    const fns = [
      "getAdDimensions",
      "stripCodeBlockMarkers",
      "parseArticleResponse",
      "formatTimeAgo",
      "formatDate",
      "formatDateToLongString",
      "setDefaultImage",
      "getStatusBadgeClass",
      "getAdLocationBadgeClass",
      "formatAdLocation",
      "delay",
      "processImageForAd",
      "isMobileDevice",
    ];
    fns.forEach((name) => expect(typeof utils[name]).toBe("function"));
  });
});

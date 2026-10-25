import { describe, it, expect, vi } from "vitest";

// Mock the API service so the plugin imports a stable, identifiable value.
vi.mock("@/services/api", () => ({
  default: { __isApi: true },
}));

import axiosPlugin from "./axios.js";
import api from "@/services/api";

describe("plugins/axios", () => {
  it("exports a Vue plugin object with an install function", () => {
    expect(axiosPlugin).toBeTypeOf("object");
    expect(axiosPlugin.install).toBeTypeOf("function");
  });

  it("install() registers the api client as the $api global property", () => {
    const app = { config: { globalProperties: {} }, use: vi.fn() };

    axiosPlugin.install(app);

    expect(app.config.globalProperties.$api).toBe(api);
    expect(app.config.globalProperties.$api).toEqual({ __isApi: true });
  });
});

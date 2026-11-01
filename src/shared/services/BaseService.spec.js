import { describe, it, expect } from "vitest";
import { BaseService } from "@/shared/services/BaseService.js";

describe("shared/services/BaseService", () => {
  it("keeps the resource name", () => {
    const service = new BaseService("articles");

    expect(service.resource).toBe("articles");
  });

  it("rejects the generic verbs until a domain service implements them", async () => {
    const service = new BaseService("articles");

    await expect(service.get()).rejects.toThrow("get() is not implemented");
    await expect(service.getById("1")).rejects.toThrow(
      "getById() is not implemented",
    );
    await expect(service.create({})).rejects.toThrow(
      "create() is not implemented",
    );
    await expect(service.update("1", {})).rejects.toThrow(
      "update() is not implemented",
    );
    await expect(service.remove("1")).rejects.toThrow(
      "remove() is not implemented",
    );
  });
});

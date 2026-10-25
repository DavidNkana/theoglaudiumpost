import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "@/services/api";
import {
  getTags,
  getTag,
  getTagBySlug,
  createTag,
  editTag,
  removeTag,
  TagsService,
  tagsService,
} from "@/features/tags/TagsService";
import defaultExport from "@/features/tags/TagsService";

describe("TagsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getTags() fetches the tags collection", () => {
    const resp = { data: [{ id: 1 }] };
    api.get.mockReturnValue(resp);
    expect(getTags()).toBe(resp);
    expect(api.get).toHaveBeenCalledWith("/tags");
  });

  it("getTag() fetches a single tag by id", () => {
    const resp = { data: { id: 5 } };
    api.get.mockReturnValue(resp);
    expect(getTag(5)).toBe(resp);
    expect(api.get).toHaveBeenCalledWith("/tags/5");
  });

  it("getTagBySlug() fetches a tag by slug", () => {
    const resp = { data: { slug: "news" } };
    api.get.mockReturnValue(resp);
    expect(getTagBySlug("news")).toBe(resp);
    expect(api.get).toHaveBeenCalledWith("/tags/slug/news");
  });

  it("createTag() posts the new tag data", () => {
    const payload = { name: "New" };
    const resp = { data: { id: 9 } };
    api.post.mockReturnValue(resp);
    expect(createTag(payload)).toBe(resp);
    expect(api.post).toHaveBeenCalledWith("/tags/create", payload);
  });

  it("editTag() puts the updated tag data", () => {
    const payload = { name: "Edited" };
    const resp = { data: { id: 3 } };
    api.put.mockReturnValue(resp);
    expect(editTag(3, payload)).toBe(resp);
    expect(api.put).toHaveBeenCalledWith("/tags/3", payload);
  });

  it("removeTag() deletes the tag by id", () => {
    const resp = { data: {} };
    api.delete.mockReturnValue(resp);
    expect(removeTag(4)).toBe(resp);
    expect(api.delete).toHaveBeenCalledWith("/tags/4");
  });

  it("TagsService constructs with the 'tags' resource and shared client", () => {
    const svc = new TagsService();
    expect(svc).toBeInstanceOf(TagsService);
    expect(svc.resource).toBe("tags");
    expect(svc.api).toBe(api);
  });

  it("exposes the domain functions as instance methods", () => {
    expect(tagsService.getTags).toBe(getTags);
    expect(tagsService.getTag).toBe(getTag);
    expect(tagsService.getTagBySlug).toBe(getTagBySlug);
    expect(tagsService.createTag).toBe(createTag);
    expect(tagsService.editTag).toBe(editTag);
    expect(tagsService.removeTag).toBe(removeTag);
  });

  it("singleton delegates getTags to the api client", () => {
    api.get.mockReturnValue({ data: [] });
    tagsService.getTags();
    expect(api.get).toHaveBeenCalledWith("/tags");
  });

  it("default export is the singleton instance", () => {
    expect(defaultExport).toBe(tagsService);
    expect(defaultExport).toBeInstanceOf(TagsService);
  });

  it("singleton still has the inherited BaseService REST verbs", () => {
    api.get.mockReturnValue({ data: {} });
    tagsService.get(11);
    expect(api.get).toHaveBeenCalledWith("/tags/11");
  });
});

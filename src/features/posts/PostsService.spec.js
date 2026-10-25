import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "@/services/api";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  PostsService,
  postsService,
} from "@/features/posts/PostsService";
import defaultExport from "@/features/posts/PostsService";

describe("PostsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getPosts() fetches the posts collection", () => {
    const resp = { data: [{ id: 1 }] };
    api.get.mockReturnValue(resp);
    expect(getPosts()).toBe(resp);
    expect(api.get).toHaveBeenCalledWith("/posts");
  });

  it("getPost() fetches a single post by id", () => {
    const resp = { data: { id: 5 } };
    api.get.mockReturnValue(resp);
    expect(getPost(5)).toBe(resp);
    expect(api.get).toHaveBeenCalledWith("/posts/5");
  });

  it("createPost() posts the new post data", () => {
    const payload = { title: "New" };
    const resp = { data: { id: 9 } };
    api.post.mockReturnValue(resp);
    expect(createPost(payload)).toBe(resp);
    expect(api.post).toHaveBeenCalledWith("/posts", payload);
  });

  it("updatePost() puts the updated post data", () => {
    const payload = { title: "Edited" };
    const resp = { data: { id: 3 } };
    api.put.mockReturnValue(resp);
    expect(updatePost(3, payload)).toBe(resp);
    expect(api.put).toHaveBeenCalledWith("/posts/3", payload);
  });

  it("deletePost() deletes the post by id", () => {
    const resp = { data: {} };
    api.delete.mockReturnValue(resp);
    expect(deletePost(4)).toBe(resp);
    expect(api.delete).toHaveBeenCalledWith("/posts/4");
  });

  it("PostsService constructs with the 'posts' resource and shared client", () => {
    const svc = new PostsService();
    expect(svc).toBeInstanceOf(PostsService);
    expect(svc.resource).toBe("posts");
    expect(svc.api).toBe(api);
  });

  it("exposes the domain functions as instance methods", () => {
    expect(postsService.getPosts).toBe(getPosts);
    expect(postsService.getPost).toBe(getPost);
    expect(postsService.createPost).toBe(createPost);
    expect(postsService.updatePost).toBe(updatePost);
    expect(postsService.deletePost).toBe(deletePost);
  });

  it("singleton delegates getPosts to the api client", () => {
    api.get.mockReturnValue({ data: [] });
    postsService.getPosts();
    expect(api.get).toHaveBeenCalledWith("/posts");
  });

  it("default export is the singleton instance", () => {
    expect(defaultExport).toBe(postsService);
    expect(defaultExport).toBeInstanceOf(PostsService);
  });

  it("singleton still has the inherited BaseService REST verbs", () => {
    api.get.mockReturnValue({ data: {} });
    postsService.get(11);
    expect(api.get).toHaveBeenCalledWith("/posts/11");
  });
});

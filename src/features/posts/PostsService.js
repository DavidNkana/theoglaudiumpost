import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

export const getPosts = () => api.get("/posts");

export const getPost = (id) => api.get(`/posts/${id}`);

export const createPost = (data) => api.post("/posts", data);

export const updatePost = (id, data) => api.put(`/posts/${id}`, data);

export const deletePost = (id) => api.delete(`/posts/${id}`);

export class PostsService extends BaseService {
  constructor() {
    super("posts");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(PostsService.prototype, {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
});

export const postsService = new PostsService();
export default postsService;

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

// export const getPosts = () => api.get("/posts");

// export const getPost = (id) => api.get(`/posts/${id}`);

export const login = (data) => api.post("/auth/login", data);

// export const register = (data) => api.post("/auth/register", data);
// export const register = (data) => api.post("/auth/register", data);

// export const updatePost = (id, data) => api.put(`/posts/${id}`, data);

// export const deletePost = (id) => api.delete(`/posts/${id}`);

export class AuthService extends BaseService {
  constructor() {
    super("auth");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(AuthService.prototype, { login });

export const authService = new AuthService();
export default authService;

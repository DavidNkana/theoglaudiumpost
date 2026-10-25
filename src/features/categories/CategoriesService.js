import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

export const getCategories = (
  tab = "all",
  page = "0",
  search = "",
  category = ""
) => api.get(`/categories?search=${search}`);

export const getCategory = (id) => api.get(`/categories/${id}`);

export const getCategoryBySlug = (slug) => api.get(`/categories/slug/${slug}`);

export const getCategoryArticles = (slug, { page = "0", size }) =>
  api.get(`/categories/${slug}/articles?page=${page}&size=${size}`);

export const createCategory = (data) => api.post("/categories/create", data);

export const editCategory = (id, data) => api.put(`/categories/${id}`, data);

export const removeCategory = (id) => api.delete(`/categories/${id}`);

export class CategoriesService extends BaseService {
  constructor() {
    super("categories");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(CategoriesService.prototype, {
  getCategories,
  getCategory,
  getCategoryBySlug,
  getCategoryArticles,
  createCategory,
  editCategory,
  removeCategory,
});

export const categoriesService = new CategoriesService();
export default categoriesService;

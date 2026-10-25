// src/features/users/UsersService.js
import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

const path = "users";

export const getUsers = ({ page = 0, size = 10, search = "" } = {}) =>
  api.get(`${path}?search=${search}&size=${size}&page=${page}`);

export const getUser = (id) => api.get(`${path}/${id}`);

export const getRoles = () => api.get(`${path}/roles`);

export const createUser = (data) => api.post(`${path}/create`, data);

export const editUser = (id, data) => api.put(`${path}/${id}`, data);

export const removeUser = (id) => api.delete(`${path}/${id}`);

export class UsersService extends BaseService {
  constructor() {
    super("users");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(UsersService.prototype, {
  getUsers,
  getUser,
  getRoles,
  createUser,
  editUser,
  removeUser,
});

export const usersService = new UsersService();
export default usersService;

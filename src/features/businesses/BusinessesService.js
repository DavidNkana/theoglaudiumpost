// src/features/businesses/BusinessesService.js
import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

const path = "businesses";

export const getBusinesses = ({
  type = "",
  page = 0,
  size = 10,
  search = "",
  category = "",
  status = "",
}) =>
  api.get(
    `${path}?type=${type}&search=${search}&category=${category}&status=${status}&size=${size}&page=${page}`
  );
export const getAds = (id) => api.get(`${path}/ads`);
export const getCampaigns = (id) => api.get(`${path}/campaigns`);

export const getBusiness = (id) => api.get(`${path}/${id}`);

export const createBusiness = (data) => api.post(`${path}/create`, data);

export const editBusiness = (id, data) => api.put(`${path}/${id}`, data);

export const removeBusiness = (id) => api.delete(`${path}/${id}`);

export const register = (data) => api.post(`${path}/create`, data);

export const getPayments = ({
  businessId = 0,
  page = 0,
  size = 10,
  search = "",
  status = "",
}) =>
  api.get(
    `${path}/payments?businessId=${businessId}&search=${search}&status=${status}&size=${size}&page=${page}`
  );

export class BusinessesService extends BaseService {
  constructor() {
    super("businesses");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(BusinessesService.prototype, {
  getBusinesses,
  getAds,
  getCampaigns,
  getBusiness,
  createBusiness,
  editBusiness,
  removeBusiness,
  register,
  getPayments,
});

export const businessesService = new BusinessesService();
export default businessesService;

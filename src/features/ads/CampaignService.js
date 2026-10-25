/**
 * PURPOSE: Service for campaigns API - fetching and creating advertising campaigns
 * Used by ad forms to associate ads with campaigns
 */
import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

const path = "campaigns";

export const getCampaigns = ({
  page = 0,
  size = 100,
  search = "",
  status = "",
  payment_status = "",
} = {}) =>
  api.get(
    `${path}?search=${search}&status=${status}&payment_status=${payment_status}&size=${size}&page=${page}`
  );

export const getCampaign = (id) => api.get(`${path}/${id}`);

export const createCampaign = (data) => api.post(`${path}/create`, data);

export const editCampaign = (id, data) => api.put(`${path}/${id}`, data);

export const deleteCampaign = (id) => api.delete(`${path}/${id}`);

export class CampaignService extends BaseService {
  constructor() {
    super("campaigns");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(CampaignService.prototype, {
  getCampaigns,
  getCampaign,
  createCampaign,
  editCampaign,
  deleteCampaign,
});

export const campaignService = new CampaignService();
export default campaignService;

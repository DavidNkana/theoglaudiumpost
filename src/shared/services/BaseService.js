/**
 * shared/services/BaseService.js
 *
 * Object-oriented base class for every domain service in src/features/.
 *
 * It owns the shared HTTP client and the common REST verbs so each feature
 * service (ArticlesService, AdsService, BusinessesService, …) extends it
 * instead of repeating axios plumbing. Domain services add their own methods
 * for endpoints that don't follow the default REST shape.
 *
 * All API access still flows through the central client (services/api.js);
 * BaseService is the single OO entry point that wraps it.
 */

import api from "@/services/api";

export class BaseService {
  /**
   * @param {string} [resource=""] - REST resource segment (e.g. "articles"),
   *   used by the default verbs below.
   */
  constructor(resource = "") {
    this.resource = resource;
    /** Shared axios client (base URL, auth + refresh interceptors). */
    this.api = api;
  }

  /** GET /{resource} with optional query params. */
  list(params = {}) {
    return this.api.get(`/${this.resource}`, { params });
  }

  /** GET /{resource}/{id}. */
  get(id) {
    return this.api.get(`/${this.resource}/${id}`);
  }

  /** POST /{resource}/create. */
  create(data) {
    return this.api.post(`/${this.resource}/create`, data);
  }

  /** PUT /{resource}/{id}. */
  update(id, data) {
    return this.api.put(`/${this.resource}/${id}`, data);
  }

  /** DELETE /{resource}/{id}. */
  remove(id) {
    return this.api.delete(`/${this.resource}/${id}`);
  }
}

export default BaseService;

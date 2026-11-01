/**
 * shared/services/BaseService.js
 *
 * Object-oriented base class for every domain service in src/features/.
 *
 * Domain services own their data access (Supabase) and expose it as named
 * functions; this class only provides the shared shape — a resource name and
 * a small set of generic verbs.
 */

export class BaseService {
  /**
   * @param {string} [resource=""] - Resource segment (e.g. "articles"),
   */
  constructor(resource = "") {
    this.resource = resource;
  }

  /** Lists the resource. */
  list(params = {}) {
    return Promise.reject(
      new Error(`${this.constructor.name}.list() is not implemented`),
    );
  }

  /** Reads the resource collection. */
  get(params = {}) {
    return Promise.reject(
      new Error(`${this.constructor.name}.get() is not implemented`),
    );
  }

  /** Reads a single record. */
  getById(id) {
    return Promise.reject(
      new Error(`${this.constructor.name}.getById() is not implemented`),
    );
  }

  /** Creates a record. */
  create(data) {
    return Promise.reject(
      new Error(`${this.constructor.name}.create() is not implemented`),
    );
  }

  /** Updates a record. */
  update(id, data) {
    return Promise.reject(
      new Error(`${this.constructor.name}.update() is not implemented`),
    );
  }

  /** Deletes a record. */
  remove(id) {
    return Promise.reject(
      new Error(`${this.constructor.name}.remove() is not implemented`),
    );
  }
}

export default BaseService;

/**
 * tests/helpers/supabaseMock.js
 *
 * A chainable stand-in for the Supabase query builder.
 *
 * The data layer calls Supabase through a fluent builder
 * (from().select().eq().order().range()). Rather than hitting a live database
 * in unit tests, this mock records the chain and returns a canned result.
 */

import { vi } from "vitest";

/**
 * Builds a query builder.
 *
 * @param {Object} result - The result the terminal call resolves with
 * @returns {Object} The builder
 */
export const createQueryBuilder = (result = { data: null, error: null }) => {
  const calls = [];

  const builder = {
    calls,

    _record(name, args) {
      calls.push({ name, args });
      return builder;
    },

    select: vi.fn((...args) => builder._record("select", args)),
    insert: vi.fn((...args) => builder._record("insert", args)),
    update: vi.fn((...args) => builder._record("update", args)),
    delete: vi.fn((...args) => builder._record("delete", args)),
    upsert: vi.fn((...args) => builder._record("upsert", args)),
    eq: vi.fn((...args) => builder._record("eq", args)),
    neq: vi.fn((...args) => builder._record("neq", args)),
    gt: vi.fn((...args) => builder._record("gt", args)),
    gte: vi.fn((...args) => builder._record("gte", args)),
    lt: vi.fn((...args) => builder._record("lt", args)),
    lte: vi.fn((...args) => builder._record("lte", args)),
    like: vi.fn((...args) => builder._record("like", args)),
    ilike: vi.fn((...args) => builder._record("ilike", args)),
    or: vi.fn((...args) => builder._record("or", args)),
    not: vi.fn((...args) => builder._record("not", args)),
    order: vi.fn((...args) => builder._record("order", args)),
    limit: vi.fn((...args) => builder._record("limit", args)),
    range: vi.fn((...args) => builder._record("range", args)),
    single: vi.fn((...args) => builder._record("single", args)),
    maybeSingle: vi.fn((...args) => builder._record("maybeSingle", args)),
  };

  // The terminal call resolves with the canned result.
  builder.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);

  return builder;
};

/**
 * Builds a Supabase client stand-in.
 *
 * @param {Object} options - Table results and auth behaviour
 * @returns {Object} The mocked client
 */
export const createSupabaseMock = ({
  tables = {},
  auth = {},
  storage = {},
  rpcResult = { data: null, error: null },
} = {}) => {
  const builders = {};
  const tableNames = [];

  const client = {
    builders,
    tableNames,

    from(table) {
      tableNames.push(table);
      if (!builders[table]) {
        builders[table] = createQueryBuilder(
          tables[table] ?? { data: [], error: null, count: 0 },
        );
      }
      return builders[table];
    },

    rpc: vi.fn(async () => rpcResult),

    auth: {
      signInWithPassword: vi.fn(async () => ({
        data: { session: null, user: null },
        error: null,
        ...auth,
      })),
      signUp: vi.fn(async () => ({
        data: { session: null, user: null },
        error: null,
        ...auth,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({
        data: { session: auth.session ?? null },
        error: null,
      })),
      ...auth,
    },

    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null, ...storage })),
        remove: vi.fn(async () => ({ data: null, error: null, ...storage })),
        getPublicUrl: vi.fn((path) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        })),
      })),
    },
  };

  return client;
};

/**
 * Finds the recorded calls of a given name on a builder.
 */
export const callsTo = (builder, name) =>
  (builder?.calls ?? []).filter((call) => call.name === name);

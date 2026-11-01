/**
 * tests/helpers/supabaseModuleMock.js
 *
 * Builds the mocked shape of "@/services/supabase.js" for unit tests.
 *
 * The service modules import the Supabase client plus a handful of response
 * adapters. This helper returns a module mock whose client reads from a
 * mutable state object, so each test can decide what the database returns.
 */

import { vi } from "vitest";
import { createQueryBuilder } from "./supabaseMock.js";
import { withAliases, withAliasesAll } from "../../src/utils/rowAliases.js";

const ok = (data) => ({ status: 200, data });
const created = (data) => ({ status: 201, data });

const rethrow = (error, fallback = "Request failed") => {
  const message = error?.message || fallback;
  const status = error?.status ?? 500;
  const shaped = new Error(message);
  shaped.isAxiosError = true;
  shaped.response = { status, data: { message } };
  return Promise.reject(shaped);
};

/**
 * Builds the module mock.
 *
 * @param {Object} state - Mutable state shared with the test:
 *   tables: { tableName: { data, error, count } }
 *   session, user, signInError, storageError, rpcResult
 */
export const buildSupabaseModule = (state) => {
  if (!state.builders) state.builders = {};

  const client = {
    get builders() {
      return state.builders;
    },

    from(table) {
      if (!state.builders[table]) {
        state.builders[table] = createQueryBuilder(
          state.tables?.[table] ?? { data: [], error: null, count: 0 },
        );
      }
      return state.builders[table];
    },

    rpc: vi.fn(async () => state.rpcResult ?? { data: null, error: null }),

    auth: {
      signInWithPassword: vi.fn(async () => ({
        data: { session: state.session ?? null, user: state.user ?? null },
        error: state.signInError ?? null,
      })),
      signUp: vi.fn(async () => ({
        data: { session: state.session ?? null, user: state.user ?? null },
        error: state.signUpError ?? null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({
        data: { session: state.session ?? null },
        error: null,
      })),
    },

    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({
          data: null,
          error: state.storageError ?? null,
        })),
        remove: vi.fn(async () => ({ data: null, error: null })),
        getPublicUrl: vi.fn((path) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        })),
      })),
    },
  };

  return {
    supabase: client,
    ok,
    created,
    rethrow,
    withAliases,
    withAliasesAll,
    publicMediaUrl: (path) => (path ? `https://cdn.test/${path}` : null),
    MEDIA_BUCKET: "public-media",
    getSession: vi.fn(async () => state.session ?? null),
    getAccessToken: vi.fn(async () => state.session?.access_token ?? null),
    getProfile: vi.fn(async () => state.profile ?? null),
    isAdmin: vi.fn(async () => state.profile?.role === "admin"),
    signInWithPassword: vi.fn(async () =>
      ok({
        token: "token",
        refreshToken: "refresh",
        user: { id: "user-1", role: { id: 1, name: "admin" } },
      }),
    ),
    signOut: vi.fn(async () => ok(true)),
    default: client,
  };
};

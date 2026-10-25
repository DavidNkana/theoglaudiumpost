import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for src/router/index.js
 *
 * Strategy:
 * - Mock every external boundary the source imports: the three layout .vue
 *   components, the useAuth composable, and @/config/env (so IS_DEV / BASE_URL
 *   are controllable per test).
 * - IS_DEV is read at guard-execution time, so we expose it through a mutable
 *   mock object and re-import the module (via vi.resetModules + dynamic import)
 *   when we need the opposite branch of the `beforeEnter` ternary.
 * - The beforeEach navigation guard reads auth state directly from
 *   localStorage; we drive every branch by seeding localStorage + a fake `to`
 *   route, then asserting the exact `next(...)` argument.
 */

// --- Mocked boundaries -------------------------------------------------------

vi.mock("@/layouts/AppLayout.vue", () => ({ default: { name: "AppLayout" } }));
vi.mock("@/layouts/AdminLayout.vue", () => ({
  default: { name: "AdminLayout" },
}));
vi.mock("@/layouts/BusinessLayout.vue", () => ({
  default: { name: "BusinessLayout" },
}));
vi.mock("@/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({})),
}));

// Wrap vue-router so we can capture the global beforeEach guard the module
// registers at import time, while still using the real router implementation.
const capturedGuards = [];
vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createRouter: (options) => {
      const router = actual.createRouter(options);
      const originalBeforeEach = router.beforeEach.bind(router);
      router.beforeEach = (fn) => {
        capturedGuards.push(fn);
        return originalBeforeEach(fn);
      };
      return router;
    },
  };
});

// Mutable env mock so individual tests can flip IS_DEV.
const envState = { IS_DEV: false, BASE_URL: "/" };
vi.mock("@/config/env", () => ({
  get IS_DEV() {
    return envState.IS_DEV;
  },
  get BASE_URL() {
    return envState.BASE_URL;
  },
}));

// Helper: import the router module fresh, optionally setting IS_DEV first.
async function loadRouter({ isDev = false, baseUrl = "/" } = {}) {
  envState.IS_DEV = isDev;
  envState.BASE_URL = baseUrl;
  capturedGuards.length = 0;
  vi.resetModules();
  // Re-establish mocks after resetModules (they persist, but be explicit).
  const mod = await import("./index.js");
  return mod.default;
}

// Find a route record (recursively) by its `name`.
function findByName(routes, name) {
  for (const r of routes) {
    if (r.name === name) return r;
    if (r.children) {
      const hit = findByName(r.children, name);
      if (hit) return hit;
    }
  }
  return undefined;
}

// Recursively collect every lazy `() => import(...)` component loader so the
// test can invoke them (they each count as a function for coverage).
function collectComponentLoaders(routes, out = []) {
  for (const r of routes) {
    if (typeof r.component === "function") out.push(r.component);
    if (r.children) collectComponentLoaders(r.children, out);
  }
  return out;
}

// --- Tests -------------------------------------------------------------------

describe("router/index.js", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("module construction", () => {
    it("creates a router instance with the expected routes and error routes", async () => {
      const router = await loadRouter();
      expect(router).toBeTruthy();

      const routes = router.options.routes;
      // Top-level public root route.
      expect(routes.find((r) => r.path === "/")).toBeTruthy();
      // Business + admin top-level routes.
      expect(routes.find((r) => r.path === "/business")).toBeTruthy();
      expect(routes.find((r) => r.path === "/admin")).toBeTruthy();

      // Admin meta carries auth + admin flags.
      const admin = routes.find((r) => r.path === "/admin");
      expect(admin.meta).toMatchObject({ requiresAuth: true, adminRoute: true });

      // Error routes were pushed onto the array.
      expect(findByName(routes, "Forbidden")).toBeTruthy();
      expect(findByName(routes, "NotFound")).toBeTruthy();
      expect(
        routes.find((r) => r.path === "/:pathMatch(.*)*")?.redirect
      ).toBe("/404");

      // Standalone /admin/prompts redirect preserves auth guards.
      expect(
        routes.find((r) => r.path === "/admin/prompts")?.redirect
      ).toBe("/admin/articles/prompts");

      // Named protected/super-admin routes exist.
      expect(findByName(routes, "BusinessDashboard")).toBeTruthy();
      expect(findByName(routes, "ManagePrompts")).toBeTruthy();
      const payments = findByName(routes, "PaymentsManagement");
      expect(payments.meta.superAdminRoute).toBe(true);
    });

    it("uses BASE_URL for history configuration without throwing", async () => {
      const router = await loadRouter({ baseUrl: "/app/" });
      expect(router.options.history).toBeTruthy();
    });

    it("every lazy component loader is an invokable dynamic import", async () => {
      const router = await loadRouter();
      const loaders = collectComponentLoaders(router.options.routes);
      // The app defines many lazily-loaded views.
      expect(loaders.length).toBeGreaterThan(40);
      // Invoke each loader to execute its `() => import(...)` body. We swallow
      // resolution/rejection — we only care that the arrow function ran.
      const results = loaders.map((fn) => {
        const out = fn();
        expect(out).toBeInstanceOf(Promise);
        return out.then(
          () => true,
          () => false
        );
      });
      await Promise.all(results);
    });
  });

  describe("scrollBehavior", () => {
    it("restores the saved position on back/forward navigation", async () => {
      const router = await loadRouter();
      const saved = { left: 0, top: 250 };
      expect(
        router.options.scrollBehavior({}, {}, saved)
      ).toBe(saved);
    });

    it("scrolls to the top on a new navigation (no saved position)", async () => {
      const router = await loadRouter();
      expect(
        router.options.scrollBehavior({}, {}, null)
      ).toEqual({ top: 0 });
    });
  });

  describe("ProjectDocumentation beforeEnter guard", () => {
    function getGuard(router) {
      const route = router.options.routes.find(
        (r) => r.name === "ProjectDocumentation"
      );
      return route.beforeEnter;
    }

    it("allows access in development mode (IS_DEV true)", async () => {
      const router = await loadRouter({ isDev: true });
      const next = vi.fn();
      getGuard(router)({}, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("redirects to / when not in development mode (IS_DEV false)", async () => {
      const router = await loadRouter({ isDev: false });
      const next = vi.fn();
      getGuard(router)({}, {}, next);
      expect(next).toHaveBeenCalledWith("/");
    });
  });

  describe("beforeEach navigation guard", () => {
    let guard;

    beforeEach(async () => {
      await loadRouter();
      // The module registers exactly one global beforeEach guard, captured by
      // our vue-router wrapper above.
      expect(capturedGuards.length).toBe(1);
      guard = capturedGuards[0];
    });

    function run(to) {
      const next = vi.fn();
      guard(to, { path: "/from" }, next);
      return next;
    }

    function makeTo(overrides = {}) {
      return {
        path: "/",
        fullPath: "/",
        meta: {},
        ...overrides,
      };
    }

    it("sets the document title from route meta", () => {
      run(makeTo({ meta: { title: "Latest News" } }));
      expect(document.title).toBe("Latest News | Laudium POST");
    });

    it("falls back to the bare brand title for routes without a title", () => {
      run(makeTo({ meta: {} }));
      expect(document.title).toBe("Laudium POST");
    });

    describe("/admin entry handling", () => {
      it("redirects unauthenticated /admin to login and clears stale auth data", () => {
        localStorage.setItem("auth.token", "stale");
        localStorage.setItem("auth.refresh_token", "r");
        localStorage.setItem("auth.expiration", "e");
        // No auth.user => not authenticated.
        const next = run(makeTo({ path: "/admin", meta: {} }));
        expect(next).toHaveBeenCalledWith({
          path: "/admin/login",
          query: { redirect: "/admin/dashboard" },
        });
        expect(localStorage.getItem("auth.token")).toBeNull();
        expect(localStorage.getItem("auth.refresh_token")).toBeNull();
        expect(localStorage.getItem("auth.expiration")).toBeNull();
      });

      it("redirects unauthenticated /admin/ (trailing slash) to login", () => {
        const next = run(makeTo({ path: "/admin/", meta: {} }));
        expect(next).toHaveBeenCalledWith({
          path: "/admin/login",
          query: { redirect: "/admin/dashboard" },
        });
      });

      it("allows an authenticated user through /admin (no clearing, falls to next())", () => {
        localStorage.setItem("auth.token", "tok");
        localStorage.setItem(
          "auth.user",
          JSON.stringify({ role: { name: "admin" } })
        );
        // /admin has requiresAuth:true + adminRoute in real meta; emulate it.
        const next = run(
          makeTo({
            path: "/admin",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        // Authenticated admin passes all checks → next() with no args.
        expect(next).toHaveBeenCalledWith();
        // localStorage preserved.
        expect(localStorage.getItem("auth.token")).toBe("tok");
      });
    });

    describe("public (non-auth) routes", () => {
      it("calls next() for routes that do not require auth", () => {
        const next = run(makeTo({ path: "/", meta: { title: "Home" } }));
        expect(next).toHaveBeenCalledWith();
      });

      it("treats missing requiresAuth as false (||  false branch)", () => {
        const next = run(makeTo({ path: "/news", meta: {} }));
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe("authentication requirement", () => {
      it("redirects unauthenticated admin route to /admin/login with redirect query", () => {
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            fullPath: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        expect(next).toHaveBeenCalledWith({
          path: "/admin/login",
          query: { redirect: "/admin/dashboard" },
        });
      });

      it("redirects unauthenticated non-admin protected route to /business/register", () => {
        const next = run(
          makeTo({
            path: "/business/dashboard",
            fullPath: "/business/dashboard",
            meta: { requiresAuth: true },
          })
        );
        expect(next).toHaveBeenCalledWith({
          path: "/business/register",
          query: { redirect: "/business/dashboard" },
        });
      });

      it("treats a present token but missing user as unauthenticated", () => {
        localStorage.setItem("auth.token", "tok");
        // no auth.user
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            fullPath: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        expect(next).toHaveBeenCalledWith({
          path: "/admin/login",
          query: { redirect: "/admin/dashboard" },
        });
      });
    });

    describe("super admin authorization", () => {
      function authAs(role) {
        localStorage.setItem("auth.token", "tok");
        localStorage.setItem(
          "auth.user",
          JSON.stringify({ role: { name: role } })
        );
      }

      it("redirects to /403 when superAdminRoute and user is not superadmin", () => {
        authAs("admin");
        const next = run(
          makeTo({
            path: "/admin/ads/payments",
            meta: {
              requiresAuth: true,
              adminRoute: true,
              superAdminRoute: true,
            },
          })
        );
        expect(next).toHaveBeenCalledWith("/403");
      });

      it("allows a superadmin through a superAdminRoute", () => {
        authAs("superadmin");
        const next = run(
          makeTo({
            path: "/admin/ads/payments",
            meta: {
              requiresAuth: true,
              adminRoute: true,
              superAdminRoute: true,
            },
          })
        );
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe("admin authorization", () => {
      function authAs(role) {
        localStorage.setItem("auth.token", "tok");
        localStorage.setItem(
          "auth.user",
          JSON.stringify({ role: { name: role } })
        );
      }

      it("redirects to /403 when adminRoute and user is neither admin nor superadmin", () => {
        authAs("advertiser");
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        expect(next).toHaveBeenCalledWith("/403");
      });

      it("allows an admin user through an adminRoute", () => {
        authAs("admin");
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        expect(next).toHaveBeenCalledWith();
      });

      it("allows a superadmin user through an adminRoute (second hasRole branch)", () => {
        authAs("superadmin");
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe("hasRole edge cases", () => {
      it("returns false when the user has no role object (optional chaining)", () => {
        localStorage.setItem("auth.token", "tok");
        localStorage.setItem("auth.user", JSON.stringify({ name: "noRole" }));
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        // roleName undefined → hasRole false → admin route denied.
        expect(next).toHaveBeenCalledWith("/403");
      });
    });

    describe("business route authorization", () => {
      function authAs(role, extra = {}) {
        localStorage.setItem("auth.token", "tok");
        localStorage.setItem(
          "auth.user",
          JSON.stringify({ role: { name: role }, ...extra })
        );
      }

      it("redirects to /403 when a business route user lacks the advertiser role", () => {
        authAs("admin");
        const next = run(
          makeTo({
            path: "/business/dashboard",
            fullPath: "/business/dashboard",
            meta: { requiresAuth: true },
          })
        );
        expect(next).toHaveBeenCalledWith("/403");
      });

      it("redirects an advertiser without a business profile to /business/register", () => {
        authAs("advertiser"); // no `business` field
        const next = run(
          makeTo({
            path: "/business/dashboard",
            fullPath: "/business/dashboard",
            meta: { requiresAuth: true },
          })
        );
        expect(next).toHaveBeenCalledWith({
          path: "/business/register",
          query: { redirect: "/business/dashboard" },
        });
      });

      it("allows an advertiser with a business profile through a business route", () => {
        authAs("advertiser", { business: { id: 1 } });
        const next = run(
          makeTo({
            path: "/business/dashboard",
            fullPath: "/business/dashboard",
            meta: { requiresAuth: true },
          })
        );
        expect(next).toHaveBeenCalledWith();
      });

      it("does NOT treat /business/login as a protected business route", () => {
        // requiresAuth false here means it returns early, but path exclusion is
        // the branch under test: isBusinessRoute must be false for /business/login.
        authAs("advertiser");
        const next = run(
          makeTo({
            path: "/business/login",
            fullPath: "/business/login",
            meta: { requiresAuth: true },
          })
        );
        // advertiser + path excluded from business-route checks → passes.
        expect(next).toHaveBeenCalledWith();
      });

      it("does NOT treat /business/register as a protected business route", () => {
        authAs("advertiser");
        const next = run(
          makeTo({
            path: "/business/register",
            fullPath: "/business/register",
            meta: { requiresAuth: true },
          })
        );
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe("hasRole role argument falsy branch", () => {
      it("returns false branch via role being absent is covered through admin denial", () => {
        // Authenticated user whose role name is empty string → roleName falsy.
        localStorage.setItem("auth.token", "tok");
        localStorage.setItem(
          "auth.user",
          JSON.stringify({ role: { name: "" } })
        );
        const next = run(
          makeTo({
            path: "/admin/dashboard",
            meta: { requiresAuth: true, adminRoute: true },
          })
        );
        expect(next).toHaveBeenCalledWith("/403");
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// The central HTTP client is the only collaborator; mock it at the boundary.
vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

import api from "@/services/api";
import {
  login,
  AuthService,
  authService,
} from "@/features/auth/AuthService";
import defaultExport from "@/features/auth/AuthService";

describe("AuthService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login() POSTs /auth/login with the credentials and returns the client promise", () => {
    const credentials = { email: "a@b.com", password: "secret" };
    const promise = Promise.resolve({ data: { token: "t" } });
    api.post.mockReturnValue(promise);

    const result = login(credentials);

    expect(api.post).toHaveBeenCalledWith("/auth/login", credentials);
    expect(result).toBe(promise);
  });

  it("AuthService is constructed with the 'auth' resource segment", () => {
    const svc = new AuthService();
    expect(svc.resource).toBe("auth");
    expect(svc.api).toBe(api);
  });

  it("AuthService instances expose login() on the prototype", () => {
    const svc = new AuthService();
    const credentials = { email: "x@y.com", password: "pw" };
    svc.login(credentials);
    expect(api.post).toHaveBeenCalledWith("/auth/login", credentials);
  });

  it("authService singleton is an AuthService instance and is the default export", () => {
    expect(authService).toBeInstanceOf(AuthService);
    expect(defaultExport).toBe(authService);
  });

  it("authService singleton delegates login() to the central client", () => {
    const credentials = { email: "s@t.com", password: "pw2" };
    authService.login(credentials);
    expect(api.post).toHaveBeenCalledWith("/auth/login", credentials);
  });

  it("authService inherits BaseService REST verbs against the auth resource", () => {
    authService.list({ page: 2 });
    authService.get(5);
    authService.create({ name: "n" });
    authService.update(5, { name: "m" });
    authService.remove(5);

    expect(api.get).toHaveBeenCalledWith("/auth", { params: { page: 2 } });
    expect(api.get).toHaveBeenCalledWith("/auth/5");
    expect(api.post).toHaveBeenCalledWith("/auth/create", { name: "n" });
    expect(api.put).toHaveBeenCalledWith("/auth/5", { name: "m" });
    expect(api.delete).toHaveBeenCalledWith("/auth/5");
  });
});

// src/features/users/UsersService.spec.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "@/services/api";
import {
  getUsers,
  getUser,
  getRoles,
  createUser,
  editUser,
  removeUser,
  UsersService,
  usersService,
} from "@/features/users/UsersService";
import defaultExport from "@/features/users/UsersService";
import { BaseService } from "@/shared/services/BaseService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUsers", () => {
  it("uses provided values for every param", () => {
    const resp = { data: [] };
    api.get.mockReturnValue(resp);

    const result = getUsers({ page: 3, size: 25, search: "jane" });

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(
      "users?search=jane&size=25&page=3"
    );
    expect(result).toBe(resp);
  });

  it("uses default values when called with an empty object", () => {
    api.get.mockReturnValue("default-resp");

    const result = getUsers({});

    expect(api.get).toHaveBeenCalledWith("users?search=&size=10&page=0");
    expect(result).toBe("default-resp");
  });

  it("uses default values when called with no arguments", () => {
    api.get.mockReturnValue("no-arg-resp");

    const result = getUsers();

    expect(api.get).toHaveBeenCalledWith("users?search=&size=10&page=0");
    expect(result).toBe("no-arg-resp");
  });
});

describe("getUser", () => {
  it("requests a single user by id", () => {
    api.get.mockReturnValue("one");
    expect(getUser(99)).toBe("one");
    expect(api.get).toHaveBeenCalledWith("users/99");
  });
});

describe("getRoles", () => {
  it("requests the roles endpoint", () => {
    api.get.mockReturnValue("roles");
    expect(getRoles()).toBe("roles");
    expect(api.get).toHaveBeenCalledWith("users/roles");
  });
});

describe("createUser", () => {
  it("posts to the create endpoint with data", () => {
    const data = { name: "Jane", email: "a@b.c" };
    api.post.mockReturnValue("created");
    expect(createUser(data)).toBe("created");
    expect(api.post).toHaveBeenCalledWith("users/create", data);
  });
});

describe("editUser", () => {
  it("puts data to the user id endpoint", () => {
    const data = { name: "New" };
    api.put.mockReturnValue("edited");
    expect(editUser(5, data)).toBe("edited");
    expect(api.put).toHaveBeenCalledWith("users/5", data);
  });
});

describe("removeUser", () => {
  it("deletes a user by id", () => {
    api.delete.mockReturnValue("removed");
    expect(removeUser(8)).toBe("removed");
    expect(api.delete).toHaveBeenCalledWith("users/8");
  });
});

describe("rejected (catch) paths via the API boundary", () => {
  it("getUsers rejects when api.get rejects", async () => {
    const err = new Error("network");
    api.get.mockRejectedValue(err);
    await expect(getUsers({})).rejects.toThrow("network");
  });

  it("createUser rejects when api.post rejects", async () => {
    api.post.mockRejectedValue(new Error("post-fail"));
    await expect(createUser({})).rejects.toThrow("post-fail");
  });

  it("editUser rejects when api.put rejects", async () => {
    api.put.mockRejectedValue(new Error("put-fail"));
    await expect(editUser(1, {})).rejects.toThrow("put-fail");
  });

  it("removeUser rejects when api.delete rejects", async () => {
    api.delete.mockRejectedValue(new Error("delete-fail"));
    await expect(removeUser(1)).rejects.toThrow("delete-fail");
  });
});

describe("UsersService class", () => {
  it("extends BaseService and sets the users resource", () => {
    const service = new UsersService();
    expect(service).toBeInstanceOf(BaseService);
    expect(service).toBeInstanceOf(UsersService);
    expect(service.resource).toBe("users");
    expect(service.api).toBe(api);
  });

  it("exposes the domain functions as prototype methods", () => {
    expect(UsersService.prototype.getUsers).toBe(getUsers);
    expect(UsersService.prototype.getUser).toBe(getUser);
    expect(UsersService.prototype.getRoles).toBe(getRoles);
    expect(UsersService.prototype.createUser).toBe(createUser);
    expect(UsersService.prototype.editUser).toBe(editUser);
    expect(UsersService.prototype.removeUser).toBe(removeUser);
  });
});

describe("usersService singleton", () => {
  it("is a UsersService instance and the default export", () => {
    expect(usersService).toBeInstanceOf(UsersService);
    expect(defaultExport).toBe(usersService);
  });

  it("can invoke a domain method through the singleton instance", () => {
    api.get.mockReturnValue("via-singleton");

    const result = usersService.getUser(123);

    expect(result).toBe("via-singleton");
    expect(api.get).toHaveBeenCalledWith("users/123");
  });

  it("can invoke an inherited BaseService method through the singleton", () => {
    api.get.mockReturnValue("listed");

    const result = usersService.list({ page: 1 });

    expect(result).toBe("listed");
    expect(api.get).toHaveBeenCalledWith("/users", {
      params: { page: 1 },
    });
  });
});

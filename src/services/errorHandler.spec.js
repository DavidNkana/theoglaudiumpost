import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { errorHandler } from "@/services/errorHandler";

// Mock the central HTTP client at the boundary (not used by errorHandler, but
// required by the isolation contract).
vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// `responses` is referenced as a free global inside errorHandler.js (it is
// injected at runtime rather than imported). Provide a stub so we can assert
// on throwErr calls.
const throwErrMock = vi.fn();

beforeEach(() => {
  throwErrMock.mockReset();
  vi.stubGlobal("responses", { throwErr: throwErrMock });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("errorHandler.throwNotFound", () => {
  it("returns the connection failure message", () => {
    expect(errorHandler.throwNotFound()).toBe("Failed to Connect to Server!");
  });
});

describe("errorHandler.throwTimeOut", () => {
  it("returns the timeout message", () => {
    expect(errorHandler.throwTimeOut()).toBe("Connection Time Out!");
  });
});

describe("errorHandler.franchiseLoginError", () => {
  it("returns not-found message when status is 404", () => {
    const err = { response: { status: 404, data: { message: "ignored" } } };
    expect(errorHandler.franchiseLoginError(err)).toBe(
      "Failed to Connect to Server!"
    );
    expect(console.error).toHaveBeenCalledWith(err);
  });

  it("returns the response data message when status is not 404", () => {
    const err = { response: { status: 401, data: { message: "Unauthorized" } } };
    expect(errorHandler.franchiseLoginError(err)).toBe("Unauthorized");
  });
});

describe("errorHandler.tomcatError", () => {
  it("throws not-found message and shows error when status is 404 (default params)", () => {
    const err = { response: { status: 404, data: {} } };
    expect(() => errorHandler.tomcatError(err)).toThrow(
      "Failed to Connect to Server!"
    );
    expect(throwErrMock).toHaveBeenCalledWith("Failed to Connect to Server!", null);
  });

  it("uses errorMessage.error when present (object)", () => {
    const err = { response: { status: 500, data: { error: "boom-error" } } };
    expect(() => errorHandler.tomcatError(err)).toThrow("boom-error");
    expect(throwErrMock).toHaveBeenCalledWith("boom-error", null);
  });

  it("uses errorMessage.Error when present (object)", () => {
    const err = { response: { status: 500, data: { Error: "boom-Error" } } };
    expect(() => errorHandler.tomcatError(err)).toThrow("boom-Error");
  });

  it("uses errorMessage.response_message when present (object)", () => {
    const err = {
      response: { status: 500, data: { response_message: "rm-msg" } },
    };
    expect(() => errorHandler.tomcatError(err)).toThrow("rm-msg");
  });

  it("uses errorMessage.message when present (object)", () => {
    const err = { response: { status: 500, data: { message: "msg-field" } } };
    expect(() => errorHandler.tomcatError(err)).toThrow("msg-field");
  });

  it("uses errorMessage.Print when its toString().contains('failed') is truthy", () => {
    // The source calls errorMessage.Print.toString().contains('failed').
    // `.contains` is non-standard, so Print.toString() must return an object
    // exposing a `.contains` method that returns truthy for 'failed'.
    const printObj = {
      toString() {
        return { contains: (s) => s === "failed" };
      },
    };
    const err = { response: { status: 500, data: { Print: printObj } } };
    expect(() => errorHandler.tomcatError(err)).toThrow();
    // errorMessage becomes the Print object; throwErr receives it unchanged.
    expect(throwErrMock).toHaveBeenCalledWith(printObj, null);
  });

  it("falls through all branches when data is a plain object without known keys", () => {
    const err = { response: { status: 500, data: { other: "x" } } };
    // errorMessage stays as the data object; throw stringifies to [object Object]
    expect(() => errorHandler.tomcatError(err)).toThrow();
    expect(throwErrMock).toHaveBeenCalledWith(err.response.data, null);
  });

  it("falls through when data is a string (typeof !== object guards)", () => {
    const err = { response: { status: 500, data: "plain-string" } };
    expect(() => errorHandler.tomcatError(err)).toThrow("plain-string");
    expect(throwErrMock).toHaveBeenCalledWith("plain-string", null);
  });

  it("returns timeout message when no response and code is ECONNABORTED", () => {
    const err = { code: "ECONNABORTED" };
    expect(() => errorHandler.tomcatError(err)).toThrow("Connection Time Out!");
    expect(throwErrMock).toHaveBeenCalledWith("Connection Time Out!", null);
  });

  it("uses err.message when no response and not ECONNABORTED", () => {
    const err = { message: "generic failure" };
    expect(() => errorHandler.tomcatError(err)).toThrow("generic failure");
    expect(throwErrMock).toHaveBeenCalledWith("generic failure", null);
  });

  it("rewrites Network Error into the internet-check message and uses it as title", () => {
    const err = { message: "Network Error" };
    expect(() => errorHandler.tomcatError(err)).toThrow(
      "Please Check your Internet"
    );
    expect(throwErrMock).toHaveBeenCalledWith(
      "Please Check your Internet",
      "Network Error"
    );
  });

  it("does NOT call throwErr when isSweetalert is true", () => {
    const err = { message: "silent failure" };
    expect(() => errorHandler.tomcatError(err, true)).toThrow("silent failure");
    expect(throwErrMock).not.toHaveBeenCalled();
  });

  it("passes a provided title through when not a Network Error", () => {
    const err = { message: "with title" };
    expect(() =>
      errorHandler.tomcatError(err, false, "Custom Title")
    ).toThrow("with title");
    expect(throwErrMock).toHaveBeenCalledWith("with title", "Custom Title");
  });
});

describe("errorHandler.customerKazangError", () => {
  it("throws not-found message and shows error when status is 404 (default params)", () => {
    const err = { response: { status: 404, data: {} } };
    expect(() => errorHandler.customerKazangError(err)).toThrow(
      "Failed to Connect to Server!"
    );
    expect(throwErrMock).toHaveBeenCalledWith("Failed to Connect to Server!");
  });

  it("uses response.data when status is not 404", () => {
    const err = { response: { status: 500, data: "kazang-data" } };
    expect(() => errorHandler.customerKazangError(err)).toThrow("kazang-data");
    expect(throwErrMock).toHaveBeenCalledWith("kazang-data");
  });

  it("uses err.Message when err.Error is truthy and no response", () => {
    const err = { Error: true, Message: "kazang-message" };
    expect(() => errorHandler.customerKazangError(err)).toThrow(
      "kazang-message"
    );
    expect(throwErrMock).toHaveBeenCalledWith("kazang-message");
  });

  it("returns timeout message when no response, no Error, and ECONNABORTED", () => {
    const err = { code: "ECONNABORTED" };
    expect(() => errorHandler.customerKazangError(err)).toThrow(
      "Connection Time Out!"
    );
    expect(throwErrMock).toHaveBeenCalledWith("Connection Time Out!");
  });

  it("leaves errorMessage undefined when no branch matches", () => {
    const err = {};
    // errorMessage stays undefined; new Error(undefined) -> empty message
    expect(() => errorHandler.customerKazangError(err)).toThrow();
    expect(throwErrMock).toHaveBeenCalledWith(undefined);
  });

  it("does NOT call throwErr when isSweetalert is true", () => {
    const err = { response: { status: 500, data: "x" } };
    expect(() => errorHandler.customerKazangError(err, true)).toThrow("x");
    expect(throwErrMock).not.toHaveBeenCalled();
  });
});

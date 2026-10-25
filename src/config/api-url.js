const ABSOLUTE_URL_PROTOCOLS = new Set(["http:", "https:"]);

/** Validate and canonicalize an API base URL for the selected Vite mode. */
export function normalizeApiBaseUrl(value, { mode = "production" } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("API base URL must be a non-empty URL.");
  }

  const rawValue = value.trim();
  const isRelative = rawValue.startsWith("/");

  if (isRelative) {
    if (mode === "production") {
      throw new Error("production API base URL must be an absolute HTTPS URL.");
    }
    if (rawValue.startsWith("//")) {
      throw new Error("relative API base URL must use a single leading slash.");
    }
    if (rawValue.endsWith("//")) {
      throw new Error(
        "API base URL must not contain ambiguous trailing slashes.",
      );
    }
    return `${rawValue.replace(/\/+$/, "")}/`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new Error("API base URL must be a valid absolute URL.");
  }

  if (!ABSOLUTE_URL_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error("API base URL must use HTTP or HTTPS.");
  }
  if (mode === "production" && parsedUrl.protocol !== "https:") {
    throw new Error("production API base URL must use HTTPS.");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("API base URL must not contain credentials.");
  }
  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error(
      "API base URL must not contain a query string or fragment.",
    );
  }
  if (parsedUrl.pathname.endsWith("//")) {
    throw new Error(
      "API base URL must not contain ambiguous trailing slashes.",
    );
  }

  parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, "")}/`;
  return parsedUrl.toString();
}

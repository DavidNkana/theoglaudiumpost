/**
 * Interpolate OpenAPI-style `{param}` and Express-style `:param` path templates.
 * Missing params receive deterministic smoke placeholders so curl URLs are valid.
 */
export function extractPathParamNames(path) {
  const names = new Set();
  for (const match of path.matchAll(/\{(\w+)\}/g)) names.add(match[1]);
  for (const match of path.matchAll(/:(\w+)/g)) names.add(match[1]);
  return [...names];
}

export function defaultSmokePathParams(path) {
  const params = {};
  for (const name of extractPathParamNames(path)) {
    params[name] = `smoke-${name}-001`;
  }
  return params;
}

export function interpolatePath(path, params = {}) {
  let out = path;
  out = out.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `smoke-${key}-001`);
  out = out.replace(/:(\w+)/g, (_, key) => params[key] ?? `smoke-${key}-001`);
  return out;
}

/**
 * Join a base URL (with or without trailing slash) to a router path segment.
 * Root path "/" must not produce a double slash; relative segments get a leading "/".
 */
export function joinBaseUrl(baseUrl, path) {
  const base = baseUrl.replace(/\/+$/, '');
  if (!path || path === '/') {
    return `${base}/`;
  }
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}
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
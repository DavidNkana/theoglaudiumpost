#!/usr/bin/env node
/**
 * derive-api-endpoints.mjs
 *
 * Derives d18-smoke-test input from an OpenAPI api.yaml. Emits GET operations
 * that are safe for unauthenticated smoke (no security requirement on the op).
 *
 * Usage: node scripts/derive-api-endpoints.mjs <api.yaml> <output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { defaultSmokePathParams, extractPathParamNames } from './lib/path-interpolate.mjs';

const [apiYamlPath, outputPath] = process.argv.slice(2);
if (!apiYamlPath || !outputPath) {
  console.error('Usage: node scripts/derive-api-endpoints.mjs <api.yaml> <output.json>');
  process.exit(1);
}

const apiYaml = yaml.load(readFileSync(apiYamlPath, 'utf8'));
const endpoints = [];

for (const [path, pathItem] of Object.entries(apiYaml.paths ?? {})) {
  const getOp = pathItem.get;
  if (!getOp) continue;
  const forceSmoke = getOp['x-smoke'] === true;
  const isPublicPath = path.startsWith('/public/') || getOp.summary?.includes('(public)');
  if (!forceSmoke && !isPublicPath) continue;

  const entry = { method: 'GET', path };
  const smokeParams = getOp['x-smoke-path-params'];
  const paramNames = extractPathParamNames(path);
  if (paramNames.length > 0) {
    entry.pathParams = smokeParams && typeof smokeParams === 'object'
      ? { ...defaultSmokePathParams(path), ...smokeParams }
      : defaultSmokePathParams(path);
    entry.resolvePathParamsFrom = getOp['x-smoke-resolve-from'] ?? parentListPath(path);
  }
  endpoints.push(entry);
}

if (endpoints.length === 0) {
  console.error('derive-api-endpoints: no public GET operations found in api.yaml');
  process.exit(1);
}

writeFileSync(outputPath, JSON.stringify(endpoints, null, 2));
console.log(`Wrote ${endpoints.length} smoke endpoints to ${outputPath}`);

/** e.g. /public/mcps/{id} -> /public/mcps */
function parentListPath(path) {
  const idx = path.search(/\{[^}]+\}|:[^/]+/);
  return idx > 0 ? path.slice(0, idx).replace(/\/$/, '') || '/' : null;
}
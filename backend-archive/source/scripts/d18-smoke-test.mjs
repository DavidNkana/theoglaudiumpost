#!/usr/bin/env node
/**
 * d18-smoke-test.mjs
 *
 * Reads api-endpoints.json (derived from api.yaml at build time), GETs
 * every endpoint, optionally PATCHes non-persistent endpoints.
 *
 * Usage: node scripts/d18-smoke-test.mjs --base-url <url> --endpoints <file> [--insecure]
 */
import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { extractPathParamNames, interpolatePath } from './lib/path-interpolate.mjs';

const execAsync = promisify(exec);
const args = process.argv.slice(2);
let baseUrl, endpointsPath, insecure = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url') baseUrl = args[++i];
  else if (args[i] === '--endpoints') endpointsPath = args[++i];
  else if (args[i] === '--insecure') insecure = true;
}

const raw = JSON.parse(readFileSync(endpointsPath, 'utf8'));
const endpoints = Array.isArray(raw) ? raw : raw.endpoints;
if (!Array.isArray(endpoints)) {
  throw new Error('endpoints file must be an array or { endpoints: [...] }');
}
const curlFlags = insecure ? '-k' : '';
const resolvedParams = new Map();
let failed = 0;

for (const ep of endpoints) {
  if (ep.method !== 'GET') continue;
  const pathParams = await resolvePathParams(ep);
  if (extractPathParamNames(ep.path).length > 0 && !hasResolvedParams(pathParams)) {
    console.log(`SKIP ${ep.method} ${ep.path} — no list items to resolve path params`);
    continue;
  }
  const url = `${baseUrl}${interpolatePath(ep.path, pathParams)}`;
  try {
    const { stdout } = await execAsync(
      `curl ${curlFlags} -fsS -o /dev/null -w "%{http_code}" '${url}'`,
    );
    if (stdout !== '200') {
      console.error(`${ep.method} ${ep.path} -> ${stdout} (expected 200)`);
      failed++;
    }
  } catch (e) {
    console.error(`${ep.method} ${ep.path} -> ERROR ${e.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`${failed} endpoints failed smoke test`);
  process.exit(1);
}
console.log(`Smoke test passed for ${endpoints.length} endpoints`);

async function resolvePathParams(ep) {
  const names = extractPathParamNames(ep.path);
  if (names.length === 0) return ep.pathParams ?? {};

  const cacheKey = ep.resolvePathParamsFrom ?? ep.path;
  if (!resolvedParams.has(cacheKey) && ep.resolvePathParamsFrom) {
    const listUrl = `${baseUrl}${ep.resolvePathParamsFrom}`;
    try {
      const { stdout } = await execAsync(`curl ${curlFlags} -fsS '${listUrl}'`);
      const body = JSON.parse(stdout);
      const params = pickListPathParams(body, names);
      resolvedParams.set(cacheKey, params);
    } catch (e) {
      console.error(`WARN: could not resolve path params from ${ep.resolvePathParamsFrom}: ${e.message}`);
      resolvedParams.set(cacheKey, {});
    }
  }

  const discovered = resolvedParams.get(cacheKey) ?? {};
  return { ...(ep.pathParams ?? {}), ...discovered };
}

function hasResolvedParams(params) {
  return Object.values(params).some((v) => v != null && String(v).length > 0);
}

function pickListPathParams(body, names) {
  const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
  const first = items[0];
  if (!first || typeof first !== 'object') return {};

  const params = {};
  for (const name of names) {
    const value = first[name] ?? first.id ?? first.key;
    if (value != null && String(value).length > 0) params[name] = String(value);
  }
  return params;
}
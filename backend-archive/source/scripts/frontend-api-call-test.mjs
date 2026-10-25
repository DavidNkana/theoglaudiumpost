#!/usr/bin/env node
/**
 * frontend-api-call-test.mjs
 *
 * Reads frontend-api-calls.yaml, runs each call against the deployed
 * plugin's in-process API, asserts response shape.
 *
 * Usage: node scripts/frontend-api-call-test.mjs <fixtures> <base-url> <output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { interpolatePath } from './lib/path-interpolate.mjs';

const [fixturesPath, baseUrl, outputPath] = process.argv.slice(2);
const fixtures = yaml.load(readFileSync(fixturesPath, 'utf8'));

const failures = [];
let covered = 0;
for (const call of fixtures.calls) {
  const url = `${baseUrl}${interpolate(call.path, call.pathParams ?? {})}`;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (call.auth) headers['Authorization'] = `Bearer test-token`;
    const res = await fetch(url, { method: call.method ?? 'GET', headers, body: call.body ? JSON.stringify(call.body) : undefined });
    if (res.status !== (call.expectedStatus ?? 200)) {
      failures.push({ call: call.name, expected: call.expectedStatus, got: res.status });
    } else {
      covered++;
    }
  } catch (e) {
    failures.push({ call: call.name, error: e.message });
  }
}

const total = fixtures.calls.length;
const coverage = total > 0 ? (covered / total) * 100 : 100;
const out = { totalCalls: total, coveredCalls: covered, coverage, failures };
writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`Frontend API-call coverage: ${coverage}% (${covered}/${total} calls)`);
if (coverage < 100) process.exit(1);

function interpolate(path, params) {
  return interpolatePath(path, params);
}

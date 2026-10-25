#!/usr/bin/env node
/**
 * api-coverage-check.mjs
 *
 * Reads api.yaml + api-test-fixtures.yaml, asserts fixture-set ==
 * operation-set, executes every fixture with fetch(), writes a known
 * JSON contract. The pipeline gates on this JSON, not raw Schemathesis.
 *
 * Usage: node scripts/api-coverage-check.mjs <api.yaml> <fixtures.yaml> <base-url> <output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';

const [apiYamlPath, fixturesPath, baseUrl, outputPath] = process.argv.slice(2);

const apiYaml = yaml.load(readFileSync(apiYamlPath, 'utf8'));
const fixtures = yaml.load(readFileSync(fixturesPath, 'utf8'));

const apiOps = [];
for (const [path, pathItem] of Object.entries(apiYaml.paths ?? {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (pathItem[method]) {
      apiOps.push({
        operation: pathItem[method].operationId ?? `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
        method: method.toUpperCase(),
        path,
      });
    }
  }
}

const fixtureOps = fixtures.operations.map(o => o.operation);
const missing = apiOps.filter(o => !fixtureOps.includes(o.operation));
const extra = fixtureOps.filter(o => !apiOps.find(a => a.operation === o));
if (missing.length > 0) { console.error(`api.yaml operations missing from fixtures: ${missing.map(o => o.operation).join(', ')}`); process.exit(1); }
if (extra.length > 0) { console.error(`fixtures reference operations not in api.yaml: ${extra.join(', ')}`); process.exit(1); }

const failures = [];
for (const fixture of fixtures.operations) {
  // Substitute path params
  let url = baseUrl + fixture.path;
  for (const [k, v] of Object.entries(fixture.pathParams ?? {})) {
    url = url.replace(`{${k}}`, v).replace(`:${k}`, v);
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (fixture.auth) headers['Authorization'] = `Bearer test-token`;
    const res = await fetch(url, { method: fixture.method, headers, body: fixture.body ? JSON.stringify(fixture.body) : undefined });
    if (res.status !== fixture.expectedStatus) {
      failures.push({ operation: fixture.operation, expected: fixture.expectedStatus, got: res.status });
    }
  } catch (e) {
    failures.push({ operation: fixture.operation, error: e.message });
  }
}

const totalOperations = apiOps.length;
const coveredOperations = totalOperations - failures.length;
const coverage = (coveredOperations / totalOperations) * 100;

const out = { totalOperations, coveredOperations, coverage, failures };
writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`API coverage: ${coverage}% (${coveredOperations}/${totalOperations} operations)`);
if (coverage < 100) process.exit(1);

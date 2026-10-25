#!/usr/bin/env node
/**
 * frontend-route-coverage.mjs
 *
 * Reads the frontend router + frontend-route-coverage.yaml, runs Playwright
 * with the fixture data, asserts every route + auth case was attempted.
 *
 * Usage: node scripts/frontend-route-coverage.mjs <router> <fixtures> <base-url> <output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import yaml from 'js-yaml';
import { interpolatePath } from './lib/path-interpolate.mjs';

const execAsync = promisify(exec);
const [routerPath, fixturesPath, baseUrl, outputPath] = process.argv.slice(2);

const routerText = readFileSync(routerPath, 'utf8');
const fixtures = yaml.load(readFileSync(fixturesPath, 'utf8'));

const pathRe = /path:\s*['"]([^'"]+)['"]/g;
const routerRoutes = [];
let m;
while ((m = pathRe.exec(routerText)) !== null) routerRoutes.push(m[1]);

const fixtureRoutes = fixtures.routes.map(r => r.path);
const missing = routerRoutes.filter(p => !fixtureRoutes.includes(p));
const extra = fixtureRoutes.filter(p => !routerRoutes.includes(p));
if (missing.length > 0) { console.error(`router paths missing from fixtures: ${missing.join(', ')}`); process.exit(1); }
if (extra.length > 0) { console.error(`fixtures reference paths not in router: ${extra.join(', ')}`); process.exit(1); }

const spec = generateSpec(fixtures, baseUrl);
const specPath = outputPath.replace('.json', '.spec.ts');
writeFileSync(specPath, spec);

let result;
try {
  const { stdout } = await execAsync(`npx playwright test ${specPath} --reporter=json`);
  result = JSON.parse(stdout);
} catch (e) {
  console.error(`Playwright failed: ${e.message}`);
  process.exit(1);
}

const totalRoutes = routerRoutes.length;
const failures = result.failures ?? [];
const coveredRoutes = totalRoutes - failures.length;
const coverage = (coveredRoutes / totalRoutes) * 100;
const out = { totalRoutes, coveredRoutes, coverage, failures };
writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`Frontend URL coverage: ${coverage}% (${coveredRoutes}/${totalRoutes} routes)`);
if (coverage < 100) process.exit(1);

function generateSpec(fixtures, baseUrl) {
  const cases = [];
  for (const route of fixtures.routes) {
    for (const authCase of route.authCases) {
      const url = `${baseUrl}${interpolate(route.path, route.params)}`;
      cases.push(`
test('${route.path} — ${authCase.name}', async ({ page }) => {
  ${authCase.auth === 'anonymous' ? '' : `await page.context().addCookies([{ name: 'auth', value: 'test-user', domain: 'localhost' }]);`}
  const response = await page.goto('${url}');
  expect(response?.status()).toBe(${authCase.expectedStatus || 200});
  ${authCase.expectedRedirect ? `expect(page.url()).toContain('${authCase.expectedRedirect}');` : ''}
});
`);
    }
  }
  return `import { test, expect } from '@playwright/test';
${cases.join('\n')}
`;
}

function interpolate(path, params) {
  return interpolatePath(path, params);
}

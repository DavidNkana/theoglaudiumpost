#!/usr/bin/env node
/**
 * generate-route-tests.mjs
 *
 * Auto-generates a Playwright route test scaffold from the router config +
 * the fixture file.
 *
 * Usage: node scripts/generate-route-tests.mjs --router <path> --out <out>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
let routerPath, outPath;
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--router') routerPath = args[i + 1];
  if (args[i] === '--out') outPath = args[i + 1];
}

const routerText = readFileSync(routerPath, 'utf8');
const pathRe = /path:\s*['"]([^'"]+)['"]/g;
const routes = [];
let m;
while ((m = pathRe.exec(routerText)) !== null) {
  routes.push(m[1]);
}

const cases = routes.map(r => {
  return `
test('renders ${r}', async ({ page }) => {
  const response = await page.goto('${r}');
  expect(response?.status()).toBe(200);
});
`;
}).join('\n');

const spec = `import { test, expect } from '@playwright/test';
${cases}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, spec);
console.log(`Generated ${routes.length} route tests at ${outPath}`);

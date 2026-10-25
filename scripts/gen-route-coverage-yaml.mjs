#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';

const routerText = readFileSync('src/router/index.js', 'utf8');
const pathRe = /path:\s*['"]([^'"]+)['"]/g;
const routerRoutes = [];
let m;
while ((m = pathRe.exec(routerText)) !== null) routerRoutes.push(m[1]);

const authBlock = (text, index) => {
  const sliceStart = Math.max(0, index - 400);
  const sliceEnd = Math.min(text.length, index + 400);
  const block = text.slice(sliceStart, sliceEnd);
  return /requiresAuth:\s*true/.test(block) || /adminRoute:\s*true/.test(block);
};

const routes = routerRoutes.map((path, i) => {
  const idx = routerText.indexOf(`path: "${path}"`, 0);
  const needsAuth = authBlock(routerText, idx >= 0 ? idx : i * 10);
  const authCases = needsAuth
    ? [{ name: 'authenticated', auth: 'authenticated', expectedStatus: 200 }]
    : [{ name: 'anonymous', auth: 'anonymous', expectedStatus: 200 }];
  const entry = { path, authCases };
  if (path.includes(':')) {
    entry.params = Object.fromEntries(
      [...path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map(([, name]) => [name, 'sample']),
    );
  }
  return entry;
});

writeFileSync('frontend-route-coverage.yaml', yaml.dump({ routes }));
console.log(`Wrote ${routes.length} routes to frontend-route-coverage.yaml`);
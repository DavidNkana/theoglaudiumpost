#!/usr/bin/env node
/**
 * derive-frontend-routes.mjs
 *
 * Derives d18-smoke-test input from a Vue router module. Emits GET routes that
 * do not require authentication (no requiresAuth / adminOnly / requiresManageTeam).
 *
 * Usage: node scripts/derive-frontend-routes.mjs <router.ts> <output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [routerPath, outputPath] = process.argv.slice(2);
if (!routerPath || !outputPath) {
  console.error('Usage: node scripts/derive-frontend-routes.mjs <router.ts> <output.json>');
  process.exit(1);
}

const text = readFileSync(routerPath, 'utf8');
const routes = [];
const pathRe = /path:\s*['"](\/[^'"]*)['"]/g;
let match;
while ((match = pathRe.exec(text)) !== null) {
  const path = match[1];
  const blockStart = text.lastIndexOf('\n  {', match.index);
  const sliceStart = blockStart >= 0 ? blockStart : text.lastIndexOf('{', match.index);
  const blockEnd = text.indexOf('\n  },', match.index);
  const block = text.slice(sliceStart, blockEnd > sliceStart ? blockEnd : match.index + 200);
  if (/requiresAuth:\s*true/.test(block)) continue;
  if (/adminOnly:\s*true/.test(block)) continue;
  if (/requiresManageTeam:\s*true/.test(block)) continue;
  routes.push({ method: 'GET', path });
}

const unique = [...new Map(routes.map((r) => [r.path, r])).values()];
if (unique.length === 0) {
  console.error('derive-frontend-routes: no public routes found in router');
  process.exit(1);
}

writeFileSync(outputPath, JSON.stringify(unique, null, 2));
console.log(`Wrote ${unique.length} smoke routes to ${outputPath}`);
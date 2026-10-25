/**
 * LCP #712 Route & Env Guard - Focused Static Validation
 *
 * Playwright test that reads source files directly (fs/path) to validate
 * router and environment corrections from Handre's LCP #712 code review.
 *
 * Run with: npm run test -- --grep LCP712
 *
 * This test does NOT require a running backend or production server.
 * It performs static source code analysis only.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// PROJECT_ROOT = current working directory (project root where package.json lives)
// Tests are run from "Laudium Biz" directory, so process.cwd() = project root
const PROJECT_ROOT = process.cwd();
const EXPECTED_LAUDIUM_API_BASE = 'https://laudiumpost.co.za/laudium/api/v1/';
const EXPECTED_AUTH_ENDPOINT = `${EXPECTED_LAUDIUM_API_BASE}auth/login`;
const LEGACY_LAUDIUMBIZ_API_BASE = 'https://server.safai.co.za/Laudiumbiz/api/v1/';

function readFile(filePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

test.describe('LCP #712 Route & Environment Guard Corrections', () => {
  test('LCP712: /admin/prompts route redirects to /admin/articles/prompts', async () => {
    const routerCode = readFile('src/router/index.js');
    // The redirect route definition: path: '/admin/prompts', redirect: '/admin/articles/prompts'
    expect(routerCode).toMatch(/path:\s*['"]\/admin\/prompts['"]\s*,?\s*redirect:\s*['"]\/admin\/articles\/prompts['"]/);
  });

  test('LCP712: /admin/articles/prompts route (ManagePrompts) still exists', async () => {
    const routerCode = readFile('src/router/index.js');
    // The ManagePrompts route is a child of /admin/articles with path: 'prompts'
    expect(routerCode).toMatch(/name:\s*['"]ManagePrompts['"]/);
    expect(routerCode).toMatch(/path:\s*['"]prompts['"]/);
  });

  test('LCP712: /admin localStorage clearing gated by !isAuthenticated', async () => {
    const routerCode = readFile('src/router/index.js');
    // The /admin guard only clears localStorage when NOT authenticated:
    // if ((to.path === "/admin" || to.path === "/admin/")) { if (!isAuthenticated) { localStorage.removeItem... } }
    // This preserves valid auth sessions when navigating directly to /admin
    const adminGuardPattern = /if\s*\(\s*\(\s*to\.path\s*===\s*["']\/admin["']\s*\|\|\s*to\.path\s*===\s*["']\/admin\/["']\s*\)\)\s*\{[\s\S]*?if\s*\(\s*!\s*isAuthenticated\s*\)/;
    expect(routerCode).toMatch(adminGuardPattern);
  });

  test('LCP712: /admin/login has publicRoute:true meta (auth-preserving)', async () => {
    const routerCode = readFile('src/router/index.js');
    expect(routerCode).toMatch(/path:\s*['"]\/admin\/login['"]\s*,/);
    expect(routerCode).toMatch(/meta:\s*\{[^}]*publicRoute:\s*true[^}]*\}/);
  });

  test('LCP712: Uses import.meta.env.MODE (not process.env.NODE_ENV)', async () => {
    const mainJsCode = readFile('src/main.js');
    // Sentry enabled check uses Vite import.meta.env.MODE
    expect(mainJsCode).toMatch(/import\.meta\.env\.MODE/);
    // No process.env.NODE_ENV references should remain
    expect(mainJsCode).not.toMatch(/process\.env\.NODE_ENV/);
  });

  test('LCP712: admin auth API base resolves to Laudium Post API, not legacy Laudiumbiz API', async () => {
    const apiConfigCode = readFile('src/config/api.js');
    const apiClientCode = readFile('src/services/api.js');
    const authComposableCode = readFile('src/composables/useAuth.js');
    const envCode = readFile('.env');
    const runtimeConfig = `${apiConfigCode}\n${envCode}`;

    expect(apiConfigCode).toContain(`export const API_BASE_URL = "${EXPECTED_LAUDIUM_API_BASE}"`);
    expect(envCode).toContain(`VITE_DEV_API_BASE_URL=${EXPECTED_LAUDIUM_API_BASE}`);
    expect(envCode).toContain(`VITE_TEST_API_BASE_URL=${EXPECTED_LAUDIUM_API_BASE}`);
    expect(envCode).toContain(`VITE_PROD_API_BASE_URL=${EXPECTED_LAUDIUM_API_BASE}`);
    expect(runtimeConfig).not.toContain(LEGACY_LAUDIUMBIZ_API_BASE);
    expect(apiClientCode).toMatch(/baseURL:\s*API_URL/);
    expect(authComposableCode).toContain('apiClient.post("/auth/login"');
    expect(EXPECTED_AUTH_ENDPOINT).toBe('https://laudiumpost.co.za/laudium/api/v1/auth/login');
  });

  test('LCP712: Production domains https://laudiumpost.co.za and https://www.laudiumpost.co.za remain allowed', async () => {
    const mainJsCode = readFile('src/main.js');
    expect(mainJsCode).toContain('https://laudiumpost.co.za');
    expect(mainJsCode).toContain('https://www.laudiumpost.co.za');
  });

  test('LCP712: localhost origins require import.meta.env.MODE === \'development\'', async () => {
    const mainJsCode = readFile('src/main.js');
    // isDevOrigin gate: localhost AND MODE === 'development'
    const localhostGate = /isDevOrigin[\s\S]{0,200}localhost.*&&[\s\S]{0,50}import\.meta\.env\.MODE.*development|import\.meta\.env\.MODE.*development[\s\S]{0,50}localhost.*&&[\s\S]{0,50}isDevOrigin/;
    expect(mainJsCode).toMatch(/localhost/);
    expect(mainJsCode).toMatch(/import\.meta\.env\.MODE.*development/);
    expect(mainJsCode).toMatch(localhostGate);
  });

  test('LCP712: OneSignal initialization gated on isAllowedDomain', async () => {
    const mainJsCode = readFile('src/main.js');
    // OneSignal wrapped in: if (isAllowedDomain) { app.use(OneSignalVuePlugin, ...) }
    expect(mainJsCode).toMatch(/if\s*\(\s*isAllowedDomain\s*\)/);
  });
});
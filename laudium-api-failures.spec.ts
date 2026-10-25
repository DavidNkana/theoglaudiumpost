/**
 * LCP #692: E2E Test - Laudium Public API Failures
 *
 * User Story: When a visitor opens the Laudium Post news homepage,
 * they see the latest articles loaded correctly without a 403 error,
 * and ad placements render in the correct positions without a 500 server error.
 *
 * Run with: npx playwright test laudium-api-failures.spec.ts
 *
 * Prerequisites:
 * - Backend must be running at BASE_URL (default: http://localhost:9011)
 * - Database must have test articles and ads data
 */

import { test, expect, request } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:9011';
const API_BASE = `${BASE_URL}/laudium/api/v1`;

test.describe('LCP #692: Laudium Public API Failures', () => {

  test('POST /api/v1/articles should return 200 (not 403)', async () => {
    const ctx = await request.newContext();
    const response = await ctx.post(`${API_BASE}/articles`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        page: 0,
        size: 10,
        status: ''
      })
    });

    // Bug #1: 403 Forbidden on POST /api/v1/articles
    expect(response.status(), 'POST /articles should return 200, not 403').toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('articles');
    expect(Array.isArray(body.articles)).toBe(true);

    await ctx.dispose();
  });

  test('POST /api/v1/articles/feed should return 200 (not 403)', async () => {
    const ctx = await request.newContext();
    const response = await ctx.post(`${API_BASE}/articles/feed`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        page: 0,
        size: 10,
        status: ''
      })
    });

    expect(response.status(), 'POST /articles/feed should return 200, not 403').toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('feed');
    expect(Array.isArray(body.feed)).toBe(true);

    await ctx.dispose();
  });

  test('GET /api/v1/ads/placement/main_page_ad/all should return 200 (not 500)', async () => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${API_BASE}/ads/placement/main_page_ad/all`);

    // Bug #2: 500 HikariPool timeout on GET /ads/placement/*/all
    expect(response.status(), 'GET /ads/placement/main_page_ad/all should return 200, not 500').toBe(200);

    const body = await response.json();
    expect(Array.isArray(body), 'Ads response should be a JSON array').toBe(true);

    await ctx.dispose();
  });

  test('GET /ads/placement/sidebar/all should return 200', async () => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${API_BASE}/ads/placement/sidebar/all`);

    expect(response.status(), 'GET /ads/placement/sidebar/all should return 200').toBe(200);

    const body = await response.json();
    expect(Array.isArray(body), 'Ads response should be a JSON array').toBe(true);

    await ctx.dispose();
  });

  test('Protected endpoint /api/v1/articles/create should still require auth', async () => {
    const ctx = await request.newContext();
    const response = await ctx.post(`${API_BASE}/articles/create`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        title: 'Unauthorized Test',
        content: 'Should not succeed without auth'
      })
    });

    // Should be 401 or 403, NOT 200 (protected endpoint must remain protected)
    expect(
      [401, 403],
      'POST /articles/create without auth should return 401 or 403'
    ).toContain(response.status());

    await ctx.dispose();
  });

  test('Protected endpoint /api/v1/admin/** should require admin role', async () => {
    const ctx = await request.newContext();
    // Test a representative admin endpoint without auth
    const response = await ctx.get(`${API_BASE}/admin/articles`);

    // Should be 401 or 403, NOT 200 (admin endpoints must remain protected)
    expect(
      [401, 403],
      'GET /admin/articles without auth should return 401 or 403'
    ).toContain(response.status());

    await ctx.dispose();
  });

  test('Concurrent article requests should not produce HikariPool timeout', async () => {
    const ctx = await request.newContext();

    // 10 concurrent requests (old pool of 3 would timeout)
    const promises = Array.from({ length: 10 }, () =>
      ctx.post(`${API_BASE}/articles`, {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ page: 0, size: 5, status: '' })
      })
    );

    const responses = await Promise.all(promises);

    const statuses = responses.map(r => r.status());
    const all200 = statuses.every(s => s === 200);

    expect(
      all200,
      `All 10 concurrent requests should return 200. Got: ${statuses.join(', ')}`
    ).toBe(true);

    await ctx.dispose();
  });

  test('20 sequential ads requests should all succeed (no connection leak)', async () => {
    const ctx = await request.newContext();
    const errors: string[] = [];

    for (let i = 0; i < 20; i++) {
      const r = await ctx.get(`${API_BASE}/ads/placement/main_page_ad/all`);
      if (r.status() !== 200) {
        errors.push(`Request ${i}: HTTP ${r.status()}`);
      }
    }

    expect(
      errors.length === 0,
      `All 20 requests should succeed. Failures: ${errors.join('; ')}`
    ).toBe(true);

    await ctx.dispose();
  });
});

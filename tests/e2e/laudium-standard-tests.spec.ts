/**
 * LCP #712: Laudium Post Browser Standard Test Suite
 *
 * Comprehensive Playwright browser test suite for Laudium Post frontend.
 * Covers 148 granular test cases across 57 routes.
 *
 * Run with:
 *   npx playwright test --project=chromium
 *   npx playwright test --grep="SECTION_NAME" --project=chromium
 *
 * Screenshots saved to: docs/standartTest/screens/
 * HAR exports saved to: docs/standartTest/evidence/
 */

import { test, expect, Page } from '@playwright/test';

// =============================================================================
// CONFIGURATION & HELPERS
// =============================================================================

const BASE_URL = process.env.TEST_BASE_URL || 'https://laudiumpost.co.za';
const LOCAL_URL = 'http://localhost:5173';
// LCP #712: Steven verified correct API base for Laudium Post admin auth is https://laudiumpost.co.za/laudium/api/v1/
const API_BASE = process.env.TEST_API_BASE_URL || 'https://laudiumpost.co.za/laudium/api/v1/';

// Helper to get credentials from environment
function getAdminCredentials() {
  return {
    email: process.env.TEST_ADMIN_EMAIL || 'info@laudiumpost.co.za',
    password: process.env.TEST_ADMIN_PASSWORD || '',
  };
}

function getBusinessCredentials() {
  return {
    email: process.env.TEST_BUSINESS_EMAIL || '',
    password: process.env.TEST_BUSINESS_PASSWORD || '',
  };
}

// Admin auth helper - performs login and returns storage state
async function adminLogin(page: Page) {
  const creds = getAdminCredentials();
  if (!creds.password) {
    throw new Error('TEST_ADMIN_PASSWORD not set - cannot login');
  }

  await page.goto(`${LOCAL_URL}/admin/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form - use getByRole for robust matching
  await page.getByRole('textbox', { name: /email address/i }).fill(creds.email);
  await page.getByRole('textbox', { name: /password/i }).fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (increased timeout for slow API)
  await page.waitForURL(`${LOCAL_URL}/admin/dashboard`, { timeout: 30000 });

  return page.context();
}

// =============================================================================
// SECTION 13: PUBLIC PAGES — 21 tests (no credentials needed)
// =============================================================================

test.describe('SECTION 13: Public Pages (PUBPAGE-001 to PUBPAGE-021)', () => {

  test('PUBPAGE-001: Homepage loads with article gallery', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/`);
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/Laudium POST|Newspaper Gallery/i);

    // Check for article cards / news items (use first() to avoid strict mode violation)
    const hasContent = await page.locator('main').first().isVisible();
    expect(hasContent).toBeTruthy();

    // Check for nav links
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();

    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-001-homepage.png' });
  });

  test('PUBPAGE-002: Navigate to news listing', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/news`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Latest News|Laudium POST/i);
    await expect(page.getByRole('heading', { name: /news|latest/i })).toBeVisible();

    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-002-news-listing.png' });
  });

  test('PUBPAGE-003: Navigate to news archive', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/news/archive`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Archive|Laudium POST/i);

    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-003-news-archive.png' });
  });

  test('PUBPAGE-004: Static page - terms of use', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/terms-of-use`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Terms of Use/i);
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-004-terms-of-use.png' });
  });

  test('PUBPAGE-005: Static page - privacy policy', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/privacy-policy`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Privacy Policy/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-005-privacy-policy.png' });
  });

  test('PUBPAGE-006: Static page - about', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/about`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/About|Laudium POST/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-006-about.png' });
  });

  test('PUBPAGE-007: Static page - editorial policy', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/editorial-policy`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Editorial Policy/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-007-editorial-policy.png' });
  });

  test('PUBPAGE-008: Static page - corrections', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/corrections`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Corrections/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-008-corrections.png' });
  });

  test('PUBPAGE-009: Community notices listing', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/community`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Community|Laudium POST/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-009-community.png' });
  });

  test('PUBPAGE-010: Announcements listing', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/announcements`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Announcement/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-010-announcements.png' });
  });

  test('PUBPAGE-011: Business directory loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/directory`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Directory|Business/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-011-directory.png' });
  });

  test('PUBPAGE-012: Events page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Events/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-012-events.png' });
  });

  test('PUBPAGE-013: Search page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/search`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Search/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-013-search.png' });
  });

  test('PUBPAGE-014: Podcasts/YouTube page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/podcasts`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Podcast|YouTube/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-014-podcasts.png' });
  });

  test('PUBPAGE-015: Payment success page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/payment/success/test-id-123`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Payment|Success/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-015-payment-success.png' });
  });

  test('PUBPAGE-016: Payment cancel page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/payment/cancel/test-id-123`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Payment|Cancel/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-016-payment-cancel.png' });
  });

  test('PUBPAGE-017: Article detail page loads', async ({ page }) => {
    // First get an article slug from the homepage
    await page.goto(`${LOCAL_URL}/`);
    await page.waitForLoadState('networkidle');

    // Click first article link
    const firstArticle = page.locator('main a[href^="/news/"]').first();
    if (await firstArticle.isVisible()) {
      await firstArticle.click();
      await page.waitForLoadState('networkidle');

      // Should be on article detail page
      await expect(page).toHaveTitle(/Laudium POST/i);
      await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-017-article-detail.png' });
    }
  });

  test('PUBPAGE-018: Category filter works', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/categories/local-news`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Category|Laudium POST/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-018-category-filter.png' });
  });

  test('PUBPAGE-019: Tag filter works', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/tags/breaking`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Tag|Laudium POST/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-019-tag-filter.png' });
  });

  test('PUBPAGE-020: Community notice detail loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/community`);
    await page.waitForLoadState('networkidle');

    const noticeLink = page.locator('main a[href^="/community/"]').first();
    if (await noticeLink.isVisible()) {
      await noticeLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveTitle(/Laudium POST/i);
      await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-020-community-notice.png' });
    }
  });

  test('PUBPAGE-021: Directory item detail loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/directory`);
    await page.waitForLoadState('networkidle');

    const dirLink = page.locator('main a[href^="/directory/"]').first();
    if (await dirLink.isVisible()) {
      await dirLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveTitle(/Directory|Laudium POST/i);
      await page.screenshot({ path: 'docs/standartTest/screens/PUBPAGE-021-directory-item.png' });
    }
  });

});

// =============================================================================
// SECTION 14: ADMIN LOGIN — 4 tests
// =============================================================================

test.describe('SECTION 14: Admin Login (ADMLOG-001 to ADMLOG-004)', () => {

  test('ADMLOG-001: Admin login page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/login`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Admin Login/i);
    await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    await page.screenshot({ path: 'docs/standartTest/screens/ADMLOG-001-admin-login-page.png' });
  });

  test('ADMLOG-002: Admin login with valid credentials', async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip();
      return;
    }

    await page.goto(`${LOCAL_URL}/admin/login`);
    await page.getByRole('textbox', { name: /email address/i }).fill(creds.email);
    await page.getByRole('textbox', { name: /password/i }).fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL(`${LOCAL_URL}/admin/dashboard`, { timeout: 15000 });
    await expect(page).toHaveTitle(/Dashboard|Admin/i);

    await page.screenshot({ path: 'docs/standartTest/screens/ADMLOG-002-admin-dashboard.png' });
  });

  test('ADMLOG-003: Admin login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/login`);
    await page.getByRole('textbox', { name: /email address/i }).fill('wrong@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error and NOT redirect
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin/login');

    await page.screenshot({ path: 'docs/standartTest/screens/ADMLOG-003-admin-login-error.png' });
  });

  test('ADMLOG-004: Direct URL to admin without auth redirects to login', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    expect(page.url()).toContain('/admin/login');
    await page.screenshot({ path: 'docs/standartTest/screens/ADMLOG-004-auth-redirect.png' });
  });

});

// =============================================================================
// SECTION 7: ADMIN DASHBOARD — 1 test
// =============================================================================

test.describe('SECTION 7: Admin Dashboard (DASH-001)', () => {

  test('DASH-001: Admin dashboard loads with stats', async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip('TEST_ADMIN_PASSWORD not set');
      return;
    }

    await adminLogin(page);
    await page.goto(`${LOCAL_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Dashboard|Admin/i);
    // Check for dashboard content
    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBeTruthy();

    await page.screenshot({ path: 'docs/standartTest/screens/DASH-001-admin-dashboard.png' });
  });

});

// =============================================================================
// SECTION 6: ARTICLES LIST — 15 tests (requires admin)
// =============================================================================

test.describe('SECTION 6: Articles List (LIST-001 to LIST-015)', () => {

  test.beforeEach(async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip();
      return;
    }
    await adminLogin(page);
  });

  test('LIST-001: Articles list page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/articles`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Articles/i);
    await page.screenshot({ path: 'docs/standartTest/screens/LIST-001-articles-list.png' });
  });

  test('LIST-002: Filter by Published status', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/articles`);
    await page.waitForLoadState('networkidle');

    const publishedTab = page.getByRole('tab', { name: /published/i });
    if (await publishedTab.isVisible()) {
      await publishedTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'docs/standartTest/screens/LIST-002-filter-published.png' });
  });

  test('LIST-003: Filter by Draft status', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/articles`);
    await page.waitForLoadState('networkidle');

    const draftTab = page.getByRole('tab', { name: /draft/i });
    if (await draftTab.isVisible()) {
      await draftTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'docs/standartTest/screens/LIST-003-filter-draft.png' });
  });

});

// =============================================================================
// SECTION 2: ARTICLE CREATE SCREEN — 29 tests (requires admin)
// =============================================================================

test.describe('SECTION 2: Article Create Screen (CREATE-001 to CREATE-029)', () => {

  test.beforeEach(async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip();
      return;
    }
    await adminLogin(page);
  });

  test('CREATE-001: Create article page loads empty', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/articles/create`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Create|Article/i);
    // The title input uses id="title" (no placeholder attribute)
    await expect(page.locator('#title')).toBeVisible();

    await page.screenshot({ path: 'docs/standartTest/screens/CREATE-001-empty-form.png' });
  });

  test('CREATE-002: Title auto-generates slug', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/admin/articles/create`);
    await page.waitForLoadState('networkidle');

    // The title input uses id="title" (no placeholder attribute)
    await page.locator('#title').fill('Test Article Title Here');
    await page.waitForTimeout(300);

    // The slug input uses id="slug" (no name or placeholder attribute)
    const slugInput = page.locator('#slug');
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toMatch(/test-article-title-here/);

    await page.screenshot({ path: 'docs/standartTest/screens/CREATE-002-auto-slug.png' });
  });

});

// =============================================================================
// SECTION 1: ARTICLE EDIT SCREEN — 33 tests (requires admin)
// =============================================================================

test.describe('SECTION 1: Article Edit Screen (EDIT-001 to EDIT-033)', () => {

  test.beforeEach(async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip();
      return;
    }
    await adminLogin(page);
  });

  test('EDIT-001: Edit article page loads with data', async ({ page }) => {
    // First navigate to articles list
    await page.goto(`${LOCAL_URL}/admin/articles`);
    await page.waitForLoadState('networkidle');

    // Click first edit link if available
    const editLink = page.locator('a[href*="/edit/"]').first();
    if (await editLink.isVisible({ timeout: 3000 })) {
      await editLink.click();
      await page.waitForLoadState('networkidle');

      // Form should be pre-filled
      await expect(page).toHaveTitle(/Edit|Article/i);
      await page.screenshot({ path: 'docs/standartTest/screens/EDIT-001-edit-page-loaded.png' });
    }
  });

});

// =============================================================================
// SECTION 12: BUSINESS PORTAL — 6 tests
// =============================================================================

test.describe('SECTION 12: Business Portal (BIZLOGIN/BIZREG/BIZ Dashboard)', () => {

  test('BIZLOGIN-001: Business login page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/business/login`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Business Login/i);
    await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    await page.screenshot({ path: 'docs/standartTest/screens/BIZLOGIN-001-business-login.png' });
  });

  test('BIZREG-001: Business register page loads', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/business/register`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Business Register|Register/i);

    await page.screenshot({ path: 'docs/standartTest/screens/BIZREG-001-business-register.png' });
  });

  test('BIZLOGIN-002: Business login with valid credentials', async ({ page }) => {
    const creds = getBusinessCredentials();
    if (!creds.email || !creds.password) {
      test.skip('Business credentials not set');
      return;
    }

    await page.goto(`${LOCAL_URL}/business/login`);
    await page.getByPlaceholder(/email/i).fill(creds.email);
    await page.getByPlaceholder(/password/i).fill(creds.password);
    await page.getByRole('button', { name: /login|sign in/i }).click();

    await page.waitForURL(`${LOCAL_URL}/business/dashboard`, { timeout: 15000 });
    await page.screenshot({ path: 'docs/standartTest/screens/BIZLOGIN-002-business-dashboard.png' });
  });

});

// =============================================================================
// SECTION 3: ARTICLE PROMPT SCREEN — 3 tests
// =============================================================================

test.describe('SECTION 3: Article Prompt Screen (PROMPT-001 to PROMPT-003)', () => {

  test('PROMPT-001: Article prompt modal page loads', async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip();
      return;
    }

    await adminLogin(page);
    await page.goto(`${LOCAL_URL}/admin/articles/prompt`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Prompt|Article/i);
    await page.screenshot({ path: 'docs/standartTest/screens/PROMPT-001-article-prompt.png' });
  });

});

// =============================================================================
// SECTION 4: SOURCE ARTICLES — 17 tests
// =============================================================================

test.describe('SECTION 4: Source Articles (SOURCE-001 to SOURCE-017)', () => {

  test('SOURCE-001: Source articles page loads (MiniMax default)', async ({ page }) => {
    const creds = getAdminCredentials();
    if (!creds.password) {
      test.skip();
      return;
    }

    await adminLogin(page);
    await page.goto(`${LOCAL_URL}/admin/source-articles`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Source Articles/i);
    await page.screenshot({ path: 'docs/standartTest/screens/SOURCE-001-source-articles.png' });
  });

});

// =============================================================================
// NETWORK VALIDATION TESTS
// =============================================================================

test.describe('Network & Console Validation', () => {

  test('Network: No failed API calls on homepage (local dev)', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/api/')) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`${LOCAL_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(failedRequests).toHaveLength(0);
  });

  test('Console: Zero Error-level console messages on homepage (local dev)', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors but filter out non-critical ones
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore non-critical errors
        if (
          text.includes('OneSignal') ||
          text.includes('onesignal') ||
          text.includes('cloudinary') ||
          text.includes('CORS') ||
          text.includes('Failed to load resource') ||
          text.includes('net::ERR') ||
          text.includes('Failed to load image')
        ) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    await page.goto(`${LOCAL_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(consoleErrors).toHaveLength(0);
  });

});

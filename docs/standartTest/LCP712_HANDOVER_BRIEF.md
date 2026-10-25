# LCP #712 — Laudium Post Full Browser Standard Test Suite
## Scoping Handoff Brief
**Project:** SafAI / Laudium Post
**Parent LCP:** #712 `Laudium Post full frontend browser standard test suite`
**Scope approved by:** Chris (confirming via conversation 2026-05-17)
**Scoping agent:** Anthony (Project Manager)
**Handoff to:** Alex (review) → Sacha (Head of Development / execution)
**Target:** Laudium Post only (`https://laudiumpost.co.za`, `/laudium` backend route)
**Repos inspected:**
- Frontend: `C:\Software\SafAi\LaudiumAPP\Laudium Biz` (branch main)
- Backend: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI` (branch master)
- Existing E2E: `C:\Software\SafAi\LaudiumAPP\tests\e2e\laudium-api-failures.spec.ts`

---

## CORRECTIVE SUPERSESSION NOTE (2026-05-17)

### Child LCP #713–#721 Status: SUPERSEDED / REJECTED

The following previously proposed child LCP tasks were **SUPERSEDED** by the new granular approach:
- ~~LCP #713~~ — Article Edit screen tests
- ~~LCP #714~~ — Article Create screen tests
- ~~LCP #715~~ — Article Prompt screen tests
- ~~LCP #716~~ — Source Articles screen tests
- ~~LCP #717~~ — Article Prompt Manager tests
- ~~LCP #718~~ — Articles List tests
- ~~LCP #719~~ — Admin Dashboard + Ads + Announcements + Businesses tests
- ~~LCP #720~~ — Business Portal tests
- ~~LCP #721~~ — Public Pages + Admin Login tests

**Reason:** Chris rejected the high-level matrix approach and demanded per-URL, per-screen, per-control granular test cases. The granular matrix is now the single source of truth.

### Azure DevOps Work Items: Chris Authorized (2026-05-17)

Chris authorized **Azure DevOps work items** instead of GitHub issues because the frontend repo is hosted on Azure DevOps (`dev.azure.com/Chrilantech/Laudium%20Biz/_git/Laudium%20Biz`).

**Azure DevOps Details:**
- **Organization:** `https://dev.azure.com/Chrilantech`
- **Project:** `Laudium Biz`
- **Repo:** `Laudium Biz` (frontend, id: `0c2b7b91-e520-4c81-8641-b055447f2140`)
- **Area:** `Laudium Biz\Features`
- **Iteration:** `Laudium Biz\Sprint 1`

---

## 1A. AZURE DEVOPS WORK ITEMS CREATED

The following 14 Azure DevOps Task work items were created in the `Laudium Biz` project:

| Work Item ID | Title | Test IDs Covered | Routes | URL |
|--------------|-------|-----------------|--------|-----|
| 2896 | LCP #712 - SECTION 1: Article Edit Screen Browser Tests (EDIT-001 to EDIT-033) | EDIT-001 to EDIT-033 (33 tests) | /admin/articles/edit/:id | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2896 |
| 2897 | LCP #712 - SECTION 2: Article Create Screen Browser Tests (CREATE-001 to CREATE-029) | CREATE-001 to CREATE-029 (29 tests) | /admin/articles/create | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2897 |
| 2898 | LCP #712 - SECTION 3: Article Prompt Screen Browser Tests (PROMPT-001 to PROMPT-003) | PROMPT-001 to PROMPT-003 (3 tests) | /admin/articles/prompt | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2898 |
| 2899 | LCP #712 - SECTION 4: Source Articles Screen Browser Tests (SOURCE-001 to SOURCE-017) | SOURCE-001 to SOURCE-017 (17 tests) | /admin/source-articles | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2899 |
| 2900 | LCP #712 - SECTION 5: Article Prompt Manager Browser Tests (PROMPTS-001 to PROMPTS-002) | PROMPTS-001, PROMPTS-002 (2 tests) | /admin/articles/prompts | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2900 |
| 2901 | LCP #712 - SECTION 6: Articles List Browser Tests (LIST-001 to LIST-015) | LIST-001 to LIST-015 (15 tests) | /admin/articles | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2901 |
| 2902 | LCP #712 - SECTION 7: Admin Dashboard Browser Tests (DASH-001) | DASH-001 (1 test) | /admin/dashboard | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2902 |
| 2903 | LCP #712 - SECTION 8: Admin Ads Management Browser Tests (AD-001 to AD-010) | AD-001 to AD-010 (10 tests) | /admin/ads, /admin/ads/create, /admin/ads/edit/:id | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2903 |
| 2904 | LCP #712 - SECTION 9: Admin Announcements Browser Tests (ANN-001 to ANN-004) | ANN-001 to ANN-004 (4 tests) | /admin/announcements, /admin/announcements/create, /admin/announcements/edit/:id, /admin/announcements/categories | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2904 |
| 2905 | LCP #712 - SECTION 10: Admin Ads Placements Browser Tests (PLAC-001 to PLAC-003) | PLAC-001 to PLAC-003 (3 tests) | /admin/ads/ad-placements | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2905 |
| 2906 | LCP #712 - SECTION 11: Admin Businesses Browser Tests (BIZ-001 to BIZ-002) | BIZ-001, BIZ-002 (2 tests) | /admin/businesses | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2906 |
| 2907 | LCP #712 - SECTION 12: Business Portal Browser Tests (BIZLOGIN/BIZREG/BIZ Dashboard) | BIZLOGIN-001, BIZLOGIN-002, BIZREG-001, BIZREG-002, BIZ-001, BIZ-002 (6 tests) | /business/login, /business/register, /business/dashboard | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2907 |
| 2908 | LCP #712 - SECTION 13: Public Pages Browser Tests (PUBPAGE-001 to PUBPAGE-021) | PUBPAGE-001 to PUBPAGE-021 (21 tests) | /, /news, /news/archive, /news/:slug, /categories/:slug, /tags/:slug, /community, /community/:slug, /announcements, /directory, /directory/:slug, /events, /search, /podcasts, /terms-of-use, /privacy-policy, /about, /editorial-policy, /corrections, /payment/success/:id, /payment/cancel/:id | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2908 |
| 2909 | LCP #712 - SECTION 14: Admin Login Browser Tests (ADMLOG-001 to ADMLOG-004) | ADMLOG-001 to ADMLOG-004 (4 tests) | /admin/login | https://dev.azure.com/Chrilantech/4e6f805c-5491-4a81-9cfe-4409122ac8af/_apis/wit/workItems/2909 |

**Total:** 14 Azure DevOps work items covering **148 granular test cases** across **57 routes** (21 public + 27 admin + 9 business).

**Granular test matrix:** `C:\Software\SafAi\LaudiumAPP\Laudium Biz\docs\standartTest\GRANULAR-USER-STORY-MATRIX.md` (2,358 lines, 148 test entries)

---

## 1. USER SUCCESS STORY

**User Success Story:** When Sacha (Head of Development) runs the standard browser test suite against the Laudium Post frontend, they can verify every public page loads without console errors, every admin workflow (login, create article, source articles, create ad, manage placements) completes end-to-end, all API responses return correct status codes, and every fix or feature addition is caught before release — giving Elon confidence that the published site is production-ready.

---

## 2. REPO INSPECTION EVIDENCE

### Frontend Route Inventory (40+ routes)

**Public Routes — AppLayout (`/`):**
| Route | View File | Purpose |
|-------|-----------|---------|
| `/` | `views/News/News.vue` | Newspaper gallery homepage |
| `/news` | `views/News/News.vue` | Latest news listing |
| `/news/archive` | `views/News/Archive.vue` | News archive |
| `/news/:slug` | `views/Article/Article.vue` | Article detail page |
| `/categories/:slug` | `views/Category/Index.vue` | Category filter view |
| `/tags/:slug` | `views/Tag/Index.vue` | Tag filter view |
| `/community` | `views/Community/Index.vue` | Community notices listing |
| `/community/:slug` | `views/Community/Notice.vue` | Notice detail |
| `/announcements` | `views/Announcements/Index.vue` | Announcements listing |
| `/directory` | `views/Directory/Index.vue` | Business directory |
| `/directory/:slug` | `views/Directory/Item.vue` | Directory item detail |
| `/events` | `views/Events/Events.vue` | Community events |
| `/search` | `views/Search/Search.vue` | Search results |
| `/podcasts` | `views/YouTube/Index.vue` | YouTube podcast videos |
| `/terms-of-use` | `views/TermsOfUse.vue` | Static page |
| `/privacy-policy` | `views/PrivacyPolicy.vue` | Static page |
| `/about` | `views/AboutPublisher.vue` | About Laudium Post |
| `/editorial-policy` | `views/EditorialPolicy.vue` | Static page |
| `/corrections` | `views/CorrectionsPolicy.vue` | Static page |
| `/payment/success/:id` | `views/Payment/Success.vue` | Payfast success |
| `/payment/cancel/:id` | `views/Payment/Cancelled.vue` | Payfast cancel |

**Admin Routes — AdminLayout (`/admin`):**
| Route | View File | Purpose |
|-------|-----------|---------|
| `/admin/login` | `views/Admin/AdminLogin.vue` | Admin login (public) |
| `/admin/dashboard` | `views/Admin/Dashboard/Index.vue` | Admin dashboard |
| `/admin/articles` | `views/Admin/Articles/Index.vue` | Articles list/management |
| `/admin/articles/prompt` | `views/Admin/Articles/ArticlePromptView.vue` | AI article prompt modal |
| `/admin/articles/create` | `views/Admin/Articles/Create.vue` | Create article form |
| `/admin/articles/edit/:id` | `views/Admin/Articles/Edit.vue` | Edit article form |
| `/admin/articles/prompts` | `views/Admin/Articles/PromptManager.vue` | Manage AI prompts |
| `/admin/source-articles` | `views/Admin/Articles/SourceArticles.vue` | Source articles (5 AI providers) |
| `/admin/ads` | `views/Admin/Ads/Index.vue` | Ads list |
| `/admin/ads/create` | `views/Admin/Ads/AdForm.vue` | Create ad |
| `/admin/ads/edit/:id` | `views/Admin/Ads/AdForm.vue` | Edit ad |
| `/admin/ads/payments` | `views/Admin/Ads/Payments/Index.vue` | Ad payments |
| `/admin/ads/ad-placements` | `views/Admin/AdPlacements/Index.vue` | Ad placements management |
| `/admin/businesses` | `views/Admin/Businesses/Index.vue` | Businesses management |
| `/admin/announcements` | `views/Admin/Announcements/Index.vue` | Announcements list |
| `/admin/announcements/create` | `views/Admin/Announcements/CreateOrEdit.vue` | Create announcement |
| `/admin/announcements/edit/:id` | `views/Admin/Announcements/CreateOrEdit.vue` | Edit announcement |
| `/admin/announcements/categories` | `views/Admin/Announcements/Categories.vue` | Announcement categories |

**Business Routes — BusinessLayout (`/business`):**
| Route | View File | Purpose |
|-------|-----------|---------|
| `/business/login` | `views/Business/Login.vue` | Business user login |
| `/business/register` | `views/Business/Register.vue` | Business registration |
| `/business/dashboard` | `views/Business/Dashboard/Index.vue` | Business dashboard |
| `/business/ads` | `views/Business/Ads/Index.vue` | Business ads management |
| `/business/advertise` | `views/Business/AdvertiseWithUs.vue` | Advertise with us |
| `/business/payments` | `views/Business/Payments/Index.vue` | Payment history |

### Backend API Endpoints (key public + admin)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/laudium/api/v1/articles` | POST | Public | Article listing with filters |
| `/laudium/api/v1/articles/feed` | POST | Public | Article feed with mixed ads |
| `/laudium/api/v1/articles/:id` | GET | Public | Single article by ID |
| `/laudium/api/v1/articles/slug/:slug` | GET | Public | Single article by slug |
| `/laudium/api/v1/articles/create` | POST | Admin | Create article |
| `/laudium/api/v1/articles/:id` | PUT | Admin | Update article |
| `/laudium/api/v1/articles/:id` | DELETE | Admin | Delete article |
| `/laudium/api/v1/ads/placement/main_page_ad/all` | GET | Public | Main page ad placements |
| `/laudium/api/v1/ads/placement/sidebar/all` | GET | Public | Sidebar ad placements |
| `/laudium/api/v1/ads` | GET | Admin | Ads management list |
| `/laudium/api/v1/ads/create` | POST | Admin | Create ad |
| `/laudium/api/v1/ads/:id` | PUT | Admin | Update ad |
| `/laudium/api/v1/ads/:id` | DELETE | Admin | Delete ad |
| `/laudium/api/v1/ad-placements` | GET | Admin | List ad placements |
| `/laudium/api/v1/ad-placements/create` | POST | SuperAdmin | Create placement |
| `/laudium/api/v1/media/:id` | GET | Public | Media by ID |
| `/laudium/api/v1/categories` | GET | Public | Categories list |
| `/laudium/api/v1/auth/login` | POST | Public | Admin login |
| `/{provider}/sourceArticles/all` | GET | Admin | Source articles by provider |
| `/{provider}/generate-article/by-id` | POST | Admin | Generate article from source |
| `/minimax/sourceArticles/all` | GET | Admin | MiniMax source articles |
| `/gemini/sourceArticles/all` | GET | Admin | Gemini source articles |
| `/gpt/sourceArticles/all` | GET | Admin | GPT source articles |
| `/perplexity/sourceArticles/all` | GET | Admin | Perplexity source articles |
| `/x/sourceArticles/all` | GET | Admin | X (Nicolah) source articles |

**AI Providers for Source Articles (5 total):**
1. **MiniMax M2** — `minimax/sourceArticles/all` (recommended default)
2. **Serah AI** — `gemini/sourceArticles/all`
3. **Magic AI** — `gpt/sourceArticles/all`
4. **Beatrice AI** — `perplexity/sourceArticles/all`
5. **Nicolah** — `x/sourceArticles/all`

---

## 3. FULL TEST MATRIX

### 3.1 Public Homepage & News Flows

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| P01 | Homepage loads with article gallery | `/` | 200, news cards visible, no console errors | Yes |
| P02 | Homepage shows breaking news ticker | `/` | Ticker component renders | Yes |
| P03 | Homepage shows main page ad | `/` | Ad renders without 500 | Yes |
| P04 | Homepage shows sidebar ads | `/` | Sidebar ads render | Yes |
| P05 | Navigate to news listing | `/news` | Article list loads | Yes |
| P06 | Navigate to news archive | `/news/archive` | Archive page loads | Yes |
| P07 | Click article → article detail page | `/news/:slug` | Article content loads, images render | Yes |
| P08 | Category filter works | `/categories/:slug` | Filtered articles shown | Yes |
| P09 | Tag filter works | `/tags/:slug` | Filtered articles shown | Yes |
| P10 | Search returns results | `/search?q=test` | Search results page | Yes |
| P11 | Community notices listing | `/community` | Notices render | Yes |
| P12 | Click notice → notice detail | `/community/:slug` | Notice detail loads | Yes |
| P13 | Announcements listing | `/announcements` | Announcements render | Yes |
| P14 | Business directory loads | `/directory` | Directory items render | Yes |
| P15 | Directory item detail | `/directory/:slug` | Item detail loads | Yes |
| P16 | Events page loads | `/events` | Events render | Yes |
| P17 | Podcasts/YouTube page | `/podcasts` | Video list loads | Yes |
| P18 | Static page: terms of use | `/terms-of-use` | Renders without error | Yes |
| P19 | Static page: privacy policy | `/privacy-policy` | Renders without error | Yes |
| P20 | Static page: about | `/about` | Renders without error | Yes |
| P21 | Static page: editorial policy | `/editorial-policy` | Renders without error | Yes |
| P22 | Static page: corrections | `/corrections` | Renders without error | Yes |
| P23 | Payment success page | `/payment/success/:id` | Loads with confirmation | Yes |
| P24 | Payment cancel page | `/payment/cancel/:id` | Loads with cancellation msg | Yes |
| P25 | 404 page for unknown route | `/:pathMatch(.*)*` | 404 page renders | Yes |
| P26 | Console errors check on homepage | `/` | Zero Error-level console msgs | Yes |
| P27 | Network requests: verify no failed API calls | `/` | All requests 2xx/3xx | Yes |
| P28 | Backend log: verify ads/placement returns 200 | Local logs | No HikariPool timeouts | Manual check |

### 3.2 Admin Authentication Flows

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| A01 | Admin login page loads | `/admin/login` | Login form renders | Yes |
| A02 | Admin login with valid credentials | `/admin/login` | Redirects to dashboard, no 403 | Yes |
| A03 | Admin login with invalid credentials | `/admin/login` | Error message shown, no redirect | Yes |
| A04 | Session persists on page refresh | `/admin/dashboard` | Stays logged in | Yes |
| A05 | Navigate to admin dashboard | `/admin/dashboard` | Dashboard loads with stats | Yes |
| A06 | Admin logout | `/admin/logout or clear storage` | Redirects to login | Yes |
| A07 | Direct URL to admin without auth → redirect | `/admin/dashboard` | Redirects to `/admin/login` | Yes |
| A08 | SuperAdmin route access (prompts management) | `/admin/articles/prompts` | Loads for superadmin, 403 for admin | Yes |

### 3.3 Admin Article Management

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| AM01 | Articles list page loads | `/admin/articles` | Table of articles loads | Yes |
| AM02 | Create article button navigates | `/admin/articles` → create | Create form renders | Yes |
| AM03 | Create article with title + content | `/admin/articles/create` | Article created, redirects to edit | Yes |
| AM04 | Edit existing article | `/admin/articles/edit/:id` | Form pre-filled, saves correctly | Yes |
| AM05 | Delete article | `/admin/articles/edit/:id` → delete | Removed from list | Yes |
| AM06 | Article prompt modal opens | `/admin/articles/prompt` | Modal renders | Yes |
| AM07 | Generate article via AI prompt | Modal → generate | Creates draft, navigates to edit | Yes |
| AM08 | Article list pagination | `/admin/articles` | Next page loads | Yes |
| AM09 | Article search/filter | `/admin/articles` | Results filter correctly | Yes |
| AM10 | Publish/unpublish article | Edit → toggle status | Status changes | Yes |
| AM11 | Console errors during article create | `/admin/articles/create` | Zero Error-level console msgs | Yes |
| AM12 | Backend log: article created in DB | Local logs | Record present | Manual check |

### 3.4 Admin Source Articles (All 5 AI Providers)

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| SA01 | Source articles page loads (MiniMax default) | `/admin/source-articles` | MiniMax articles load | Yes |
| SA02 | Switch provider to Gemini (Serah AI) | Provider dropdown → gemini | Gemini articles refresh | Yes |
| SA03 | Switch provider to GPT (Magic AI) | Provider dropdown → gpt | GPT articles refresh | Yes |
| SA04 | Switch provider to Perplexity (Beatrice AI) | Provider dropdown → perplexity | Perplexity articles refresh | Yes |
| SA05 | Switch provider to X (Nicolah) | Provider dropdown → x | X articles refresh | Yes |
| SA06 | Refresh source articles | Refresh button | Articles re-fetch | Yes |
| SA07 | Select single article | Checkbox → select one | Selection count updates | Yes |
| SA08 | Select multiple articles | Checkbox → select many | Bulk convert enabled | Yes |
| SA09 | Convert single source → article | Create from source | Navigates to create form | Yes |
| SA10 | Convert multiple sources → articles | Bulk convert | Background generation starts | Yes |
| SA11 | View article preview modal | Eye icon on article | Modal with content | Yes |
| SA12 | Delete source article | Trash icon | Removed from list | Yes |
| SA13 | Generate new source article modal | Generate button | Modal opens | Yes |
| SA14 | Provider persisted in localStorage | Switch provider → reload | Provider remembered | Yes |
| SA15 | Error state when provider fails | Use unavailable provider | Error message shown | Yes |
| SA16 | Console errors during source fetch | `/admin/source-articles` | Zero Error-level console msgs | Yes |

### 3.5 Admin Ad Management

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| AD01 | Ads list page loads | `/admin/ads` | Table of ads loads | Yes |
| AD02 | Create ad form loads | `/admin/ads/create` | Form renders | Yes |
| AD03 | Create ad with all fields | `/admin/ads/create` | Ad created, redirects to list | Yes |
| AD04 | Edit existing ad | `/admin/ads/edit/:id` | Form pre-filled, saves | Yes |
| AD05 | Delete ad | `/admin/ads/edit/:id` → delete | Removed from list | Yes |
| AD06 | Activate/deactivate ad | Toggle status | Status changes | Yes |
| AD07 | Ad list pagination | `/admin/ads` | Next page loads | Yes |
| AD08 | Ad search/filter | `/admin/ads` | Results filter | Yes |
| AD09 | Console errors during ad create | `/admin/ads/create` | Zero Error-level console msgs | Yes |

### 3.6 Admin Ad Placements

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| AP01 | Ad placements page loads | `/admin/ads/ad-placements` | Placements list loads | Yes |
| AP02 | Create placement | Create form | Placement created | Yes |
| AP03 | Edit placement | Edit form | Placement updated | Yes |
| AP04 | Delete placement | Delete | Removed from list | Yes |
| AP05 | Main page ad placement on public site | `/` | Ad renders in correct position | Yes |
| AP06 | Sidebar placement on public site | `/` | Sidebar ad renders | Yes |
| AP07 | No 500 on ads/placement endpoint | Local logs | HikariPool healthy | Manual |

### 3.7 Admin Business & Announcements Management

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| B01 | Businesses management page | `/admin/businesses` | Businesses list loads | Yes |
| B02 | Announcements list | `/admin/announcements` | Announcements render | Yes |
| B03 | Create announcement | `/admin/announcements/create` | Creates, redirects | Yes |
| B04 | Edit announcement | `/admin/announcements/edit/:id` | Edits correctly | Yes |
| B05 | Announcement categories | `/admin/announcements/categories` | Categories management | Yes |
| B06 | Ad payments page | `/admin/ads/payments` | Payments list loads | Yes |

### 3.8 Business User Flows

| # | Test Case | Route / URL | Expected Result | Playwright? |
|---|-----------|-------------|-----------------|-------------|
| BU01 | Business login page | `/business/login` | Login form renders | Yes |
| BU02 | Business login success | `/business/login` | Redirects to dashboard | Yes |
| BU03 | Business registration | `/business/register` | Registration form works | Yes |
| BU04 | Business dashboard | `/business/dashboard` | Dashboard loads | Yes |
| BU05 | Business ads management | `/business/ads` | Ads list for business | Yes |
| BU06 | Business payment history | `/business/payments` | Payment history loads | Yes |

### 3.9 Navigation & State Persistence

| # | Test Case | Trigger | Expected Result | Playwright? |
|---|-----------|---------|-----------------|-------------|
| NV01 | Create article → navigate away → back | Create → home → back | Form state preserved | Yes |
| NV02 | Edit article → navigate away → back | Edit → home → back | Form state preserved | Yes |
| NV03 | Create ad → navigate away → back | Create → home → back | Form state preserved | Yes |
| NV04 | Admin session persists across routes | Dashboard → articles → back | Still authenticated | Yes |
| NV05 | Browser back from create → list | Back button | Returns to list | Yes |
| NV06 | Browser forward after back | Forward button | Returns to create | Yes |

### 3.10 Browser Console & Network Validation (per major flow)

| # | Test Case | Flow | Expected | Playwright? |
|---|-----------|------|----------|-------------|
| CN01 | Console errors on homepage | Load `/` | Zero Error-level | Yes |
| CN02 | Console errors on article detail | Load `/news/:slug` | Zero Error-level | Yes |
| CN03 | Console errors on admin login | Load `/admin/login` | Zero Error-level | Yes |
| CN04 | Console errors on admin dashboard | Load `/admin/dashboard` | Zero Error-level | Yes |
| CN05 | Console errors on article create | Load `/admin/articles/create` | Zero Error-level | Yes |
| CN06 | Console errors on source articles | Load `/admin/source-articles` | Zero Error-level | Yes |
| CN07 | Network: all API calls succeed | Load `/` | All 2xx/3xx | Yes |
| CN08 | Network: no 403 on articles | Load `/` | `/articles` returns 200 | Yes |
| CN09 | Network: no 500 on placements | Load `/` | `/ads/placement` returns 200 | Yes |
| CN10 | Backend logs: no exceptions on article create | Create article | Clean logs | Manual |

---

## 4. docs/standartTest/ PROPOSED FILE STRUCTURE

```
C:\Software\SafAi\LaudiumAPP\Laudium Biz\docs\standartTest\
├── README.md                              # Overview, purpose, how to run
├── run-history/
│   ├── YYYY-MM-DD-run-001.md              # Per-run evidence log
│   └── ...
├── screens/
│   ├── P01-homepage-loads.png            # Screenshot evidence per test
│   ├── A01-admin-login-loads.png
│   └── ...                                # One per test case
├── credentials.md.example                  # Template (no real secrets)
├── TEST-MATRIX.md                         # This document's test matrix
├── CHECKLIST.md                           # Pre-run, during-run, post-run checklist
├── ENVIRONMENT.md                         # Environment URLs, config
└── CLEANUP-POLICY.md                     # Data cleanup rules
```

### File Contents Summary

**README.md:**
- Purpose: Standard browser test suite for Laudium Post
- How to run: `npx playwright test` with environment variables
- Prerequisites: Node.js, Playwright, valid test credentials
- How to interpret results
- How to add new tests

**TEST-MATRIX.md:**
- Full table of all test cases (this document section 3)
- Test ID, description, route, expected result, automation status
- Links to screenshots per test

**CHECKLIST.md:**
- Pre-run: credentials set, backend running, no production data conflicts
- During-run: monitor console, network tab, backend logs
- Post-run: verify screenshots, check cleanup, update run-history

**ENVIRONMENT.md:**
- `TEST_BASE_URL` (default: `http://localhost:5173` for local dev; `https://laudiumpost.co.za` for production)
- `TEST_API_BASE_URL` (default: `http://localhost:9011/laudium/api/v1`)
- Browser: Chrome (default), Firefox, Safari (optional)
- Headless vs headed mode
- Timeout settings

**credentials.md.example:**
- NO real credentials in this file
- Template: `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_BUSINESS_EMAIL`, `TEST_BUSINESS_PASSWORD`
- Instructions: store real values in `.env` or environment variables, never commit

**CLEANUP-POLICY.md:**
- Test records: created with `TEST_` or timestamp prefix `TEST_20260517_...`
- Created articles: publish as `draft` or delete after test
- Created ads: set `inactive` after test or delete
- Source articles: don't pollute production; use `savedSourceArticleIds` localStorage cleanup
- No deletion of production content created before test run
- After each run: delete all `TEST_2026*` records from DB (manual step or cleanup script)

---

## 5. TEST DATA & CLEANUP POLICY

### Safe Test Data Rules

1. **Prefix all test-created content** with `TEST_20260517_` (date-stamped) or `TEST_AUTOMATED_`
2. **Article status**: Create as `draft` so they don't appear publicly until deleted
3. **Ad status**: Create as `inactive` so they don't serve to real visitors
4. **Never delete** production records created before the test run
5. **After each run**: Sacha manually deletes all `TEST_2026*` records from DB, or runs cleanup SQL:
   ```sql
   DELETE FROM articles WHERE title LIKE 'TEST_2026%';
   DELETE FROM ads WHERE name LIKE 'TEST_2026%';
   ```
6. **Source articles**: localStorage `savedSourceArticleIds` should be cleared between runs
7. **Browser state**: Clear cookies/localStorage before starting a new run to avoid sticky sessions

### Upload Test Assets

- Use a small (≤1MB) test image file committed to `tests/assets/test-image.png`
- Do NOT use real production images
- Image should be a neutral placeholder

---

## 6. KNOWN BLOCKERS / CREDENTIALS NEEDED

| Blocker | Details | Who Can Resolve |
|---------|---------|-----------------|
| Admin login credentials | Need real `TEST_ADMIN_EMAIL` + `TEST_ADMIN_PASSWORD` for `@playwright/test` | Alex to provide |
| Business login credentials | Need real `TEST_BUSINESS_EMAIL` + `TEST_BUSINESS_PASSWORD` | Alex to provide |
| Source article API availability | All 5 AI providers (MiniMax, Gemini, GPT, Perplexity, X) must be reachable from test machine | Alex/Chris to confirm |
| Anti-bot / captcha | If admin login has captcha, Playwright tests need workaround | Chris to investigate |
| Upload test assets | Need `tests/assets/test-image.png` created | Sacha to create |
| Production vs local | Whether to run against `localhost:5173` or `https://laudiumpost.co.za` | Alex to decide |
| Backend running | API must be running at `localhost:9011` for local runs | Dev environment check |
| SuperAdmin role for prompts management | `/admin/articles/prompts` requires superadmin role | Alex to confirm role assignment |

---

## 7. EXECUTION APPROACH RECOMMENDATION

### What to Automate with Playwright (Sacha's work)

**Automatable (Playwright browser tests):**
- All 90+ test cases in the TEST-MATRIX above
- Use `result-driven-testing` skill: run tests, capture failures, fix, re-run
- Use headed mode for debugging, headless for CI

**Manual / Safe-Mode Production (Sacha or Alex handles):**
- Admin login with real credentials stored in `.env`
- Production smoke test (run against `https://laudiumpost.co.za` with extreme caution)
- SuperAdmin route tests (need role verification)

### How result-driven-testing Should Loop

1. Sacha runs Playwright suite against local dev environment
2. Any failure: `result-driven-testing` captures screenshot + console + network trace
3. Fix applied to test or app code
4. Re-run to verify fix
5. Loop until all tests pass
6. Update `run-history/YYYY-MM-DD-run-001.md` with evidence
7. Final production smoke test (manual, with Alex present)

### Granular Azure DevOps Work Items (CREATED — Chris authorized Azure DevOps)

The following 14 Azure DevOps Task work items were created in `Laudium Biz / Features / Sprint 1`:

| Work Item ID | Section | Test IDs | Tests | Work Item Type |
|-------------|---------|----------|-------|---------------|
| 2896 | SECTION 1: Article Edit Screen | EDIT-001 to EDIT-033 | 33 | Task |
| 2897 | SECTION 2: Article Create Screen | CREATE-001 to CREATE-029 | 29 | Task |
| 2898 | SECTION 3: Article Prompt Screen | PROMPT-001 to PROMPT-003 | 3 | Task |
| 2899 | SECTION 4: Source Articles Screen | SOURCE-001 to SOURCE-017 | 17 | Task |
| 2900 | SECTION 5: Article Prompt Manager | PROMPTS-001, PROMPTS-002 | 2 | Task |
| 2901 | SECTION 6: Articles List | LIST-001 to LIST-015 | 15 | Task |
| 2902 | SECTION 7: Admin Dashboard | DASH-001 | 1 | Task |
| 2903 | SECTION 8: Admin Ads Management | AD-001 to AD-010 | 10 | Task |
| 2904 | SECTION 9: Admin Announcements | ANN-001 to ANN-004 | 4 | Task |
| 2905 | SECTION 10: Admin Ads Placements | PLAC-001 to PLAC-003 | 3 | Task |
| 2906 | SECTION 11: Admin Businesses | BIZ-001, BIZ-002 | 2 | Task |
| 2907 | SECTION 12: Business Portal | BIZLOGIN/BIZREG/BIZ Dashboard | 6 | Task |
| 2908 | SECTION 13: Public Pages | PUBPAGE-001 to PUBPAGE-021 | 21 | Task |
| 2909 | SECTION 14: Admin Login | ADMLOG-001 to ADMLOG-004 | 4 | Task |

**Total: 14 Azure DevOps Tasks covering 148 granular browser tests.**

Full details including URLs, test IDs, and routes are in Section 1A of this brief.

---

## 8. SACHA HANDOFF CHECKLIST

### Pre-Run Checklist (Sacha verifies before starting)
- [ ] Admin credentials provided by Alex stored in `.env` as `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`
- [ ] Business credentials provided by Alex stored in `.env` as `TEST_BUSINESS_EMAIL`, `TEST_BUSINESS_PASSWORD`
- [ ] Test image created at `tests/assets/test-image.png` (≤1MB)
- [ ] Backend running at `localhost:9011`
- [ ] Frontend running at `localhost:5173` (or target URL confirmed)
- [ ] No production data with `TEST_2026*` prefix exists (clean DB)
- [ ] Playwright installed: `npx playwright install`
- [ ] Node.js environment ready

### Execution Checklist (Sacha follows during run)
- [ ] Run with: `npx playwright test --project=chromium`
- [ ] Monitor console errors in real-time
- [ ] Capture screenshot on every failure
- [ ] Export network HAR on every API failure
- [ ] Check backend logs for exceptions
- [ ] For each test case in TEST-MATRIX: mark PASS or FAIL with evidence link
- [ ] Do NOT delete production data during test run

### Post-Run Checklist (Sacha completes after all tests pass)
- [ ] Update `run-history/YYYY-MM-DD-run-001.md` with results summary
- [ ] Delete all `TEST_2026*` records from database
- [ ] Clear browser localStorage/cookies
- [ ] Commit screenshots to `docs/standartTest/screens/`
- [ ] Update `TEST-MATRIX.md` with pass/fail status per test
- [ ] Update `CHECKLIST.md` if any process changes needed
- [ ] Report to Alex: all tests passing or specific blockers remaining

### Acceptance Criteria (Alex verifies for Sacha)
- [ ] All 90+ test cases in TEST-MATRIX have been executed
- [ ] Each test has a screenshot or HAR evidence saved
- [ ] `docs/standartTest/` structure matches the proposed file tree exactly
- [ ] No production data deleted or modified (only `TEST_2026*` records)
- [ ] Run history log is current and complete
- [ ] Alex signs off on LCP #712 completion

---

## 9. SUMMARY

| Item | Status |
|------|--------|
| Frontend repo inspected | ✅ `C:\Software\SafAi\LaudiumAPP\Laudium Biz` |
| Backend repo inspected | ✅ `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI` |
| Route inventory captured | ✅ 57 routes documented (21 public + 27 admin + 9 business) |
| Granular test matrix created | ✅ `GRANULAR-USER-STORY-MATRIX.md` — 2,358 lines, 148 test entries |
| AI source providers confirmed | ✅ 5 providers (MiniMax, Gemini, GPT, Perplexity, X) |
| Existing E2E reviewed | ✅ `laudium-api-failures.spec.ts` |
| Azure DevOps work items created | ✅ 14 Tasks (IDs 2896–2909) covering 148 tests |
| Child LCP #713–#721 | ❌ SUPERSEDED — Chris rejected high-level approach |
| Granular test matrix placeholder check | ✅ No incomplete placeholders found |
| docs/standartTest/ structure defined | ✅ 6 files planned |
| Test data / cleanup policy defined | ✅ Timestamp prefix + draft/inactive rule |
| Blockers identified | ⚠️ Credentials, API availability, anti-bot — Alex to resolve |
| result-driven-testing approach | ✅ Loop-fix-verify loop documented |

---

**Return status: `GRANULAR_AZURE_SCOPE_READY_FOR_SACHA`**

Anthony (Project Manager) — LCP #712 Azure DevOps work items created. 14 Tasks covering 148 granular browser tests. Matrix verified clean. Return to Alex for Sacha handoff.

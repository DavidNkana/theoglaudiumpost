# CHECKLIST.md — LCP #712 Test Execution Checklist

## Pre-Run Checklist

Before starting the test suite, verify:

### Environment
- [ ] Production frontend accessible: https://laudiumpost.co.za (200 OK)
- [ ] Production backend API accessible: https://server.safai.co.za/Laudiumbiz/api/v1/ (200 OK)
- [ ] Local dev server running (if testing locally): http://localhost:5173
- [ ] Local backend running (if testing locally): http://localhost:9011

### Playwright
- [ ] `npx playwright install chromium` — Chromium browser installed
- [ ] `npx playwright test --version` — Playwright working

### Credentials
- [ ] Admin credentials stored in `credentials.md` or environment variables
- [ ] Business credentials stored in `credentials.md` or environment variables
- [ ] Test credentials verified (can login to admin at https://laudiumpost.co.za/admin/login)

### Test Data
- [ ] Database clean: no `TEST_2026*` records from previous runs
- [ ] Test image available: `tests/assets/test-image.png` (≤1MB)
- [ ] No conflicting browser sessions (clear cookies/localStorage)

### Documentation
- [ ] `docs/standartTest/run-history/` directory exists
- [ ] `docs/standartTest/screens/` directory exists
- [ ] `docs/standartTest/evidence/` directory exists

## During-Run Checklist

As tests execute, monitor:

### Console Monitoring
- [ ] Zero Error-level console messages on public pages
- [ ] Zero Error-level console messages on admin pages
- [ ] Network failures: all API calls return 2xx/3xx

### Backend Logs (if running locally)
- [ ] No HikariPool timeout errors on `/ads/placement/*` endpoints
- [ ] No 403 errors on public article endpoints
- [ ] No unclosed DB resources (connection pool healthy)

### Per-Section Checks
For each section (2896–2909):
- [ ] All tests in section executed
- [ ] Screenshots captured for each test
- [ ] FAIL tests documented with HAR export

## Post-Run Checklist

After all tests complete:

### Evidence Collection
- [ ] Screenshots saved to `docs/standartTest/screens/`
- [ ] HAR exports saved for failing tests in `docs/standartTest/evidence/`
- [ ] Run history log created: `run-history/YYYY-MM-DD-run-XXX.md`

### Data Cleanup
- [ ] All `TEST_2026*` articles deleted from database
- [ ] All `TEST_2026*` ads deleted or set to inactive
- [ ] Browser localStorage/cookies cleared

### Work Item Updates
- [ ] Azure DevOps work items 2896–2909 updated with evidence links
- [ ] Closed work items with verified PASS evidence
- [ ] Open work items with documented blockers

### Test Matrix Update
- [ ] `TEST-MATRIX.md` updated with pass/fail status per test
- [ ] `run-history/YYYY-MM-DD-run-XXX.md` created with summary

## Test Execution Commands

```bash
# Full suite (all tests)
npx playwright test --project=chromium

# Public pages only (no credentials needed)
npx playwright test --grep="PUBPAGE" --project=chromium

# Admin section (requires credentials)
npx playwright test --grep="EDIT|CREATE|SOURCE|LIST|DASH|AD|ANN|PLAC|BIZ" --project=chromium

# Business portal (requires credentials)
npx playwright test --grep="BIZLOGIN|BIZREG|BIZ-" --project=chromium

# Single section (e.g., Article Edit)
npx playwright test --grep="EDIT-" --project=chromium

# With headed browser (debugging)
npx playwright test --headed --project=chromium

# With UI mode
npx playwright test --ui
```

## Exit Criteria

Tests are considered PASSING when:
- All public page tests return 200 and zero console errors
- All admin tests pass with correct UI state changes
- All API calls return expected status codes
- No production data is modified (only TEST_2026* records)

Tests should FAIL and be BLOCKED when:
- Credentials not available → document as `BLOCKED_NEEDS_CREDENTIALS`
- External API (AI provider) unreachable → document as `BLOCKED_NEEDS_API_KEY`
- Production site down → document as `BLOCKED_PRODUCTION_DOWN`

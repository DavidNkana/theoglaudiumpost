# LCP #712 — Laudium Post Browser Standard Test Suite

## Overview

This directory contains the browser-based Playwright test suite for the Laudium Post frontend application. The suite covers **148 granular test cases** across **57 routes** (21 public + 27 admin + 9 business).

## Purpose

When Sacha (Head of Development) runs the standard browser test suite against the Laudium Post frontend, they can verify:
- Every public page loads without console errors
- Every admin workflow (login, create article, source articles, create ad, manage placements) completes end-to-end
- All API responses return correct status codes
- Every fix or feature addition is caught before release

## Directory Structure

```
docs/standartTest/
├── README.md                    # This file
├── ENVIRONMENT.md               # Environment URLs, config
├── credentials.md.example       # Template (no real secrets)
├── TEST-MATRIX.md              # Full test matrix (from GRANULAR-USER-STORY-MATRIX.md)
├── CHECKLIST.md                # Pre-run, during-run, post-run checklist
├── CLEANUP-POLICY.md          # Data cleanup rules
├── run-history/
│   └── YYYY-MM-DD-run-001.md  # Per-run evidence log
├── screens/
│   └── *.png                  # Screenshot evidence per test
└── evidence/
    └── *.har                  # Network HAR exports per failing test
```

## Quick Start

### Prerequisites

```bash
# 1. Install Playwright browsers (one-time)
cd "C:\Software\SafAi\LaudiumAPP\Laudium Biz"
npx playwright install chromium

# 2. Install dependencies
npm install

# 3. Copy and fill credentials
cp docs/standartTest/credentials.md.example docs/standartTest/credentials.md
# Edit credentials.md with real values
```

### Running Tests

```bash
# Run all tests against production frontend
npx playwright test --project=chromium

# Run specific test file
npx playwright test laudium-standard-tests.spec.ts --project=chromium

# Run with headed browser (debugging)
npx playwright test --project=chromium --headed

# Run only public pages tests
npx playwright test --grep="PUBPAGE" --project=chromium

# Run only admin tests
npx playwright test --grep="ADMIN\|EDIT\|CREATE\|SOURCE\|AD\|ANN\|BIZ" --project=chromium

# Run with UI (debugging)
npx playwright test --ui
```

### Environment URLs

| Environment | Frontend URL | Backend API URL |
|-------------|-------------|-----------------|
| Production  | https://laudiumpost.co.za | https://server.safai.co.za/Laudiumbiz/api/v1/ |
| Local Dev   | http://localhost:5173 | http://localhost:9011/Laudiumbiz/api/v1/ |

### Test Categories

| Section | Work Item | Test IDs | Count |
|---------|-----------|----------|-------|
| 1. Article Edit Screen | 2896 | EDIT-001 to EDIT-033 | 33 |
| 2. Article Create Screen | 2897 | CREATE-001 to CREATE-029 | 29 |
| 3. Article Prompt Screen | 2898 | PROMPT-001 to PROMPT-003 | 3 |
| 4. Source Articles Screen | 2899 | SOURCE-001 to SOURCE-017 | 17 |
| 5. Article Prompt Manager | 2900 | PROMPTS-001 to PROMPTS-002 | 2 |
| 6. Articles List | 2901 | LIST-001 to LIST-015 | 15 |
| 7. Admin Dashboard | 2902 | DASH-001 | 1 |
| 8. Admin Ads Management | 2903 | AD-001 to AD-010 | 10 |
| 9. Admin Announcements | 2904 | ANN-001 to ANN-004 | 4 |
| 10. Admin Ads Placements | 2905 | PLAC-001 to PLAC-003 | 3 |
| 11. Admin Businesses | 2906 | BIZ-001 to BIZ-002 | 2 |
| 12. Business Portal | 2907 | BIZLOGIN/BIZREG/BIZ Dashboard | 6 |
| 13. Public Pages | 2908 | PUBPAGE-001 to PUBPAGE-021 | 21 |
| 14. Admin Login | 2909 | ADMLOG-001 to ADMLOG-004 | 4 |

**Total: 14 Azure DevOps Tasks (2896–2909) covering 148 tests**

## Test Evidence

All test evidence (screenshots, HAR exports) is stored in:
- `docs/standartTest/screens/` — PNG screenshots per test
- `docs/standartTest/evidence/` — HAR network exports

Run history is logged in `docs/standartTest/run-history/`.

## Known Blockers

| Blocker | Details | Who Can Resolve |
|---------|---------|-----------------|
| Admin login credentials | Need TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD | Alex to provide |
| Business login credentials | Need TEST_BUSINESS_EMAIL + TEST_BUSINESS_PASSWORD | Alex to provide |
| SuperAdmin role for prompts management | PROMPTS-001 requires superadmin role | Alex to confirm |

## Adding New Tests

When adding a new feature:
1. Add test case to `laudium-standard-tests.spec.ts` with unique Test ID
2. Document in `GRANULAR-USER-STORY-MATRIX.md`
3. Create Azure DevOps work item
4. Run test and record evidence
5. Close work item with evidence

## References

- Granular User Story Matrix: `GRANULAR-USER-STORY-MATRIX.md`
- Azure DevOps: https://dev.azure.com/Chrilantech/Laudium%20Biz
- Frontend Repo: `C:\Software\SafAi\LaudiumAPP\Laudium Biz`
- Backend Repo: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI`

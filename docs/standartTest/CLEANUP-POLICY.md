# CLEANUP-POLICY.md — LCP #712 Data Cleanup Rules

## Purpose

All test data must be cleaned up after each test run to:
- Prevent pollution of production database
- Avoid `TEST_2026*` records appearing on the live site
- Maintain test repeatability

## Cleanup Rules

### 1. Test Data Prefix

**ALL test-created content MUST be prefixed with:**
- `TEST_20260517_` (date-stamped) — preferred for manual tracking
- `TEST_AUTOMATED_` — for automated test runs

Example:
- Article title: `TEST_20260517_Browser_Test_Article`
- Ad name: `TEST_AUTOMATED_Ad_For_Testing`

### 2. Article Cleanup

| Action | Cleanup Method |
|--------|---------------|
| Created article (published) | DELETE from database after test |
| Created article (draft) | DELETE from database after test |
| Modified existing article | Restore original values OR note for manual restore |
| Scheduled article | DELETE after scheduled time passes |

**SQL for cleanup:**
```sql
DELETE FROM articles WHERE title LIKE 'TEST_2026%';
```

### 3. Ad Cleanup

| Action | Cleanup Method |
|--------|---------------|
| Created ad | DELETE from database OR set `status = 'inactive'` |
| Modified existing ad | Restore original values |
| Activated/deactivated ad | Restore original status |

**SQL for cleanup:**
```sql
DELETE FROM ads WHERE name LIKE 'TEST_2026%';
-- OR set inactive:
UPDATE ads SET status = 'inactive' WHERE name LIKE 'TEST_2026%';
```

### 4. Announcement Cleanup

```sql
DELETE FROM announcements WHERE title LIKE 'TEST_2026%';
```

### 5. Source Articles (localStorage)

| Action | Cleanup Method |
|--------|---------------|
| Saved source article IDs | Clear `savedSourceArticleIds` from localStorage |
| Provider preference | Clear `sourceProvider` from localStorage |
| New article data | Clear `newArticleData` from localStorage |

**JavaScript to clear in browser console:**
```javascript
localStorage.removeItem('savedSourceArticleIds');
localStorage.removeItem('sourceProvider');
localStorage.removeItem('newArticleData');
```

### 6. Browser State

After each test run:
- Clear cookies for the test domain
- Clear localStorage for the test domain
- Close all browser contexts

```bash
# In Playwright, use storageState or clear cookies:
await context.clearCookies();
await context.clearPermissions();
```

## What NOT to Delete

❌ **NEVER delete** production records created before the test run
❌ **NEVER delete** real user accounts
❌ **NEVER delete** real articles, ads, or announcements
❌ **NEVER modify** production configuration

## Cleanup Schedule

| When | Action |
|------|--------|
| After each TEST | Delete all `TEST_2026*` records immediately |
| End of test run | Clear all browser localStorage |
| Before new test run | Verify no `TEST_2026*` records exist |
| Weekly | Review and delete any orphaned `TEST_2026*` records |

## Automated Cleanup

For automated CI runs, include cleanup in the test script:

```typescript
// After all tests complete:
afterAll(async () => {
  // Delete test articles
  await cleanupTestArticles();
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
  });
});
```

## Manual Cleanup

If automated cleanup fails, run manually:

```sql
-- Connect to production database (read-only access recommended)
-- DELETE test records:

DELETE FROM articles WHERE title LIKE 'TEST_2026%';
DELETE FROM ads WHERE name LIKE 'TEST_2026%';
DELETE FROM announcements WHERE title LIKE 'TEST_2026%';

-- Verify cleanup
SELECT COUNT(*) FROM articles WHERE title LIKE 'TEST_2026%';
SELECT COUNT(*) FROM ads WHERE name LIKE 'TEST_2026%';
SELECT COUNT(*) FROM announcements WHERE title LIKE 'TEST_2026%';
```

## Production Safety

⚠️ **WARNING: These are PRODUCTION databases. Use extreme caution.**

1. Always use WHERE LIKE clauses with TEST_ prefix first (SELECT before DELETE)
2. Get a database backup before any DELETE operations
3. Have Alex or Chris verify the cleanup
4. Document any records that could not be cleaned up

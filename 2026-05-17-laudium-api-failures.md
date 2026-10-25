# Laudium Public API Failures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two production failures on the Laudium Post backend: (1) POST /api/v1/articles returning 403, and (2) GET /api/v1/ads/placement/{placement}/all returning 500 with HikariPool connection timeout.

**Architecture:** Two independent fixes: (1) For the 403, diagnose the Spring Security rule ordering and/or reverse proxy behavior for POST /articles. (2) For the 500, fix connection leaks in ArticleService + AdController by ensuring all ResultSets/Connections are closed in try-finally blocks, increase HikariCP pool size, and optimize the ads query by adding LIMIT and removing inefficient RAND() sort.

**Tech Stack:** Spring Boot (Java 17+), HikariCP, MySQL, Vue 3 (frontend), reverse proxy routing through Cloudflare/safai.co.za.

---

## User Success Story

When a visitor opens the Laudium Post news homepage, they see the latest articles loaded correctly without a 403 error, and ad placements render in the correct positions without a 500 server error. Both flows complete in under 3 seconds and the user can read articles and see relevant ads.

---

## Bug 1: POST /api/v1/articles Returns 403

### Files

- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/security/SecurityConfig.java` (line 75-89)
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/security/jwt/JwtAuthenticationFilter.java` (line 94-107)
- No frontend changes required — frontend calls `/articles` which resolves to correct URL.

### Root Cause Analysis

The `SecurityConfig` at line 89 has `.anyRequest().permitAll()` which should permit POST /api/v1/articles. However, the JwtAuthenticationFilter at line 94-107 only skips filtering for paths containing `/api/v1/auth/`, `/swagger-ui`, `/api-docs`, or `/api/v1/public`. POST /api/v1/articles is NOT in the skip list, meaning the JWT filter processes it even though no token is required. While the filter does not block requests without tokens (it just skips authentication and continues), the 403 could originate from:

1. A reverse proxy (nginx/Caddy on server.safai.co.za) routing rule that blocks POST to /laudium/api/v1/articles specifically
2. Cloudflare WAF rule blocking POST requests to that path
3. Spring Security interpreting the request differently due to path matching order

**Verification steps required:**

### Task 1: Verify Spring Security Configuration

- [ ] **Step 1: Add explicit POST /articles permit rule**

In `SecurityConfig.java` after line 78, add:
```java
.requestMatchers(HttpMethod.POST, "/api/v1/articles").permitAll()
.requestMatchers(HttpMethod.POST, "/api/v1/articles/feed").permitAll()
```

This makes the intent explicit rather than relying on `.anyRequest().permitAll()` catch-all.

- [ ] **Step 2: Verify JwtAuthenticationFilter skip list**

In `JwtAuthenticationFilter.shouldNotFilter()`, add path patterns to skip. After line 105, add:
```java
path.contains("/api/v1/articles") ||
```

This skips JWT processing entirely for article endpoints.

- [ ] **Step 3: Test locally**

Run backend locally, test:
```bash
curl -X POST http://localhost:9011/laudium/api/v1/articles \
  -H "Content-Type: application/json" \
  -d '{"page":0,"size":10,"status":""}' \
  -w "\nHTTP_CODE:%{http_code}\n"
```
Expected: HTTP 200 with JSON response (not 403).

- [ ] **Step 4: Check reverse proxy config**

SSH to server.safai.co.za and check nginx/caddy config for rules blocking POST /laudium/api/v1/articles.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/laudiumbiz/Laudiumbiz/security/SecurityConfig.java
git add src/main/java/com/laudiumbiz/Laudiumbiz/security/jwt/JwtAuthenticationFilter.java
git commit -m "fix: explicit permit for POST /api/v1/articles to resolve 403"
```

---

## Bug 2: GET /api/v1/ads/placement/{placement}/all Returns 500 (HikariPool Timeout)

### Files

- Modify: `lauduimbizAPI/src/main/resources/application.properties` (pool sizing)
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java` (connection leak in getAllArticles + getArticleFeedWithAds + getActiveAdsForFeed)
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/AdController.java` (connection leak in getAllActiveByPlacement)
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Utils/LaudiumJdbcUtil.java` (optional: add leak detection helper)

### Root Cause Analysis

Three compounding problems:

1. **HikariCP pool is critically undersized**: `maximum-pool-size=3`, `minimum-idle=1`. With virtual threads handling concurrent requests, 3 connections exhausts immediately under any load.

2. **Connection leaks in ArticleService**: The `getAllArticles` method (lines 150-176, 183-237) opens `countRs`, `rs`, and `dataRs` CustomRs objects but NEVER calls `.close()` on any of them. Each leaked query holds a connection. After 3 uncaptured calls, pool is exhausted and subsequent requests timeout waiting for a connection (20s timeout).

3. **Connection leaks in getActiveAdsForFeed**: Called by `getArticleFeedWithAds` (line 768-809). Uses `LaudiumJdbcUtil.getSelectRaw(q)` without closing the returned CustomRs. Same leak pattern.

4. **Inefficient ads query**: `getAllActiveByPlacement` (AdController line 545-598) uses `ORDER BY RAND()` which prevents index usage and causes full table scan. No LIMIT on the all-placement query means potentially loading thousands of rows.

### Task 2: Increase HikariCP Pool Size

- [ ] **Step 1: Update application.properties**

```properties
# HikariCP Connection Pool Settings — increased for production load
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.leak-detection-threshold=60000
```

- [ ] **Step 2: Commit**

```bash
git add src/main/resources/application.properties
git commit -m "fix: increase HikariCP pool from 3 to 20 connections"
```

### Task 3: Fix Connection Leak in ArticleService.getAllArticles

**Files:**
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java:150-255`

The method has 3 unclosed CustomRs objects: countRs, rs, dataRs.

- [ ] **Step 1: Wrap countRs in try-finally**

At line 150-176, wrap the countRs usage:
```java
CustomRs countRs;
try {
    // ... existing count query execution (lines 150-171)
    countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(), ...);
    // ...
    if (countRs.next()) {
        total = countRs.getLong("total");
    }
} finally {
    if (countRs != null) countRs.close();
}
```

- [ ] **Step 2: Wrap rs (main query) in try-finally**

At line 183-188:
```java
CustomRs rs = null;
try {
    rs = LaudiumJdbcUtil.getSelectRaw(articlesQuery.toString());
    while (rs.next()) {
        Articles article = mapRsToArticle(rs);
        articlesList.add(article);
    }
} finally {
    if (rs != null) rs.close();
}
```

- [ ] **Step 3: Wrap dataRs in try-finally**

At line 222-237:
```java
CustomRs dataRs = null;
try {
    dataRs = LaudiumJdbcUtil.getSelectRaw(articleDataQuery);
    while (dataRs.next()) {
        // ... existing mapping code
    }
} finally {
    if (dataRs != null) dataRs.close();
}
```

- [ ] **Step 4: Test locally**

Run the backend and call POST /api/v1/articles multiple times concurrently:
```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:9011/laudium/api/v1/articles \
    -H "Content-Type: application/json" \
    -d '{"page":0,"size":10}' &
done
wait
```
Check no HikariPool timeout errors in logs.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java
git commit -m "fix: close all ResultSets in getAllArticles to prevent connection leak"
```

### Task 4: Fix Connection Leak in ArticleService.getArticleFeedWithAds and getActiveAdsForFeed

**Files:**
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java:728-810`

- [ ] **Step 1: Wrap getActiveAdsForFeed result in try-finally**

At line 791-803:
```java
CustomRs rs = null;
try {
    rs = LaudiumJdbcUtil.getSelectRaw(q);
    while (rs.next()) {
        Map<String, Object> ad = new HashMap<>();
        ad.put("id", rs.getInt("id"));
        ad.put("title", rs.getString("title"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("image", rs.getString("image"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("business_name", rs.getString("business_name"));
        ads.add(ad);
    }
} finally {
    if (rs != null) rs.close();
}
```

- [ ] **Step 2: Test getArticleFeedWithAds**

```bash
curl -X POST http://localhost:9011/laudium/api/v1/articles/feed \
  -H "Content-Type: application/json" \
  -d '{"page":0,"size":10}' \
  -w "\nHTTP_CODE:%{http_code}\n"
```

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java
git commit -m "fix: close ResultSet in getActiveAdsForFeed"
```

### Task 5: Fix Connection Leak in AdController.getAllActiveByPlacement

**Files:**
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/AdController.java:545-598`

- [ ] **Step 1: Wrap the SQL query result in try-finally**

At line 570-590:
```java
CustomRs rs = null;
try {
    rs = sql.getSelectRawPrepared(
        q, placement.equalsIgnoreCase("main_page_ad")
            ? "%%" : "%" + placement + "%"
    );
    List<HashMap<String, Object>> ads = new ArrayList<>();
    while (rs.next()) {
        HashMap<String, Object> ad = new HashMap<>();
        ad.put("id", rs.getString("id"));
        ad.put("placement_id", rs.getString("placement_id"));
        ad.put("title", rs.getString("title"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("video_url", rs.getString("video_url"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("placement_location", rs.getString("location"));
        ad.put("image", rs.getString("file"));
        ad.put("business_name", rs.getString("business_name"));
        ad.put("business_email", rs.getString("business_email"));
        ads.add(ad);
    }
    return ResponseEntity.ok().body(gson.toJson(ads));
} finally {
    if (rs != null) rs.close();
}
```

- [ ] **Step 2: Test ads placement endpoint**

```bash
curl -X GET "http://localhost:9011/laudium/api/v1/ads/placement/main_page_ad/all" \
  -w "\nHTTP_CODE:%{http_code}\n"
```

Expected: HTTP 200 with JSON array of ads (or empty array if none active).

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/AdController.java
git commit -m "fix: close ResultSet in getAllActiveByPlacement to prevent connection leak"
```

### Task 6: Optimize Ads Query (Remove RAND, Add LIMIT)

**Files:**
- Modify: `lauduimbizAPI/src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/AdController.java:551-572`

- [ ] **Step 1: Replace RAND() with efficient ordering**

In the query at line 551-569, replace `ORDER BY RAND()` with a deterministic sort that can use an index. For rotating ads, use `ORDER BY placement_date DESC` or add a random seed parameter:

```java
String q = """
    SELECT
        ads.*,
        biz.name as business_name,
        biz.email as business_email,
        m.file
     FROM ads
     JOIN ad_placements as ad_p ON ads.placement_id = ad_p.id
     LEFT JOIN media AS m ON ads.image_id = m.id
     JOIN payments AS p ON ads.payment_id = p.id
     JOIN businesses AS biz ON ads.business_id = biz.id
     WHERE ads.status != 'expired'
     AND ad_p.location LIKE ?
     AND DATE(placement_date) <= CURDATE()
     AND expiry_date >= NOW()
     AND p.status = 'COMPLETE'
     AND ads.is_deleted = 0
     ORDER BY ads.placement_date DESC
     LIMIT 100
    """;
```

- [ ] **Step 2: Also fix getActiveAdsForFeed query in ArticleService**

At line 770-789, apply same pattern: replace RAND() with `ORDER BY ads.placement_date DESC LIMIT 50`.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/AdController.java
git add src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java
git commit -m "fix: remove RAND() from ads queries, add LIMIT for performance"
```

---

## Verification Checklist (Sacha Must Verify)

After all fixes are deployed, Sacha must verify:

1. **Articles endpoint 403 fix:**
   - [ ] Browser flow: load Laudium Post homepage → articles load without 403
   - [ ] `curl -X POST https://server.safai.co.za/Laudiumbiz/api/v1/articles -H "Content-Type: application/json" -d '{"page":0,"size":10,"status":""}'` returns HTTP 200

2. **Ads placement endpoint 500 fix:**
   - [ ] `curl -X GET "https://server.safai.co.za/Laudiumbiz/api/v1/ads/placement/main_page_ad/all"` returns HTTP 200 with JSON array
   - [ ] `curl -X GET "https://server.safai.co.za/Laudiumbiz/api/v1/ads/placement/sidebar/all"` returns HTTP 200
   - [ ] No HikariPool timeout errors in backend logs after 10+ concurrent requests

3. **Connection leak fixed:**
   - [ ] After deploying, check HikariPool stats: ` HikariPool-1 - Before cleanup statistics (default) ` shows active connections return to idle after requests complete
   - [ ] No `Connection leak detection` warnings in logs

4. **End-to-end browser test:**
   - [ ] Open Laudium Post in browser
   - [ ] Verify articles load on homepage
   - [ ] Verify ads appear in correct placements
   - [ ] No console errors (Error level)

---

## Deploy Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pool size increase causes DB overload | Medium | High | Monitor MySQL connections after deploy. Rollback pool to 10 if CPU spikes. |
| Removing RAND() changes ad rotation behavior | Low | Low | Ads will still appear but in deterministic order (by date). Naazeem may want random rotation — can add seed parameter later. |
| Connection leak fix breaks async flow | Low | High | Test thoroughly on local with concurrent requests before prod deploy. |
| Reverse proxy still blocking POST | Low | Medium | If 403 persists after Spring Security changes, root cause is proxy and requires Chris to check server config. |

---

## PR Closure

All PRs must include `Closes #<ticket-number>` in the body and link to LCP #692.

---

*Plan saved to: docs/superpowers/plans/2026-05-17-laudium-api-failures.md*

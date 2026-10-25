# Laudium Grok/X + MiniMax Web-Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nicolah/Grok as a real Laudium AI provider and add a shared MiniMax web-search backend tool for prompt enrichment across providers.

**Architecture:** Frontend provider selectors route `x` directly to `/api/v1/x/*` endpoints, never to MiniMax as a model fallback. Backend adds a Grok/X service/controller following existing AI-provider patterns and a shared `MiniMaxWebSearchService` used as reusable research infrastructure. Missing external credentials must fail clearly; do not silently fall back or fabricate source articles.

**Tech Stack:** Vue frontend, Java/Spring backend, Azure Boards, Playwright for UI verification, Maven/npm builds.

---

## Source of Truth

- LCP parent task: `#676`
- Approved spec: `C:\Software\SafAi\LaudiumAPP\docs\superpowers\specs\2026-05-14-laudium-grok-minimax-websearch-design.md`
- Anthony handoff: `C:\Users\chris\AppData\Local\Temp\opencode\handoffs\2026-05-14-laudium-grok-minimax-websearch-scoping-handoff.md`
- Frontend repo: `C:\Software\SafAi\LaudiumAPP\Laudium Biz`
- Backend repo: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI`
- Azure work items: `2837` through `2847`, all linked to LCP `#676`

---

## Blockers and Allowed Parallel Work

- Frontend work items `2839`, `2840`, and `2841` can start immediately.
- Backend work items `2842` through `2845` require Chris to provide `xai.api.key`, `minimax.api.key`, `xai.model`, and MiniMax web-search endpoint details before they can be fully verified.
- Sacha may prepare backend code only if it uses explicit configuration names and fail-fast errors; no fake keys, no hidden fallback, and no fabricated data.
- Production/live deployment is out of scope until Chris explicitly approves it.

---
## File Structure

### Frontend

- Modify `C:\Software\SafAi\LaudiumAPP\Laudium Biz\src\views\Admin\Articles\SourceArticles.vue`
  - Keep `x` visible as Nicolah.
  - Remove the current `x -> minimax` unavailable/fallback behavior.
- Modify `C:\Software\SafAi\LaudiumAPP\Laudium Biz\src\components\Modals\RefineArticleModal.vue`
  - Add `x`/Nicolah to the refine provider options.
- Modify `C:\Software\SafAi\LaudiumAPP\Laudium Biz\src\services\articles.js`
  - Resolve existing merge-conflict markers around provider mapping.
  - Ensure `x` maps to `/x/*` endpoints and MiniMax is not exposed as a provider selector.

### Backend

- Create `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI\src\main\java\com\laudiumbiz\Laudiumbiz\Services\MiniMaxWebSearchService.java`
- Create `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI\src\main\java\com\laudiumbiz\Laudiumbiz\Services\GrokService.java`
- Create `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI\src\main\java\com\laudiumbiz\Laudiumbiz\Controllers\ai\GrokController.java`
- Modify `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI\src\main\resources\application.properties`

---

## Task 1: Frontend provider routing and selector cleanup

**Azure:** `2839`, `2840`, `2841`

**Files:**
- Modify: `src/views/Admin/Articles/SourceArticles.vue`
- Modify: `src/components/Modals/RefineArticleModal.vue`
- Modify: `src/services/articles.js`

- [ ] **Step 1: Inspect existing selector values**

Run:
```powershell
rg "minimax|gemini|gpt|perplexity|x" "C:\Software\SafAi\LaudiumAPP\Laudium Biz\src\views\Admin\Articles\SourceArticles.vue" "C:\Software\SafAi\LaudiumAPP\Laudium Biz\src\components\Modals\RefineArticleModal.vue" "C:\Software\SafAi\LaudiumAPP\Laudium Biz\src\services\articles.js"
```
Expected: identify the existing `x` option in SourceArticles, missing `x` in RefineArticleModal, and provider routing in `articles.js`.

- [ ] **Step 2: Remove x-to-minimax fallback in SourceArticles**

Change the handler so `x` remains `x`. If code currently converts `x` to `minimax` or shows an unavailable alert, delete that conversion/alert. Expected behavior: choosing Nicolah does not show an unavailable popup.

- [ ] **Step 3: Add Nicolah to RefineArticleModal provider list**

Add exactly this provider option shape, adapted to the existing array style:
```js
{ label: 'Nicolah', value: 'x' }
```
Expected: provider buttons include Nicolah and emit/select `x`.

- [ ] **Step 4: Resolve provider mapping in articles.js**

Remove any merge-conflict markers first. Ensure provider `x` builds URLs with the backend provider segment `x`, not `minimax`. Keep existing response shapes unchanged.

- [ ] **Step 5: Build frontend**

Run:
```powershell
npm run build
```
Working directory: `C:\Software\SafAi\LaudiumAPP\Laudium Biz`
Expected: build completes successfully.

- [ ] **Step 6: Browser verification for frontend-only behavior**

Use Playwright against the configured local/test frontend. Navigate to Source Articles and Refine Article modal. Evidence required:
- Screenshot showing Nicolah in Source Articles selector.
- Screenshot showing Nicolah in RefineArticleModal.
- Screenshot or trace proving selecting Nicolah does not show unavailable popup.

- [ ] **Step 7: Update Azure work items**

Add evidence comments to Azure IDs `2839`, `2840`, and `2841`. Close each only after build and browser evidence pass.

---

## Task 2: Backend Grok/X and MiniMax web-search implementation

**Azure:** `2842`, `2843`, `2844`, `2845`

**Files:**
- Create: `src/main/java/com/laudiumbiz/Laudiumbiz/Services/MiniMaxWebSearchService.java`
- Create: `src/main/java/com/laudiumbiz/Laudiumbiz/Services/GrokService.java`
- Create: `src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/ai/GrokController.java`
- Modify: `src/main/resources/application.properties`

- [ ] **Step 1: Confirm existing controller/service contracts**

Read:
- `Controllers/ai/PerplexityController.java`
- `Controllers/ai/ChatGPTController.java`
- `Controllers/ai/GeminiController.java`
- `Services/NewsAIService.java`

Expected: document exact request/response methods to mirror for `/api/v1/x`.

- [ ] **Step 2: Add explicit configuration keys**

Add property names only; do not commit real secrets:
```properties
xai.api.key=${XAI_API_KEY:}
xai.model=${XAI_MODEL:}
xai.base-url=${XAI_BASE_URL:https://api.x.ai/v1}
minimax.api.key=${MINIMAX_API_KEY:}
minimax.web-search.base-url=${MINIMAX_WEB_SEARCH_BASE_URL:}
```
Expected: app reads env-backed config and fails clearly when required runtime values are blank.

- [ ] **Step 3: Create MiniMaxWebSearchService**

Implement a Spring service with one public method that accepts a query string and returns structured result data. Required behavior:
- If `minimax.api.key` is blank, throw a clear configuration exception.
- If `minimax.web-search.base-url` is blank, throw a clear configuration exception.
- Do not return fabricated search results.
- Do not silently call another provider.

- [ ] **Step 4: Create GrokService**

Implement a Spring service following existing provider service patterns. Required behavior:
- If `xai.api.key` is blank, throw a clear configuration exception.
- If `xai.model` is blank, throw a clear configuration exception.
- Return the same shapes existing frontend flows expect from GPT/Gemini/Perplexity.
- Use MiniMax web-search enrichment only as explicit backend tool infrastructure, not as a frontend provider fallback.

- [ ] **Step 5: Create GrokController**

Add controller base path `/api/v1/x` and mirror these endpoints:
```text
GET  /sourceArticles/all
GET  /sourceArticles/{id}
POST /sourceArticles/byIds
POST /generate-article
POST /generate-article/by-id
POST /generate-articles/bulk
POST /refine-article/{sourceId}
```

- [ ] **Step 6: Build backend**

Run:
```powershell
mvn clean package -DskipTests
```
Working directory: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI`
Expected: build succeeds. Runtime provider calls may remain blocked until Chris supplies credentials.

- [ ] **Step 7: Update Azure work items**

Add implementation/build evidence to Azure IDs `2842`, `2843`, `2844`, and `2845`. Do not close API-key-dependent work until credential-backed verification is possible, unless the ticket scope is explicitly reduced to code skeleton/config only by Alex.

---

## Task 3: Full verification after credentials are available

**Azure:** `2846`, `2847`

- [ ] **Step 1: Configure test environment with Chris-provided values**

Required values:
- `XAI_API_KEY`
- `XAI_MODEL`
- `MINIMAX_API_KEY`
- `MINIMAX_WEB_SEARCH_BASE_URL`

Expected: no secrets committed to git; values injected through environment/deployment config.

- [ ] **Step 2: Verify backend endpoints**

Exercise the `/api/v1/x/*` endpoints from Anthony's handoff with real credentials. Expected:
- Grok/X endpoints return successful response shapes matching existing providers.
- MiniMax web-search errors are explicit if the vendor endpoint fails.
- No placeholder/fabricated articles are returned.

- [ ] **Step 3: Run Playwright E2E**

Flow:
1. Navigate to Source Articles page.
2. Select Nicolah.
3. Confirm no unavailable popup.
4. Click refresh/fetch source articles.
5. Select one source article.
6. Generate a full article.
7. Verify web-sourced evidence appears in the result.

Evidence required: screenshots or trace for each user-visible milestone.

- [ ] **Step 4: Close Azure work items with evidence**

Close `2846` and `2847` only after credential-backed backend verification and Playwright E2E pass. Then update/close parent user stories `2837` and `2838` if all children are closed.

---

## Self-Review

- Spec coverage: covers Grok as provider, MiniMax as backend tool, frontend selectors, backend endpoints, fail-fast config, Azure tickets, and E2E verification.
- No placeholders: real secrets are intentionally excluded; required env names and exact blocked values are listed.
- Scope guard: no MiniMax media/document generation, no VukaaFrontEND, no backend zip, no production deploy.

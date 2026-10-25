# CHANGES

## 2025-08-29 - Add mail properties to application.properties
- Added standard Spring Boot Mail (SMTP) properties to `src/main/resources/application.properties`:
  - `spring.mail.host`, `spring.mail.port`, `spring.mail.username`, `spring.mail.password`
  - `spring.mail.properties.mail.smtp.auth`, `spring.mail.properties.mail.smtp.starttls.enable`
  - timeouts (`connectiontimeout`, `timeout`, `writetimeout`)
  - `spring.mail.from` (custom optional sender)
- Used environment-variable placeholders with sane defaults so production can override without code changes.
- Verified project builds successfully after property additions.

Notes:
- Email sending is implemented via `EmailService`. If you want Spring Boot to auto-configure the `JavaMailSender` from these properties, consider removing or updating `MailConfig` to use the configured properties instead of defaults.

```sql
ALTER TABLE `ads`
	ADD COLUMN `design_ad` TINYINT(1) NULL DEFAULT 0 AFTER `updated_at`;
CREATE TABLE `ad_images` (
	`ad_id` BIGINT NOT NULL,
	`media_id` BIGINT NOT NULL,
	CONSTRAINT `advert_id_key` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT `media_id_key` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';

```
2025-10-19 - Junie
- Updated Spring Security CORS configuration in src\main\java\com\laudiumbiz\Laudiumbiz\security\SecurityConfig.java to use setAllowedOriginPatterns(...) instead of setAllowedOrigins(...).
- Added support for laudiumbiz.co.za (including subdomains and dynamic ports) and local IP ranges (localhost, 127.0.0.1, 0.0.0.0, and 192.168.*.* on any port) while keeping allowCredentials(true).
- Preserved allowed methods, headers, exposed headers, and maxAge settings.

2025-10-19 - Junie
- Changed article listing sort order to newest-first in ArticleService.getAllArticles by using ORDER BY COALESCE(scheduled_for, created_at) DESC, id DESC.
- Tagged ArticleController.getAllArticles with @ModifiedByJunie 2025-10-19 per REST API rules.
- Updated docs/api.yaml to document /api/v1/articles POST with newest-first ordering and runnable example request/response.

2025-10-29 - Junie
- Removed sample/demo seed data from src\\main\\resources\\data.sql (file emptied) to ensure no demo data ships with the project.
- Verified application.properties does not auto-load data.sql (spring.sql.init.* lines are commented), so no seed data is applied at runtime.

2025-10-30 - Junie
- Centralized Cloudinary transformation to enforce transparent backgrounds on all uploaded images.
- Added helper methods in CloudinaryService to inject `e_make_transparent:10,q_auto,f_png` after `/upload/` in returned URLs, ensuring PNG format to preserve alpha channel.
- Updated docs/api.yaml example coverUrl to reflect transformed Cloudinary URL.
- Verified project builds successfully.

2025-11-03 - Junie
- Updated CloudinaryService to always inject `e_make_transparent:5,co_rgb:ead7bd,q_auto,f_png` into all returned upload URLs to match design requirement.
- Replaced previous default `e_make_transparent:10` with `5` and added `co_rgb:ead7bd` color targeting.
- Change is centralized in CloudinaryService.withTransparencyDefaults(...) and applied in uploadImage(...).
- Verified project builds successfully.

2025-11-03 - Junie
- Media endpoint now enforces Cloudinary transform for all URLs returned from DB.
- MediaController.applyCloudinaryTransformations(...) updated to ensure `e_make_transparent:5,co_rgb:ead7bd` is present; if missing it is prepended, otherwise left intact; always ensures `q_auto,f_auto` and appends width/height from storyType.
- Tagged MediaController.getImage with @ModifiedByJunie 2025-11-03.
- Example: `/api/v1/media/41?storyType=top` returns `{"url":"https://.../upload/e_make_transparent:5,co_rgb:ead7bd,q_auto,f_auto,w_170,h_368/..."}`.

2025-11-03 - Junie
- Fix 404 Cloudinary URLs from media endpoint when original URL had no existing transform.
- Root cause: the code treated the version segment (e.g., `v1754161380`) after `/upload/` as a transform and inserted width/height before it, yielding an invalid transformation string (`...,q_auto,f_auto,v1754...,w_170,h_192/...`).
- Change: In MediaController.applyCloudinaryTransformations(...), detect first segment `^v\\d+$` and treat it as part of the path (rest), not a transform. Now required transforms are injected before the version: `/upload/e_make_transparent:5,co_rgb:ead7bd,q_auto,f_auto,w_170,h_192/v1754.../public_id.png`.
- Idempotent behavior retained and build verified.

2025-11-03 - Junie
- Enforced transparent background and printed, colourful, sharp style for all AI-generated images.
- Refined GPTService.generateImage(...) with explicit style instructions (printed newspaper aesthetic, subtle halftone/grain, vivid yet natural colours, high contrast, crisp edges, no blur) and ensured output PNG with background=transparent.
- Confirmed all controllers (ChatGPT, Gemini, Perplexity) use GPTService for generation and CloudinaryService.uploadImage for upload; CloudinaryService continues to inject `e_make_transparent:5,co_rgb:ead7bd,q_auto,f_png`.
- Updated docs/api.yaml example coverUrl to reflect required Cloudinary transform.
- No REST routes changed; OpenAPI examples remain runnable.

2025-11-03 - Junie
- AI Thumbnail endpoint `/api/v1/ai/articles/generate-thumbnail` now explicitly documented in docs/api.yaml with runnable request/response examples.
- Tagged AIArticleController.generateThumbnail with @ModifiedByJunie 2025-11-03 and verified it uses GPTService.generateImage(prompt, null, model, n) which fixes size to 1024x1536, PNG output, background=transparent.
- No DTO changes; endpoint returns raw base64 string as text/plain (documented accordingly).

2025-11-04 - Junie
- Fix: `/api/v1/articles` returned empty `articles` array while `total > 0` when `type` was blank. Root cause was a NULL-excluding predicate `AND article_type LIKE '%%'` applied only to the SELECT query, causing mismatch with COUNT and filtering out rows where `article_type` is NULL.
- Change: In `ArticleService.getAllArticles(...)`, when `type` is null/blank we now skip adding any `article_type` predicate entirely for both SELECT and COUNT (no-op). When provided, filter remains `article_type = '<type>'`.
- Also aligned ordering to spec: `ORDER BY COALESCE(scheduled_for, created_at) DESC, id DESC`.
- No API contract changes; examples remain valid. Build verified.

2025-11-04 - Junie
- Fix: Article update did not persist new image URL when client sent a direct URL (not base64). `ArticleService.updateArticle(...)` assumed base64 and always tried to re-upload; when URL was provided it was ignored.
- Change: Update flow now accepts either base64 or direct http(s) URL for both coverImage and thumbnailImage. If a URL is provided, it is saved directly to the existing/new Media.file; if base64 is provided, it is uploaded via CloudinaryService and the returned URL is saved. Old Cloudinary asset is deleted only when a new upload occurred (not when just switching URL pointers).
- Build verified. No API/DTO changes required. Verification: PUT /api/v1/articles/{id} with { coverImage: "https://...", thumbnailImage: "...base64..." } updates respective media URLs accordingly.

2025-11-04 - Junie
- Feature: Allow article author to be set via the API. The backend now respects `authorId` on create and update.
- Implementation:
  - ArticleService.createArticle(...) sets `author_id` from `ArticleRequest.authorId` when provided and numeric; otherwise falls back to the authenticated publisher’s id.
  - ArticleService.updateArticle(...) updates `author_id` only if `authorId` is provided and valid; otherwise preserves the existing author.
  - Tagged ArticleController.createArticle with `@ModifiedByJunie 2025-11-04`.
  - Updated docs/api.yaml to document `authorId` for create and update endpoints with runnable examples.
- No database schema changes were required; uses existing `articles.author_id` column.

2025-11-04 - Junie
- Enforce HTML paragraphs for AI-generated article content across providers (ChatGPT, Gemini, Perplexity).
- Each provider now normalizes the generated article body so every paragraph is wrapped in <p>…</p> and basic inline HTML is preserved/added (bold/italic/links).
- Changes:
  - ChatGPTNewsService: added normalizeToHtmlParagraphs(...) and applied before returning ArticleGenerated.
  - GeminiService: added normalizeToHtmlParagraphs(...) and applied to ArticleGenerated.article.
  - PerplexityService: added normalizeToHtmlParagraphs(...) and applied both in generateArticle() and generateArticleWithMetadata().
- OpenAPI docs updated (docs/api.yaml) to state `ArticleGenerated.article` is HTML with <p> tags.
- This satisfies requirement: “when generating article make sure the ai return the article text each paragraph wrapped with a <p> and inside of that more html tags”.

2025-10-30 - Junie
- Fixed potential SQL precedence bug in ArticleService.getAllArticles search filter by parenthesizing OR conditions (title LIKE ... OR summary LIKE ...), preventing malformed WHERE logic that could lead to runtime errors or incorrect results.
- No API contract changes were made; only internal query construction was corrected.
- Verified project builds successfully.

2025-10-30 - Junie
- Ads: On create, API response now includes a logical `type` field that defaults to `MAIN_PAGE_ADD` to satisfy the business rule "on add type add type MAIN_PAGE_ADD" without changing the database schema.
- Implemented by adding a `type` property to AdResponseDTO and returning DTO from AdController.create(). Existing DB remains unchanged since `ads` table has no `type` column in MCQL/schema.
- Verified build successfully.

2025-11-04 - Junie
- AI article generation now expects and returns sources.
- GPTService.generateArticle system prompt updated to require JSON ONLY with fields {title, article (HTML with <p> ... </p>), summary, slug, sources} and to include exactly four reputable HTTPS sources.
- Consolidation: Removed temporary generateArticleClean(...) and moved OpenAI envelope parsing, markdown fence stripping, and 4-sources validation directly into GPTService.generateArticle(...) as requested (no new methods). AIArticleController now calls generateArticle(...) and remains thin. Tagged controller with @ModifiedByJunie 2025-11-04.
- OpenAPI docs updated to include /api/v1/ai/generate-article with full runnable example including four sources.
- No new DTO classes introduced to keep changes minimal; existing ArticleGenerated model remains compatible.

### Summary of what we’re continuing
You asked to extend the AIController to support creating articles from source article IDs (single and bulk), save generated articles as drafts, generate and save images as drafts as well, and to mark source articles as processed once used. You also asked to change the existing create/generate article endpoint to accept an ID (not a free-form prompt) and to derive the prompt from the source_article.

Below is a complete, actionable plan: what to change, new/updated interfaces and DTOs, and how to implement the controllers and service calls. It is aligned with the codebase you shared (NewsAIService, GPTService.generateImage, Articles/SourceArticles models, existing AI controllers).

---

### High-level TODO checklist
1) Contracts and DTOs
- Add new DTOs for ID-based requests:
    - ArticleByIdRequest { Integer id }
    - BulkArticleByIdsRequest { List<Integer> ids

2) AiController interface updates
- Change method signature for generateArticle to accept an ID-based DTO (or a path variable), not a prompt.
- Add a bulk endpoint method for multiple IDs.

3) Controllers (ChatGPTController, GeminiController, PerplexityController)
- Update /generate-article endpoint to derive prompt from SourceArticles by ID and call NewsAIService.generateArticle(prompt).
- Add /generate-articles/bulk (or /create-multiple-articles) to handle multiple IDs in one call.
- Look at how /v1/ai/articles/generate-thumbnail works and make sure you follow the same pattern and generate a thumbnail for each article. Once its generate add it to cloudflare and save the url to the article.
- After generating each article, persist as Articles with status = "draft".
- Mark each consumed SourceArticles row processing_status = "processed" (exact casing required by your instruction) immediately after successful generation and persistence.
- return, an email will be sent once we are done.
- once done send an email. Implement an email service.

4) Services and utilities
- Prompt builder: Create a small utility that converts SourceArticles DB record into a model prompt string (title, summary, url).
- Media persistence: If you don’t already have a utility, add a helper service to download/store the generated image file to disk and create a Media DB record.
- Source article repository helpers: Add findById, findAllByIds, and updateProcessingStatus helpers using your SQLMapper pattern.

5) Data layer changes
- SourceArticles.processing_status is already a String. No schema changes required. Use value "processed" per your requirement. also add en enum called processing_status_enum.
- Articles: Set status = "draft" when saving generated output; also set created_at, updated_at.

6) Swagger/OpenAPI updates
- Update request/response models and descriptions in SwaggerConfig.

7) Tests and validation
- Validate IDs list non-empty, deduplicate IDs, and short-circuit on missing/invalid IDs with a clear error. Partial success for bulk.
- Ensure generated image errors do not prevent article draft creation (configurable behavior), but they should be logged and surfaced per item.

8) Add a route show sourced_artciles to get all source articles.
- create a route to get all source articles whith date and status and platform search by.
---

### Interface changes (AiController)
Current:
- ResponseEntity<?> generateArticle(@Valid @RequestBody PromptRequest request)
- ResponseEntity<?> getAllSourceArticles()

Proposed:
- ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) throws IOException
- ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) throws IOException
- ResponseEntity<?> getAllSourceArticles()

If you want to keep the same URL but change semantics, annotate accordingly in each controller and deprecate the old prompt-based one.

Example interface:
- generateArticleById: POST /generate-article (body: { id })
- createMultipleArticles: POST /generate-articles/bulk (body: { ids: [...] })

---

### DTOs to add
- ArticleByIdRequest
    - id: Integer (required)

- BulkArticleByIdsRequest
    - ids: List<Integer> (required, size >= 1)

- Optional ImageGenOptions (if you want external control):
    - size: String (e.g., "1024x1024"; default="1024x1024")
    - model: String (default="gpt-image-1" or your configured one)
    - n: Integer (default=1)

---

### How to build the prompt from SourceArticles
Fetch SourceArticles (DB) by ID, then compose a factual prompt for article generation:
- Title
- Summary
- Platform
- Author
- Timestamp text
- URL
- Type
- Hashtags
- Any additional data json

Example prompt template:
- "Using the following source post data, write a news-style article with a compelling title, a concise summary paragraph, and a cleanly structured article body (subheadings allowed). Ensure factual consistency with the source. Include a list of sources as URLs at the end.\n\nSource:\n- Title: {title}\n- Platform: {platform}\n- Author: {author}\n- Timestamp: {timestamp_text}\n- URL: {url}\n- Type: {type}\n- Summary: {summary}\n- Hashtags: {hashtags}\n- Additional Data: {additional_data_json}\n\nReturn JSON with: title, summary, article, and slug (slugify title)."

Then call NewsAIService.generateArticle(prompt).

---

### Controller implementation outline
Below is a concise implementation plan for each controller class (Gemini, ChatGPT, Perplexity). The logic is the same; only bean qualifiers differ.

1) Dependencies to inject into controllers:
- NewsAIService (already present per controller)
- ErrorHandlig (already present per controller)
- GPTService (for image generation)
- A small persistence/helper service to:
    - Fetch SourceArticles rows by ID(s)
    - Build prompt string
    - Save Articles drafts
    - Save image to Media and associate with the new Articles
    - Update SourceArticles.processing_status = "processed"

2) Single article endpoint
- Signature: generateArticleById(@RequestBody ArticleByIdRequest request)
- Steps:
    - Validate request.id not null
    - Fetch SourceArticles row by id; 404 if not found
    - Build prompt string
    - ArticleGenerated generated = newsAIService.generateArticle(prompt)
    - Persist Articles as draft:
        - title = generated.title
        - slug = generated.slug (or generate from title if absent)
        - summary = generated.summary
        - content = generated.article
        - status = "draft"
        - created_at, updated_at = now
    - Generate image(s):
        - String imageResponse = gptService.generateImage(imagePrompt, size, model, n)
        - Parse URL/base64 from response
        - Download (if URL), save file to media storage, create Media row
        - Link Articles.cover_id (and optionally thumbnail_id)
    - Update SourceArticles.processing_status = "processed"
    - Return a response object: { articleId, slug, title, imageMediaId, sourceId, status: "draft" }

3) Bulk endpoint
- Signature: createMultipleArticles(@RequestBody BulkArticleByIdsRequest request)
- Steps:
    - Validate list not empty; deduplicate
    - Fetch all source rows present; compute missing ids to report
    - For each found id, perform the same steps as single endpoint
    - Build an array of per-item results with success/error per id
    - Return aggregate response: { totalRequested, totalSuccess, totalFailed, results: [...] }

4) Image prompt suggestion
- Use the generated article title + a short description to drive the image model, for example:
    - "Create a high-quality editorial cover photo illustration for an online news article titled '{title}'. Style: photo-realistic, 16:9, crisp focus, news magazine, no text."
- Consider adding topic keywords from hashtags or summary.

---

### Code-level notes and signatures
1) AiController.java
- Replace:
    - ResponseEntity<?> generateArticle(@Valid @RequestBody PromptRequest request)
- With:
    - ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) throws IOException
    - ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) throws IOException
    - Keep: ResponseEntity<?> getAllSourceArticles()

2) New DTO files
- ArticleByIdRequest.java
    - Fields: @NotNull Integer id
- BulkArticleByIdsRequest.java
    - Fields: @NotEmpty List<@NotNull Integer> ids

3) Controller method mappings
- POST /api/v1/{provider}/generate-article -> generateArticleById
- POST /api/v1/{provider}/generate-articles/bulk -> createMultipleArticles
- GET  /api/v1/{provider}/sourceArticles/all -> unchanged

4) Articles persistence example (pseudo):
- Articles a = new Articles();
    - a.setTitle(g.getTitle());
    - a.setSlug(g.getSlug());
    - a.setSummary(g.getSummary());
    - a.setContent(g.getArticle());
    - a.setStatus("draft");
    - a.setCreated_at(now);
    - a.setUpdated_at(now);
    - a.setDB(SQL.DB).save();
- If you have category/author defaults, set them here.

5) Image generation and media persistence
- String imgRes = gptService.generateImage(imagePrompt, "1024x1024", "gpt-image-1", 1);
- Parse the returned JSON (URL or base64). If URL, download to your media folder; if base64, decode to a file.
- Media m = new Media();
    - m.setFile("/uploads/..../generated_...png");
    - m.setCreated_at(now);
    - m.setUpdated_at(now);
    - m.setDB(SQL.DB).save();
- Link article:
    - a.setCover_id(m.getId()); a.setDB(SQL.DB).update();
    - Optionally generate a smaller thumbnail and save as separate Media -> a.setThumbnail_id(...)

6) Mark source article as processed
- SourceArticles sa = new SourceArticles().setDB(SQL.DB).find(id.toString());
- sa.setProcessing_status("processed"); sa.setUpdated_at(now);
- sa.setDB(SQL.DB).update();

---

### Interface and controllers: concrete sketches
Note: Replace provider path with gemini, perplexity, chatgpt per controller, and wire the correct @Qualifier for NewsAIService.

- AiController.java
    - public interface AiController {
        - ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) throws IOException;
        - ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) throws IOException;
        - ResponseEntity<?> getAllSourceArticles();
    - }

- GeminiController.java
    - @PostMapping("/generate-article")
        - public ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) {...}
    - @PostMapping("/generate-articles/bulk")
        - public ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) {...}

- Same for ChatGPTController and PerplexityController.

---

### Implementation steps (ordered)
1) Create DTOs: ArticleByIdRequest, BulkArticleByIdsRequest (+ optional ImageGenOptions).
2) Update AiController.java signatures and Javadoc.
3) Update each AI controller class to:
    - Replace generate-article endpoint to accept ArticleByIdRequest.
    - Add generate-articles/bulk endpoint.
    - Inject GPTService and a new helper service (e.g., ArticleCreationService) to encapsulate the workflow.
4) Add ArticleCreationService (new service):
    - Methods:
        - ArticleCreationResult createDraftFromSource(Integer sourceId)
        - List<ArticleCreationResult> createDraftsFromSources(List<Integer> sourceIds)
    - Responsibilities:
        - Load SourceArticles by ID
        - Build prompt string
        - Call NewsAIService.generateArticle(prompt)
        - Persist Articles as draft
        - Generate image via GPTService.generateImage and persist Media
        - Link Media to Article
        - Mark SourceArticles.processing_status = "processed"
5) Add small utility class PromptBuilderFromSource to produce consistent prompts from SourceArticles.
6) Add ImageStorageService to download/convert image response into disk file, then build Media model and save. Reuse MediaController conventions/paths.
7) Error handling:
    - Wrap each item in try/catch; if image generation fails, still return the article draft result but note imageError.
    - Use ErrorHandlig for consistent API errors.
8) Update SwaggerConfig to expose new endpoints and DTO schemas.
9) Manual tests with a few source IDs; verify saved drafts and linked media.

---

### Edge cases and safeguards
- Missing source ID: return 404 for single; for bulk, include per-id error entry.
- Duplicate IDs: deduplicate before processing.
- Large bulk: rate-limit or process in small batches to avoid hitting provider limits.
- Provider failures: surface per-id error message; do not mark source as processed if article generation failed.
- Idempotency: If you may be called twice for the same source ID, choose a policy:
    - Either detect existing Articles for source and skip, or
    - Allow multiple drafts; add a unique suffix to slug.
- Image storage: Ensure write location is accessible; handle base64 size and file type; sanitize filenames by article slug and timestamp.

---

### What you’ll deliver
- Updated AiController interface
- New DTOs (ArticleByIdRequest, BulkArticleByIdsRequest)
- Updated Gemini/Perplexity/ChatGPT controllers (2 endpoints each)
- New ArticleCreationService, PromptBuilderFromSource, ImageStorageService
- Wiring in Spring for services
- Swagger docs updated

If you want, I can draft the exact Java code for the DTOs, the interface, and the controller methods next.
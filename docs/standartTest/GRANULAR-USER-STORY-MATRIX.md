# GRANULAR USER STORY TEST MATRIX — LCP #712
**Scope:** Laudium Post full frontend browser standard test suite
**Granularity standard:** Per URL, per screen, per control/action, per visible state
**Author:** Anthony (Project Manager)
**Based on inspection of:** `C:\Software\SafAi\LaudiumAPP\Laudium Biz` (src/views, src/router, src/components, src/services)
**Date:** 2026-05-17
**Supersedes:** Section 3 of `LCP712_HANDOVER_BRIEF.md` (Chris rejected high-level matrix)

---

## GRANULARITY STANDARD (Chris directive)

Every test must include ALL of:
1. **Test ID** — e.g. `EDIT-001`
2. **Frontend URL/route** — exact route pattern
3. **Screen/component** — exact component name
4. **User story** — `[Persona] wants to [action] so that [outcome]`
5. **Precondition/test data** — what must exist before the test
6. **Exact browser steps** — numbered click/type sequences
7. **Expected visible result** — exact UI text/element user sees
8. **Expected network/API call(s)** — exact endpoint + method + payload shape
9. **Backend/log/data verification** — DB record, log entry
10. **Cleanup/reset** — how to leave env clean
11. **Evidence required** — screenshot, HAR, API response snippet, console export
12. **Automation status** — `Automatable` / `Manual` / `Needs credential` / `Needs external API`

**NOT ACCEPTABLE:** "Article CRUD" as a single test, or "Edit article screen" without enumerating every button/field.

---

## ROUTE INVENTORY (57 routes total)

### PUBLIC ROUTES (21 routes)
| Route ID | Route Pattern | View File | Screen Name |
|----------|--------------|-----------|-------------|
| PUB-001 | `/` | `views/News/News.vue` | Newspaper Gallery Homepage |
| PUB-002 | `/news` | `views/News/News.vue` | Latest News Listing |
| PUB-003 | `/news/archive` | `views/News/Archive.vue` | News Archive |
| PUB-004 | `/news/:slug` | `views/Article/Article.vue` | Article Detail |
| PUB-005 | `/categories/:slug` | `views/Category/Index.vue` | Category Filter |
| PUB-006 | `/tags/:slug` | `views/Tag/Index.vue` | Tag Filter |
| PUB-007 | `/community` | `views/Community/Index.vue` | Community Notices |
| PUB-008 | `/community/:slug` | `views/Community/Notice.vue` | Notice Detail |
| PUB-009 | `/announcements` | `views/Announcements/Index.vue` | Announcements |
| PUB-010 | `/directory` | `views/Directory/Index.vue` | Business Directory |
| PUB-011 | `/directory/:slug` | `views/Directory/Item.vue` | Directory Item |
| PUB-012 | `/events` | `views/Events/Events.vue` | Community Events |
| PUB-013 | `/search` | `views/Search/Search.vue` | Search Results |
| PUB-014 | `/podcasts` | `views/YouTube/Index.vue` | YouTube Podcasts |
| PUB-015 | `/terms-of-use` | `views/TermsOfUse.vue` | Static: Terms |
| PUB-016 | `/privacy-policy` | `views/PrivacyPolicy.vue` | Static: Privacy |
| PUB-017 | `/about` | `views/AboutPublisher.vue` | Static: About |
| PUB-018 | `/editorial-policy` | `views/EditorialPolicy.vue` | Static: Editorial |
| PUB-019 | `/corrections` | `views/CorrectionsPolicy.vue` | Static: Corrections |
| PUB-020 | `/payment/success/:id` | `views/Payment/Success.vue` | Payfast Success |
| PUB-021 | `/payment/cancel/:id` | `views/Payment/Cancelled.vue` | Payfast Cancel |

### ADMIN ROUTES (27 routes)
| Route ID | Route Pattern | View File | Screen Name |
|----------|--------------|-----------|-------------|
| ADM-001 | `/admin/login` | `views/Admin/AdminLogin.vue` | Admin Login |
| ADM-002 | `/admin/dashboard` | `views/Admin/Dashboard/Index.vue` | Admin Dashboard |
| ADM-003 | `/admin/articles` | `views/Admin/Articles/Index.vue` | Articles List |
| ADM-004 | `/admin/articles/prompt` | `views/Admin/Articles/ArticlePromptView.vue` | Article Prompt Modal |
| ADM-005 | `/admin/articles/create` | `views/Admin/Articles/Create.vue` | Create Article |
| ADM-006 | `/admin/articles/edit/:id` | `views/Admin/Articles/Edit.vue` | Edit Article |
| ADM-007 | `/admin/articles/prompts` | `views/Admin/Articles/PromptManager.vue` | Manage AI Prompts |
| ADM-008 | `/admin/source-articles` | `views/Admin/Articles/SourceArticles.vue` | Source Articles |
| ADM-009 | `/admin/ads` | `views/Admin/Ads/Index.vue` | Ads List |
| ADM-010 | `/admin/ads/create` | `views/Admin/Ads/AdForm.vue` | Create Ad |
| ADM-011 | `/admin/ads/edit/:id` | `views/Admin/Ads/AdForm.vue` | Edit Ad |
| ADM-012 | `/admin/ads/payments` | `views/Admin/Ads/Payments/Index.vue` | Ad Payments |
| ADM-013 | `/admin/ads/ad-placements` | `views/Admin/AdPlacements/Index.vue` | Ad Placements |
| ADM-014 | `/admin/businesses` | `views/Admin/Businesses/Index.vue` | Businesses |
| ADM-015 | `/admin/announcements` | `views/Admin/Announcements/Index.vue` | Announcements List |
| ADM-016 | `/admin/announcements/create` | `views/Admin/Announcements/CreateOrEdit.vue` | Create Announcement |
| ADM-017 | `/admin/announcements/edit/:id` | `views/Admin/Announcements/CreateOrEdit.vue` | Edit Announcement |
| ADM-018 | `/admin/announcements/categories` | `views/Admin/Announcements/Categories.vue` | Announcement Categories |

### BUSINESS ROUTES (9 routes)
| Route ID | Route Pattern | View File | Screen Name |
|----------|--------------|-----------|-------------|
| BIZ-001 | `/business/login` | `views/Business/Login.vue` | Business Login |
| BIZ-002 | `/business/register` | `views/Business/Register.vue` | Business Register |
| BIZ-003 | `/business/dashboard` | `views/Business/Dashboard/Index.vue` | Business Dashboard |
| BIZ-004 | `/business/ads` | `views/Business/Ads/Index.vue` | Business Ads |
| BIZ-005 | `/business/advertise` | `views/Business/AdvertiseWithUs.vue` | Advertise With Us |
| BIZ-006 | `/business/payments` | `views/Business/Payments/Index.vue` | Business Payments |

---

## SECTION 1: ARTICLE EDIT SCREEN — `/admin/articles/edit/:id`

**Screen file:** `src/views/Admin/Articles/Edit.vue`
**Component refs:** `ArticlePromptModal` (modal), `RefineArticleModal` (modal), `TagSelector`
**Services:** `articles.js` — `getArticle`, `editArticle`, `removeArticle`, `generateArticleThumbnail`, `findArticleSources`, `factCheckArticle`
**AI composable:** `useRefinementHistory`

### User Success Story
When an admin opens an existing article to edit it, they can change any field (title, slug, summary, content, image, category, type, status, tags, sources), run AI Rewrite, AI Fact Check, AI Find Sources, AI Regenerate Image, generate audio, change slug, and publish — and each action shows an immediate visible result and persists correctly to the backend.

---

### EDIT-001: Edit Article — Load Article Data
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-001` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` |
| **User Story** | As an admin, I want the article form pre-populated with existing data when I open the edit screen, so I can see what I'm changing. |
| **Precondition** | Article with known `:id` exists in DB. Admin is logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles`. 2. Click article row (or preview button). 3. URL changes to `/admin/articles/edit/:id`. |
| **Expected Visible Result** | Form fields (title, slug, summary, content Quill editor, category dropdown, type dropdown, status dropdown, tags) are pre-filled with existing values. Cover image displays in preview. Status badge shows correct status. Article ID badge shows `:id`. |
| **Expected Network Call** | `GET /laudium/api/v1/articles/:id` → 200 with article JSON including `title`, `slug`, `summary`, `content`, `cover.file`, `thumbnail.file`, `audio.file`, `category.id`, `article_type`, `status`, `tags[]`, `sources[]` |
| **Backend/Data Verification** | Response contains all fields matching DB record. `categoryId` maps to `category.id`. `articleType` maps to `article_type`. |
| **Cleanup** | Navigate away without saving. |
| **Evidence** | Screenshot of pre-filled form. HAR export of GET article call. |
| **Automation Status** | `Automatable` — no credentials needed if session active. |

---

### EDIT-002: Edit Article — Change Title → Auto Slug Regeneration
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-002` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Title input + Slug input |
| **User Story** | As an admin, I want the slug to auto-regenerate from the title when I change it, so I don't have to type it manually. |
| **Precondition** | Same article loaded as EDIT-001. |
| **Exact Browser Steps** | 1. Clear title field. 2. Type "Breaking News: Major Event in Pretoria". 3. Press Tab or click away. |
| **Expected Visible Result** | Slug field updates to `breaking-news-major-event-in-pretoria` (lowercase, spaces to dashes, special chars removed). |
| **Expected Network Call** | None (client-side only). |
| **Backend/Data Verification** | None yet — slug only persists on save. |
| **Cleanup** | Refresh page to restore original title. |
| **Evidence** | Screenshot of title + auto-updated slug. |
| **Automation Status** | `Automatable`. |

---

### EDIT-003: Edit Article — Manual Slug Regenerate Button
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-003` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Slug input + Regenerate button |
| **User Story** | As an admin, I want a "Regenerate" button to force-slugify the current title, so I can fix slug issues without retyping. |
| **Precondition** | Same article loaded. |
| **Exact Browser Steps** | 1. Click the "Regenerate" button next to slug input. |
| **Expected Visible Result** | Slug field re-populates with slugified version of current title value. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | None yet. |
| **Cleanup** | Refresh page. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### EDIT-004: Edit Article — Change Summary
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-004` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Summary textarea |
| **User Story** | As an admin, I want to edit the article summary, so I can correct or improve the preview text. |
| **Precondition** | Same article loaded. |
| **Exact Browser Steps** | 1. Clear summary textarea. 2. Type new summary text. |
| **Expected Visible Result** | Summary textarea shows new text. Validation error clears if non-empty. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `summary` in payload. |
| **Cleanup** | Refresh page. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### EDIT-005: Edit Article — Change Content (Quill Editor)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-005` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — `QuillEditor` component (id=`content`) |
| **User Story** | As an admin, I want to edit article body content in a rich text editor, so I can add formatting, links, and structure. |
| **Precondition** | Same article loaded. Quill editor initialized. |
| **Exact Browser Steps** | 1. Click into Quill editor. 2. Use keyboard to select all text. 3. Type replacement content OR use toolbar to add formatting. |
| **Expected Visible Result** | Quill editor content updates. HTML tags present in content. `is-invalid` class removes if content non-empty. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `content` as HTML string. |
| **Cleanup** | Refresh page. |
| **Evidence** | Screenshot of editor with new content. HAR of save call. |
| **Automation Status** | `Automatable` — Quill interaction via Playwright. |

---

### EDIT-006: Edit Article — Refine with AI Button Opens Modal
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-006` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — "Refine with AI" button + `RefineArticleModal` |
| **User Story** | As an admin, I want to click "Refine with AI" and get an AI modal to rewrite/refine my article content, so I can improve quality with AI assistance. |
| **Precondition** | Article loaded with non-empty `content`. Admin logged in. |
| **Exact Browser Steps** | 1. Verify content field has text. 2. Click "Refine with AI" button (top-right of content section). |
| **Expected Visible Result** | `RefineArticleModal` appears. Modal has prompt textarea, provider selector, submit button, refinement history list. |
| **Expected Network Call** | `GET /refinements/:articleId` to load refinement history (if any). |
| **Backend/Data Verification** | Modal opens. History fetched. |
| **Cleanup** | Click X or Cancel to close modal. |
| **Evidence** | Screenshot of modal open. HAR of history call. |
| **Automation Status** | `Automatable` — button click + modal state check. |

---

### EDIT-007: Edit Article — Submit AI Refinement → Content Updates
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-007` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` + `RefineArticleModal` + `useRefinementHistory` |
| **User Story** | As an admin, I want to type a refinement prompt and have AI rewrite my content, so I can improve article quality. |
| **Precondition** | Modal open from EDIT-006. Article has content. |
| **Exact Browser Steps** | 1. In modal, type refinement prompt: "Make this more formal". 2. Select provider (e.g. minimax). 3. Click Submit. 4. Wait for AI response. |
| **Expected Visible Result** | Quill editor content updates with refined text. Success toast "Article refined successfully using MINIMAX". Modal closes. |
| **Expected Network Call** | `POST /minimax/refine` with `{sourceId, articleId, prompt, provider, currentContent}` → 200 with refined `content` string. Refinement history appends entry. |
| **Backend/Data Verification** | Response `content` is non-empty string with `<p>` tags. `refinementHistory` composable state updated. |
| **Cleanup** | This test permanently modifies content — document original content for manual restore if needed. |
| **Evidence** | Screenshot before + after. HAR of refine call. Console log of `result.content`. |
| **Automation Status** | `Automatable` but AI-dependent — may need retries. |

---

### EDIT-008: Edit Article — Generate AI Thumbnail (GPT Provider)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-008` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — AI Thumbnail button + imageProvider dropdown (`gpt`/`minimax`) |
| **User Story** | As an admin, I want to click "AI Thumbnail" and get an AI-generated cover image based on my article title, so I don't need to design images manually. |
| **Precondition** | Article loaded. `article.title` non-empty. `article.articleType` selected. Provider = `gpt`. |
| **Exact Browser Steps** | 1. Verify title is non-empty. 2. Verify articleType is selected (featured/top/popular). 3. Select provider = "GPT" from dropdown. 4. Click "AI Thumbnail" button. 5. Wait for generation (spinner shows then disappears). |
| **Expected Visible Result** | Cover image preview updates with AI-generated image. Image is visible in the preview area. Thumbnail auto-generated from cover. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/generate-thumbnail` body `{prompt: <title>, articleType: <type>, imageProvider: "gpt"}` → 200 with base64 PNG image. |
| **Backend/Data Verification** | `imageUpdated` flag set to `true`. On save: `PUT /laudium/api/v1/articles/:id` sends `coverImage` base64. |
| **Cleanup** | Click X on image preview to `removeImage()` — clears `coverBase64` + `thumbnailBase64`. |
| **Evidence** | Screenshot of generated image visible. HAR of thumbnail call showing base64 response. |
| **Automation Status** | `Automatable` — AI-dependent, may need retry on failure. |

---

### EDIT-009: Edit Article — Generate AI Thumbnail (MiniMax Provider)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-009` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — AI Thumbnail button + imageProvider dropdown |
| **User Story** | As an admin, I want to select MiniMax as the image provider and generate a cover image, so I can compare GPT vs MiniMax output quality. |
| **Precondition** | Article loaded. Title non-empty. Provider = `minimax`. |
| **Exact Browser Steps** | 1. Select provider = "MiniMax". 2. Click "AI Thumbnail". 3. Wait. |
| **Expected Visible Result** | Same as EDIT-008 but with MiniMax model. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/generate-thumbnail` with `imageProvider: "minimax"`. |
| **Backend/Data Verification** | Same as EDIT-008. |
| **Cleanup** | Remove image. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### EDIT-010: Edit Article — Remove Generated/Cover Image
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-010` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — X button on cover image preview |
| **User Story** | As an admin, I want to remove a cover image I've uploaded or generated, so I can replace it or leave the article without an image. |
| **Precondition** | `coverBase64` is non-null (from EDIT-008 or file upload). |
| **Exact Browser Steps** | 1. Click X (remove) button on cover image preview. |
| **Expected Visible Result** | Image preview disappears. `coverBase64` and `thumbnailBase64` set to null. Upload input reappears. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `coverImage: null` (or omitted if backend handles null correctly). |
| **Cleanup** | Refresh page to restore original image. |
| **Evidence** | Screenshot of image removed state. |
| **Automation Status** | `Automatable`. |

---

### EDIT-011: Edit Article — Upload Cover Image from File System
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-011` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — file input (`handleImage`) |
| **User Story** | As an admin, I want to upload a cover image from my local file system, so I can use a custom photo as the article thumbnail. |
| **Precondition** | Article loaded. Test image file available at `tests/assets/test-image.png`. |
| **Exact Browser Steps** | 1. Click file input. 2. Select `test-image.png`. 3. File reads as base64. |
| **Expected Visible Result** | Image preview shows selected image. `coverBase64` set. `thumbnailBase64` auto-generated from image. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `coverImage` and `thumbnailImage` as base64 strings. |
| **Cleanup** | Remove image. |
| **Evidence** | Screenshot of uploaded image. HAR of save call showing base64. |
| **Automation Status** | `Automatable` — `page.setInputFiles()` with test asset. |

---

### EDIT-012: Edit Article — Change Category
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-012` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Category select dropdown |
| **User Story** | As an admin, I want to change the article category from the dropdown, so readers can find the article under the correct topic. |
| **Precondition** | Article loaded. Categories fetched. |
| **Exact Browser Steps** | 1. Click category dropdown. 2. Select a different category option. |
| **Expected Visible Result** | Dropdown shows selected category. `article.categoryId` updated. |
| **Expected Network Call** | None until save. `getCategories()` already called on mount. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `categoryId` mapping to `category.id`. |
| **Cleanup** | Refresh page. |
| **Evidence** | Screenshot of category changed. HAR of save. |
| **Automation Status** | `Automatable`. |

---

### EDIT-013: Edit Article — Change Article Type (featured/top/popular)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-013` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Type select dropdown |
| **User Story** | As an admin, I want to change the article type designation, so the article can be styled/featured differently on the homepage. |
| **Precondition** | Article loaded. |
| **Exact Browser Steps** | 1. Click type dropdown. 2. Select "Top Story". |
| **Expected Visible Result** | Dropdown shows "Top Story". `article.articleType` updated to `top`. |
| **Expected Network Call** | On save: `PUT /laudium/api/v1/articles/:id` with `articleType: "top"`. |
| **Backend/Data Verification** | `article_type` field in DB updates to `top`. |
| **Cleanup** | Refresh page. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-014: Edit Article — Change Status to Published
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-014` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Status select dropdown |
| **User Story** | As an admin, I want to change the article status to "Published" so the article goes live on the public site immediately. |
| **Precondition** | Article loaded. Status is `draft` or `scheduled`. |
| **Exact Browser Steps** | 1. Click status dropdown. 2. Select "Publish Immediately". |
| **Expected Visible Result** | Status badge changes to "Published" (green). Status dropdown shows "Publish Immediately". |
| **Expected Network Call** | On save: `PUT /laudium/api/v1/articles/:id` with `status: "published"`. |
| **Backend/Data Verification** | `status` in DB changes to `published`. `scheduled_for` cleared. |
| **Cleanup** | Change status back to draft after test. |
| **Evidence** | Screenshot of status badge. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-015: Edit Article — Change Status to Scheduled + Set Date
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-015` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Status dropdown + datetime-local input |
| **User Story** | As an admin, I want to schedule an article to publish automatically at a future date/time, so I can queue content ahead of time. |
| **Precondition** | Article loaded. |
| **Exact Browser Steps** | 1. Click status dropdown. 2. Select "Schedule for Later". 3. Date/time input appears below. 4. Set date to tomorrow. 5. Set time to 09:00. |
| **Expected Visible Result** | Status badge changes to "Scheduled" (blue). Datetime input shows selected future date. ScheduledFor date is in the future. |
| **Expected Network Call** | On save: `PUT /laudium/api/v1/articles/:id` with `status: "scheduled"` and `scheduledFor` as ISO string. |
| **Backend/Data Verification** | `status` = `scheduled`, `scheduled_for` = future timestamp in DB. |
| **Cleanup** | Change back to draft after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-016: Edit Article — Add Tag via TagSelector
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-016` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — `TagSelector` component |
| **User Story** | As an admin, I want to add tags to an article so readers can find related content by topic. |
| **Precondition** | Article loaded. Tags fetched. Tags available in system. |
| **Exact Browser Steps** | 1. Click TagSelector input. 2. Type to search for a tag. 3. Click a tag from dropdown to select it. |
| **Expected Visible Result** | Tag appears as selected chip in TagSelector. `article.tags` array updated. |
| **Expected Network Call** | `getTags()` already called. None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `tags[]` array of tag IDs. |
| **Cleanup** | Remove tag by clicking X on tag chip. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-017: Edit Article — Add Source URL Manually
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-017` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Sources section: URL input + "Add" button |
| **User Story** | As an admin, I want to add a source URL to the article so readers know where the information came from. |
| **Precondition** | Article loaded. Sources section visible. |
| **Exact Browser Steps** | 1. In sources section, type `https://www.example.com/news/article` in URL input. 2. Click "+ Add" button. |
| **Expected Visible Result** | URL appears in sources list below the input. `article.sources` array has new URL appended. Input clears. Validation error for sources clears if this was the first source. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with `sources[]` array. |
| **Cleanup** | Click trash icon next to source to remove. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-018: Edit Article — Add Source URL (Validation: Duplicate)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-018` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Sources section duplicate check |
| **User Story** | As an admin, I want to be prevented from adding the same source URL twice, so I don't have duplicate references. |
| **Precondition** | Article has at least one source URL already in the list. |
| **Exact Browser Steps** | 1. Type the exact same URL already in the sources list. 2. Click "+ Add". |
| **Expected Visible Result** | SweetAlert warning: "Duplicate Source — This source URL has already been added". Source not added again. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | `sources` array unchanged. |
| **Cleanup** | Dismiss alert. |
| **Evidence** | Screenshot of alert. |
| **Automation Status** | `Automatable`. |

---

### EDIT-019: Edit Article — Add Source URL (Validation: Invalid URL)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-019` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Sources section URL validation |
| **User Story** | As an admin, I want URL validation to prevent me from adding malformed source links, so all sources are valid clickable links. |
| **Precondition** | Article loaded. |
| **Exact Browser Steps** | 1. Type `not-a-valid-url` in source URL input. 2. Click "+ Add". |
| **Expected Visible Result** | SweetAlert error: "Invalid URL — Please enter a valid URL (e.g., https://example.com/article)". URL not added. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | `sources` array unchanged. |
| **Cleanup** | Dismiss alert. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### EDIT-020: Edit Article — Remove Source URL
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-020` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Sources section: trash icon per source |
| **User Story** | As an admin, I want to remove a source URL from the article, so I can correct mistakes or outdated references. |
| **Precondition** | Article has at least one source in the list. |
| **Exact Browser Steps** | 1. Click trash icon next to any source URL in the list. |
| **Expected Visible Result** | Source URL row disappears from list. `article.sources` array has that URL removed. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `PUT /laudium/api/v1/articles/:id` with updated `sources[]` without removed URL. |
| **Cleanup** | Refresh page to restore. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-021: Edit Article — Find Sources with AI (Button Click)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-021` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — "Find Sources with AI" button + `findArticleSources()` |
| **User Story** | As an admin, I want to click "Find Sources with AI" and have AI search the internet for relevant source URLs, so I don't have to find them manually. |
| **Precondition** | Article loaded. `article.title` non-empty. Admin logged in. |
| **Exact Browser Steps** | 1. Verify title is non-empty. 2. Click "Find Sources with AI" button. 3. Wait for AI search (loading spinner). |
| **Expected Visible Result** | Button shows spinner "Finding...". Then SweetAlert success: "Sources Found! — Added N new source(s)". Sources appear in list. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/find-sources` body `{title, summary, content (plain text)}` → 200 with `{success: true, sources: [url1, url2, ...], debug: {...}}` |
| **Backend/Data Verification** | `sources` array populated with AI-discovered URLs. Debug info available in response. |
| **Cleanup** | Remove each found source manually. |
| **Evidence** | Screenshot of success alert. HAR of find-sources call. |
| **Automation Status** | `Automatable` — AI-dependent, may need retry. |

---

### EDIT-022: Edit Article — Find Sources with AI (No Sources Found)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-022` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — "Find Sources with AI" button failure path |
| **User Story** | As an admin, when AI cannot find relevant sources, I want to see a clear message, so I'm not confused about what happened. |
| **Precondition** | Article loaded with generic/vague title that may not yield sources. |
| **Exact Browser Steps** | 1. Use a title that is very generic (e.g., "News"). 2. Click "Find Sources with AI". 3. Wait. |
| **Expected Visible Result** | SweetAlert info: "No Sources Found — Could not find relevant sources for this article." OR debug panel showing parse errors / zero results. |
| **Expected Network Call** | Same endpoint as EDIT-021. |
| **Backend/Data Verification** | `sources` array unchanged. Response `success: false` or empty array. |
| **Cleanup** | Dismiss alert. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-023: Edit Article — Skip Fact Check Toggle
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-023` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — "Don't fact check" checkbox |
| **User Story** | As an admin, I want a "Don't fact check" option so I can skip AI fact-checking when I'm in a hurry or the content is simple. |
| **Precondition** | Article loaded. |
| **Exact Browser Steps** | 1. Check the "Don't fact check (save anyway)" checkbox. |
| **Expected Visible Result** | Checkbox is checked. `skipFactCheck` is true. On save, `confirmFactCheck` sent as `true` bypassing fact-check server call. |
| **Expected Network Call** | On save: `PUT /laudium/api/v1/articles/:id` with `confirmFactCheck: true`. NO `POST /fact-check` call. |
| **Backend/Data Verification** | Article saved without fact-check evaluation. |
| **Cleanup** | Uncheck checkbox. |
| **Evidence** | Screenshot. HAR showing save without fact-check call. |
| **Automation Status** | `Automatable`. |

---

### EDIT-024: Edit Article — Run Fact Check (Clean Article)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-024` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — `runFactCheck()` → `factCheckArticle()` |
| **User Story** | As an admin, I want to run fact-check on my article and see that it passes, so I can publish with confidence. |
| **Precondition** | Article loaded. `article.title`, `summary`, `content` all non-empty. `skipFactCheck` is false. |
| **Exact Browser Steps** | 1. Click "Update Article" (submit). 2. `runFactCheck()` called → SweetAlert "Fact checking — Busy fact checking..." with spinner. 3. Wait for result. |
| **Expected Visible Result** | If no issues: Fact-check passes silently and article saves. OR SweetAlert "Fact check warning" with "Save anyway" / "Refine with fixes" options. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/fact-check` body `{title, summary, content}` → 200 with `{hasIssues: false}` OR `{hasIssues: true, issues: [...]}` |
| **Backend/Data Verification** | If `hasIssues: false`: article saves normally. If `hasIssues: true`: 409 returned with factCheck data, awaits user decision. |
| **Cleanup** | Article saved — note original state. |
| **Evidence** | Screenshot of fact-check result. HAR. |
| **Automation Status** | `Automatable` — may need retry on AI slowness. |

---

### EDIT-025: Edit Article — Fact Check Finds Issues → Save Anyway
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-025` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — fact-check conflict modal |
| **User Story** | As an admin, when fact-check finds issues, I want to review them and choose to save anyway if they're acceptable, so I have editorial control. |
| **Precondition** | Article has content that will trigger fact-check issues. |
| **Exact Browser Steps** | 1. Submit article. 2. Fact-check returns `hasIssues: true`. 3. SweetAlert shows warning with claims/verdicts/reasons list. 4. Click "Save anyway". |
| **Expected Visible Result** | Article saves. `confirmFactCheck: true` sent with save. |
| **Expected Network Call** | `POST /fact-check` then `PUT /articles/:id` with `confirmFactCheck: true`. |
| **Backend/Data Verification** | 409 on fact-check followed by 200 on save. `confirmFactCheck` flag stored. |
| **Cleanup** | N/A — article modified. |
| **Evidence** | Screenshot of warning + success. HAR. |
| **Automation Status** | `Automatable`. |

---

### EDIT-026: Edit Article — Fact Check Finds Issues → Refine with Fixes
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-026` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — fact-check issue refinement flow |
| **User Story** | As an admin, when fact-check finds issues, I want to click "Refine with fixes" so AI automatically corrects the problems. |
| **Precondition** | Article has content triggering fact-check issues. |
| **Exact Browser Steps** | 1. Submit article. 2. Fact-check returns issues. 3. Click "Refine with fixes". 4. AI applies fixes. 5. Content updated in editor. |
| **Expected Visible Result** | Content in Quill editor updates with fixes applied. Success toast: "Refined — Applied fact-check fixes to the article." |
| **Expected Network Call** | `refineWithFactCheckIssues()` → `POST /minimax/refine` with fact-check issues in prompt. |
| **Backend/Data Verification** | `content` field updated. Article NOT yet saved (admin must save manually after review). |
| **Cleanup** | Refresh to discard changes, or save to persist. |
| **Evidence** | Screenshot before/after content. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### EDIT-027: Edit Article — Update Article (Save Changes)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-027` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Submit button "Update Article" |
| **User Story** | As an admin, I want to save my changes by clicking "Update Article", so my edits are persisted to the backend and the article is updated. |
| **Precondition** | Article form has valid data. All required fields filled. |
| **Exact Browser Steps** | 1. Make a visible change (e.g., append text to summary). 2. Click "Update Article". 3. Wait for save (button shows "Saving..."). |
| **Expected Visible Result** | Button shows "Saving..." then "Update Article". SweetAlert success: "Article updated successfully!" URL navigates to `/admin/articles`. |
| **Expected Network Call** | `PUT /laudium/api/v1/articles/:id` with all form fields + `confirmFactCheck: false` (unless skip checked). `coverImage` and `thumbnailImage` sent as base64 or URL. |
| **Backend/Data Verification** | 200 response. DB record updated with all changed fields. `updated_at` timestamp refreshed. |
| **Cleanup** | Re-edit to restore or manually revert in DB. |
| **Evidence** | Screenshot of success. HAR of PUT call with payload. |
| **Automation Status** | `Automatable`. |

---

### EDIT-028: Edit Article — Update Fails Validation (Missing Required Field)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-028` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — `validateForm()` |
| **User Story** | As an admin, I want to see clear validation errors when I try to save without required fields, so I know what to fix. |
| **Precondition** | Article loaded. |
| **Exact Browser Steps** | 1. Clear the summary field. 2. Click "Update Article". |
| **Expected Visible Result** | Save does NOT proceed. Summary field gets red border + `is-invalid` class. Invalid-feedback div shows "Summary is required". |
| **Expected Network Call** | None — `validateForm()` returns false before API call. |
| **Backend/Data Verification** | No API call made. |
| **Cleanup** | Type summary back in. |
| **Evidence** | Screenshot of validation error state. |
| **Automation Status** | `Automatable`. |

---

### EDIT-029: Edit Article — Delete Article (Confirm Modal)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-029` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Delete button + Bootstrap modal |
| **User Story** | As an admin, I want a confirmation dialog before deleting, so I don't accidentally delete articles. |
| **Precondition** | Article loaded. |
| **Exact Browser Steps** | 1. Click "Delete" button. 2. Bootstrap modal appears with title + warning. |
| **Expected Visible Result** | Modal with title "Confirm Deletion", article title shown, red warning "This action cannot be undone." Buttons: Cancel (secondary) + "Delete Article" (danger). |
| **Expected Network Call** | None yet. |
| **Backend/Data Verification** | None yet. |
| **Cleanup** | Click Cancel or X. |
| **Evidence** | Screenshot of modal. |
| **Automation Status** | `Automatable`. |

---

### EDIT-030: Edit Article — Delete Article (Execute)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-030` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Delete modal + `removeArticle()` |
| **User Story** | As an admin, I want to confirm deletion so the article is permanently removed from the system. |
| **Precondition** | Delete confirmation modal open from EDIT-029. |
| **Exact Browser Steps** | 1. Click "Delete Article" button in modal. 2. Button shows "Deleting...". 3. Modal closes. 4. URL navigates to `/admin/articles`. |
| **Expected Visible Result** | Modal closes. URL at `/admin/articles`. Article no longer in list. |
| **Expected Network Call** | `DELETE /laudium/api/v1/articles/:id` → 200 (or 204). |
| **Backend/Data Verification** | DB record deleted. Article not returned in subsequent `GET /articles` calls. |
| **Cleanup** | N/A — article deleted. |
| **Evidence** | Screenshot of redirect to list. HAR of DELETE call. Screenshot of article absent from list. |
| **Automation Status** | `Automatable`. |

---

### EDIT-031: Edit Article — Cancel (Navigate Back)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-031` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — Cancel button |
| **User Story** | As an admin, I want to click Cancel to leave the edit screen without saving, so I can abandon unwanted changes. |
| **Precondition** | Article loaded with unsaved changes. |
| **Exact Browser Steps** | 1. Make a visible change. 2. Click "Cancel". |
| **Expected Visible Result** | URL navigates to `/admin/articles`. No save API call. Unsaved changes discarded. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | No changes persisted. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot of navigated-away state. |
| **Automation Status** | `Automatable`. |

---

### EDIT-032: Edit Article — Audio Player Visible (Published Article with Audio)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-032` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — audio player section |
| **User Story** | As an admin, I want to see an audio player for the article narration if audio has been generated, so I can verify the audio exists and plays. |
| **Precondition** | Article status = `published`. `article.audioUrl` is non-null (audio was generated on publish). |
| **Expected Visible Result** | Audio section shows `<audio controls>` element with `src` pointing to audio file. Label: "Article Audio Narration". |
| **Expected Network Call** | Audio file loaded by browser on page render. |
| **Backend/Data Verification** | `audio.file` field in GET response is non-null. Audio file accessible at URL. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot of audio player. Network request for audio file in HAR. |
| **Automation Status** | `Automatable` — audio playback via Playwright `media` API. |

---

### EDIT-033: Edit Article — Audio Generating (Published without Audio Yet)
| Field | Value |
|-------|-------|
| **Test ID** | `EDIT-033` |
| **Frontend URL** | `/admin/articles/edit/:id` |
| **Screen/Component** | `Edit.vue` — audio generating placeholder |
| **User Story** | As an admin, when audio is being generated, I want to see an info alert telling me it's in progress, so I'm not confused why there's no player. |
| **Precondition** | Article status = `published`. `article.audioUrl` is null. |
| **Expected Visible Result** | Info alert: "Audio is being generated... It will appear here once ready." |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | Audio generation is a background job triggered by publish. No direct API call to generate audio from edit screen. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot of generating alert. |
| **Automation Status** | `Automatable`. |

---

## SECTION 2: ARTICLE CREATE SCREEN — `/admin/articles/create`

**Screen file:** `src/views/Admin/Articles/Create.vue`
**Similar controls to Edit.vue** — see EDIT-001 to EDIT-033 for equivalent tests.
**Key differences from Edit:**
- Create has no existing article data pre-populated
- Save button says "Publish Now" / "Schedule Publication" (not "Update Article")
- AI thumbnail generation auto-fires when navigating from source article flow
- On successful save, navigates to `/admin/articles` and clears `localStorage` keys

### CREATE-001: Create Article — Load Empty Form
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-001` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` |
| **User Story** | As an admin, I want the create form to load empty with a default category pre-selected. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles/create`. |
| **Expected Visible Result** | Form loads empty. Default category selected. Title, slug, summary, content empty. Status defaults to draft. |
| **Expected Network Call** | `getCategories()` called on mount. |
| **Backend/Data Verification** | No article created yet. |
| **Cleanup** | Navigate away. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-002: Create Article — Title → Auto Slug Generation
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-002` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Title input + Slug input |
| **User Story** | As an admin, I want the slug to auto-regenerate from the title as I type. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Type "Breaking News: Major Event in Pretoria" in title. 2. Press Tab. |
| **Expected Visible Result** | Slug field updates to `breaking-news-major-event-in-pretoria`. |
| **Expected Network Call** | None — client-side only. |
| **Backend/Data Verification** | None yet. |
| **Cleanup** | Clear title. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-003: Create Article — Manual Slug Regenerate Button
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-003` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Slug input + Regenerate button |
| **User Story** | As an admin, I want a "Regenerate" button to force-slugify the current title. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Click "Regenerate" button next to slug input. |
| **Expected Visible Result** | Slug re-populates with slugified title. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | None. |
| **Cleanup** | Clear title. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-004: Create Article — Change Summary
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-004` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Summary textarea |
| **User Story** | As an admin, I want to type the article summary. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Click summary textarea. 2. Type "Test summary for the article." |
| **Expected Visible Result** | Summary textarea shows typed text. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with `summary`. |
| **Cleanup** | Clear field. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-005: Create Article — Change Content (Quill Editor)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-005` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — `QuillEditor` component |
| **User Story** | As an admin, I want to write article body content in a rich text editor. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Click into Quill editor. 2. Type article content. |
| **Expected Visible Result** | Quill editor content updates. HTML tags present. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with `content` as HTML string. |
| **Cleanup** | Clear editor. |
| **Evidence** | Screenshot. HAR of save call. |
| **Automation Status** | `Automatable` — Quill interaction via Playwright. |

---

### CREATE-006: Create Article — Refine with AI Button Opens Modal
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-006` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — "Refine with AI" button + `RefineArticleModal` |
| **User Story** | As an admin, I want to click "Refine with AI" and get an AI modal to rewrite my content. |
| **Precondition** | Form loaded with content typed. |
| **Exact Browser Steps** | 1. Verify content field has text. 2. Click "Refine with AI" button. |
| **Expected Visible Result** | `RefineArticleModal` appears with prompt textarea, provider selector, submit button. |
| **Cleanup** | Click X or Cancel to close. |
| **Evidence** | Screenshot of modal. |
| **Automation Status** | `Automatable`. |

---

### CREATE-007: Create Article — Submit AI Refinement → Content Updates
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-007` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` + `RefineArticleModal` |
| **User Story** | As an admin, I want to type a refinement prompt and have AI rewrite my content. |
| **Precondition** | Modal open from CREATE-006. Content typed. |
| **Exact Browser Steps** | 1. In modal, type refinement prompt. 2. Select provider. 3. Click Submit. 4. Wait for AI response. |
| **Expected Visible Result** | Quill editor content updates with refined text. Success toast. Modal closes. |
| **Expected Network Call** | `POST /minimax/refine` with `{prompt, provider, currentContent}` → 200 with refined `content`. |
| **Backend/Data Verification** | Response `content` is non-empty string with `<p>` tags. |
| **Cleanup** | Discard changes by refreshing. |
| **Evidence** | Screenshot before + after. HAR of refine call. |
| **Automation Status** | `Automatable` — AI-dependent, may need retry. |

---

### CREATE-008: Create Article — Generate AI Thumbnail (GPT Provider)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-008` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — AI Thumbnail button + imageProvider dropdown |
| **User Story** | As an admin, I want to generate a cover image using GPT AI. |
| **Precondition** | Title non-empty. ArticleType selected. Provider = `gpt`. |
| **Exact Browser Steps** | 1. Select articleType. 2. Select provider = "GPT". 3. Click "AI Thumbnail". 4. Wait. |
| **Expected Visible Result** | Cover image preview updates with AI-generated image. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/generate-thumbnail` with `{prompt, articleType, imageProvider: "gpt"}`. |
| **Backend/Data Verification** | `coverBase64` set. |
| **Cleanup** | Remove image. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### CREATE-009: Create Article — Generate AI Thumbnail (MiniMax Provider)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-009` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — AI Thumbnail button + imageProvider dropdown |
| **User Story** | As an admin, I want to generate a cover image using MiniMax AI. |
| **Precondition** | Title non-empty. Provider = `minimax`. |
| **Exact Browser Steps** | 1. Select provider = "MiniMax". 2. Click "AI Thumbnail". 3. Wait. |
| **Expected Visible Result** | Same as CREATE-008 with MiniMax model. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/generate-thumbnail` with `imageProvider: "minimax"`. |
| **Backend/Data Verification** | Same as CREATE-008. |
| **Cleanup** | Remove image. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### CREATE-010: Create Article — Remove Cover Image
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-010` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — X button on cover image preview |
| **User Story** | As an admin, I want to remove a cover image I've uploaded or generated. |
| **Precondition** | `coverBase64` is non-null. |
| **Exact Browser Steps** | 1. Click X (remove) button on cover image preview. |
| **Expected Visible Result** | Image preview disappears. `coverBase64` set to null. Upload input reappears. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | No image sent on save. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-011: Create Article — Upload Cover Image from File System
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-011` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — file input |
| **User Story** | As an admin, I want to upload a cover image from my local file system. |
| **Precondition** | Test image available at `tests/assets/test-image.png`. |
| **Exact Browser Steps** | 1. Click file input. 2. Select `test-image.png`. |
| **Expected Visible Result** | Image preview shows selected image. `coverBase64` set. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with `coverImage` as base64. |
| **Cleanup** | Remove image. |
| **Evidence** | Screenshot. HAR of save call showing base64. |
| **Automation Status** | `Automatable` — `page.setInputFiles()` with test asset. |

---

### CREATE-012: Create Article — Change Category
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-012` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Category select dropdown |
| **User Story** | As an admin, I want to change the article category. |
| **Precondition** | Categories fetched. |
| **Exact Browser Steps** | 1. Click category dropdown. 2. Select a different category. |
| **Expected Visible Result** | Category selected. `article.categoryId` updated. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with `categoryId`. |
| **Cleanup** | Select default. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-013: Create Article — Change Article Type
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-013` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Type select dropdown |
| **User Story** | As an admin, I want to change the article type designation. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Click type dropdown. 2. Select "Top Story". |
| **Expected Visible Result** | Type set to "Top Story". `article.articleType` = `top`. |
| **Expected Network Call** | On save: `POST /laudium/api/v1/articles` with `articleType: "top"`. |
| **Backend/Data Verification** | `article_type` stored in DB. |
| **Cleanup** | Select default. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-014: Create Article — Publish Now
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-014` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — "Publish Now" button |
| **User Story** | As an admin, I want to click "Publish Now" so the article goes live immediately. |
| **Precondition** | All required fields filled (title, summary, content, category, type). |
| **Exact Browser Steps** | 1. Fill all required fields. 2. Click "Publish Now". 3. Wait for save. |
| **Expected Visible Result** | Button shows "Publishing..." then success toast "Article published successfully!" URL navigates to `/admin/articles`. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` (or fact-check then POST). |
| **Backend/Data Verification** | 200 response. `status: "published"` in DB. |
| **Cleanup** | Delete created article after test. |
| **Evidence** | Screenshot of success. HAR. |
| **Automation Status** | `Automatable`. |

---

### CREATE-015: Create Article — Schedule Publication for Later
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-015` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — "Schedule Publication" button + datetime-local input |
| **User Story** | As an admin, I want to schedule an article to publish at a future date/time. |
| **Precondition** | All required fields filled. |
| **Exact Browser Steps** | 1. Click "Schedule Publication". 2. Datetime input appears. 3. Set date to tomorrow, time to 09:00. 4. Click "Schedule Publication". |
| **Expected Visible Result** | Button shows "Scheduling..." then success. Status badge shows "Scheduled". |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `status: "scheduled"` and `scheduledFor` as ISO string. |
| **Backend/Data Verification** | `status: "scheduled"`, `scheduled_for` = future timestamp in DB. |
| **Cleanup** | Delete scheduled article after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### CREATE-016: Create Article — Add Tag via TagSelector
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-016` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — `TagSelector` component |
| **User Story** | As an admin, I want to add tags to an article. |
| **Precondition** | Tags fetched. Tags available. |
| **Exact Browser Steps** | 1. Click TagSelector input. 2. Type to search for a tag. 3. Click a tag from dropdown. |
| **Expected Visible Result** | Tag appears as selected chip. `article.tags` array updated. |
| **Expected Network Call** | `getTags()` already called. None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with `tags[]` array of tag IDs. |
| **Cleanup** | Remove tag by clicking X on tag chip. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### CREATE-017: Create Article — Add Source URL Manually
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-017` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Sources section |
| **User Story** | As an admin, I want to add a source URL to the article. |
| **Precondition** | Form loaded. Sources section visible. |
| **Exact Browser Steps** | 1. Type `https://www.example.com/news/article` in URL input. 2. Click "+ Add". |
| **Expected Visible Result** | URL appears in sources list. `article.sources` array updated. Input clears. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with `sources[]` array. |
| **Cleanup** | Remove source by clicking trash icon. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### CREATE-018: Create Article — Add Source URL (Validation: Duplicate)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-018` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Sources section duplicate check |
| **User Story** | As an admin, I want to be prevented from adding the same source URL twice. |
| **Precondition** | At least one source URL already in the list. |
| **Exact Browser Steps** | 1. Type the exact same URL already in the list. 2. Click "+ Add". |
| **Expected Visible Result** | SweetAlert warning: "Duplicate Source — This source URL has already been added". |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | `sources` array unchanged. |
| **Cleanup** | Dismiss alert. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-019: Create Article — Add Source URL (Validation: Invalid URL)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-019` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Sources section URL validation |
| **User Story** | As an admin, I want URL validation to prevent me from adding malformed source links. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Type `not-a-valid-url` in source URL input. 2. Click "+ Add". |
| **Expected Visible Result** | SweetAlert error: "Invalid URL — Please enter a valid URL". URL not added. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | `sources` array unchanged. |
| **Cleanup** | Dismiss alert. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-020: Create Article — Remove Source URL
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-020` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Sources section trash icon |
| **User Story** | As an admin, I want to remove a source URL from the article. |
| **Precondition** | At least one source URL in the list. |
| **Exact Browser Steps** | 1. Click trash icon next to any source URL. |
| **Expected Visible Result** | Source URL row disappears. `article.sources` array has that URL removed. |
| **Expected Network Call** | None until save. |
| **Backend/Data Verification** | On save: `POST /laudium/api/v1/articles` with updated `sources[]`. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-021: Create Article — Find Sources with AI
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-021` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — "Find Sources with AI" button |
| **User Story** | As an admin, I want to click "Find Sources with AI" and have AI search for relevant source URLs. |
| **Precondition** | Title and summary non-empty. |
| **Exact Browser Steps** | 1. Verify title non-empty. 2. Click "Find Sources with AI". 3. Wait. |
| **Expected Visible Result** | Button shows spinner. Then SweetAlert success: "Sources Found! — Added N new source(s)". |
| **Expected Network Call** | `POST /laudium/api/v1/articles/find-sources` with `{title, summary, content}`. |
| **Backend/Data Verification** | `sources` array populated with AI-discovered URLs. |
| **Cleanup** | Remove each found source. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### CREATE-022: Create Article — Skip Fact Check Toggle
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-022` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — "Don't fact check" checkbox |
| **User Story** | As an admin, I want a "Don't fact check" option so I can skip AI fact-checking. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Check the "Don't fact check (save anyway)" checkbox. |
| **Expected Visible Result** | Checkbox checked. `skipFactCheck` = true. On save, no `POST /fact-check` call. |
| **Expected Network Call** | On save: `POST /laudium/api/v1/articles` with `confirmFactCheck: true`. |
| **Backend/Data Verification** | Article saved without fact-check evaluation. |
| **Cleanup** | Uncheck. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### CREATE-023: Create Article — Validation Error (Missing Required Field)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-023` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — `validateForm()` |
| **User Story** | As an admin, I want to see clear validation errors when I try to publish without required fields. |
| **Precondition** | Form loaded. |
| **Exact Browser Steps** | 1. Clear summary field. 2. Click "Publish Now". |
| **Expected Visible Result** | Save does NOT proceed. Summary field gets red border + `is-invalid`. Invalid-feedback shows "Summary is required". |
| **Expected Network Call** | None — `validateForm()` returns false. |
| **Backend/Data Verification** | No API call made. |
| **Cleanup** | Type summary back in. |
| **Evidence** | Screenshot of validation error. |
| **Automation Status** | `Automatable`. |

---

### CREATE-024: Create Article — Cancel (Navigate Back)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-024` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — Cancel button |
| **User Story** | As an admin, I want to click Cancel to leave the create screen without saving. |
| **Precondition** | Form loaded with some data typed. |
| **Exact Browser Steps** | 1. Type something in title. 2. Click "Cancel". |
| **Expected Visible Result** | URL navigates to `/admin/articles`. No save API call. localStorage keys cleared. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | No changes persisted. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-025: Create Article — Reset Form (Confirm Dialog)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-025` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — "Reset Form" button + confirm dialog |
| **User Story** | As an admin, I want to reset the form to blank so I can start over. |
| **Precondition** | Form loaded with data typed. |
| **Exact Browser Steps** | 1. Click "Reset Form". 2. Confirm dialog appears. 3. Click "Reset". |
| **Expected Visible Result** | All form fields cleared. LocalStorage keys cleared. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | None. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot of cleared form. |
| **Automation Status** | `Automatable`. |

---

### CREATE-026: Create Article — Pre-filled from Source Article (localStorage)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-026` |
| **Frontend URL** | `/admin/articles/create?newArticle=true&fromSource=true&articleId=...` |
| **Screen/Component** | `Create.vue` — localStorage pre-fill |
| **User Story** | As an admin, after converting a source article, I want the create form pre-filled with the generated content. |
| **Precondition** | localStorage has `newArticleData` from source article conversion. |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles/create?newArticle=true&fromSource=true&articleId=...`. |
| **Expected Visible Result** | Form pre-filled with `title`, `slug`, `summary`, `content`, `sources`. Cover image shown if `coverBase64` stored. |
| **Expected Network Call** | None — data from localStorage. |
| **Backend/Data Verification** | Data used on save. |
| **Cleanup** | Clear localStorage. Delete created article. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### CREATE-027: Create Article — AI Thumbnail Auto-fires from Source Flow
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-027` |
| **Frontend URL** | `/admin/articles/create?newArticle=true&fromSource=true&articleId=...` |
| **Screen/Component** | `Create.vue` — AI thumbnail auto-generation |
| **User Story** | As an admin, when navigating from source article conversion, I want the AI thumbnail to auto-generate. |
| **Precondition** | Navigated from source article flow with `coverBase64` stored in localStorage. |
| **Exact Browser Steps** | 1. Convert source article (SOURCE-009). 2. Wait for navigation to create screen. |
| **Expected Visible Result** | Cover image preview shows AI-generated image without manual trigger. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/generate-thumbnail` if cover auto-generated. |
| **Backend/Data Verification** | `coverBase64` populated from localStorage. |
| **Cleanup** | Remove image. Clear localStorage. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### CREATE-028: Create Article — Submit Creates Draft (Default Status)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-028` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — publish without explicit status change |
| **User Story** | As an admin, when I click Save without changing status, I want the article saved as draft. |
| **Precondition** | All required fields filled. Status dropdown left at default (draft). |
| **Exact Browser Steps** | 1. Fill all required fields. 2. Leave status at default. 3. Click "Publish Now". |
| **Expected Visible Result** | Success toast. Article created with `status: "draft"`. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `status: "draft"`. |
| **Backend/Data Verification** | Article in DB with `status: "draft"`. |
| **Cleanup** | Delete article. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### CREATE-029: Create Article — Audio Section (After Publish)
| Field | Value |
|-------|-------|
| **Test ID** | `CREATE-029` |
| **Frontend URL** | `/admin/articles/create` |
| **Screen/Component** | `Create.vue` — audio section |
| **User Story** | As an admin, I want to see an audio player for article narration after publish. |
| **Precondition** | Article just published with audio generation triggered. |
| **Exact Browser Steps** | 1. Fill all fields. 2. Publish (CREATE-014). 3. Audio generation triggered. |
| **Expected Visible Result** | Audio section shows `<audio controls>` element OR info alert "Audio is being generated..." |
| **Expected Network Call** | Audio file loaded by browser. |
| **Backend/Data Verification** | `audio.file` field populated on article. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

## SECTION 3: ARTICLE PROMPT SCREEN — `/admin/articles/prompt`

**Screen file:** `src/views/Admin/Articles/ArticlePromptView.vue`
**Component:** `ArticlePromptModal` (full-screen modal)

### PROMPT-001: Open Article Prompt Modal
| Field | Value |
|-------|-------|
| **Test ID** | `PROMPT-001` |
| **Frontend URL** | `/admin/articles/prompt` |
| **Screen/Component** | `ArticlePromptView.vue` + `ArticlePromptModal` |
| **User Story** | As an admin, I want to navigate to `/admin/articles/prompt` and see the AI article generation modal, so I can start creating an article with AI. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles/prompt`. 2. Modal auto-opens on mount. |
| **Expected Visible Result** | `ArticlePromptModal` visible full-screen. Modal has topic/prompt input, AI provider selector, generate button. |
| **Expected Network Call** | None on mount. |
| **Cleanup** | Close modal. Navigate to `/admin/articles`. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### PROMPT-002: Generate Article from Prompt → Navigate to Create
| Field | Value |
|-------|-------|
| **Test ID** | `PROMPT-002` |
| **Frontend URL** | `/admin/articles/prompt` |
| **Screen/Component** | `ArticlePromptModal` — generate flow |
| **User Story** | As an admin, I want to type a topic, select an AI provider, generate an article, and be taken to the Create screen with content pre-filled. |
| **Precondition** | Admin logged in. At least one AI provider reachable. |
| **Exact Browser Steps** | 1. Type topic in prompt input. 2. Select AI provider. 3. Click Generate. 4. Wait for generation. 5. Modal closes → navigate to `/admin/articles/create?newArticle=true`. |
| **Expected Visible Result** | URL at `/admin/articles/create`. Form pre-filled with generated `title`, `slug`, `summary`, `content`, `sources`. Cover image generated (if auto-generate enabled). |
| **Expected Network Call** | `POST /minimax/generate-article` (or other provider) with `{messages: [...]}` → 200 with `{title, article, summary, slug, sources, coverUrl}` |
| **Backend/Data Verification** | `localStorage.setItem('newArticleData', JSON.stringify({...}))` called. `article.coverBase64` stored if coverUrl returned. |
| **Cleanup** | Clear localStorage. Delete created article. |
| **Evidence** | Screenshot of Create form pre-filled. HAR. |
| **Automation Status** | `Automatable` — AI-generation-dependent, may need retries. |

---

### PROMPT-003: Close Modal → Navigate Back to Articles
| Field | Value |
|-------|-------|
| **Test ID** | `PROMPT-003` |
| **Frontend URL** | `/admin/articles/prompt` |
| **Screen/Component** | `ArticlePromptModal` — close/handleModalClose |
| **User Story** | As an admin, I want to close the prompt modal and return to the articles list, so I can abandon article creation. |
| **Precondition** | Modal open from PROMPT-001. |
| **Exact Browser Steps** | 1. Click X or Cancel on modal. |
| **Expected Visible Result** | Modal closes. URL navigates to `/admin/articles`. |
| **Expected Network Call** | None. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

## SECTION 4: SOURCE ARTICLES SCREEN — `/admin/source-articles`

**Screen file:** `src/views/Admin/Articles/SourceArticles.vue`
**Services:** `articles.js` — `getSourceArticlesByProvider`, `generateArticleBySourceId`, `generateArticlesBySourceIds`
**AI Providers:** MiniMax (`minimax`), Gemini (`gemini`), GPT (`gpt`), Perplexity (`perplexity`), X (`x`)

### SOURCE-001: Load Source Articles (Default Provider: MiniMax)
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-001` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` |
| **User Story** | As an admin, I want the source articles page to load with MiniMax articles by default, so I can see what content is available to convert. |
| **Precondition** | Admin logged in. MiniMax API reachable. |
| **Exact Browser Steps** | 1. Navigate to `/admin/source-articles`. 2. Loading spinner shown. 3. Wait for articles to load. |
| **Expected Visible Result** | Table populates with source articles. Each row: checkbox, title, URL, platform, author, type, date, actions. Badge shows "0 selected". |
| **Expected Network Call** | `GET /minimax/sourceArticles/all` → 200 with `{data: {sourceArticles: [...], tasks: [...]}}` |
| **Backend/Data Verification** | `sourceArticles` array populated. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — API-dependent. |

---

### SOURCE-002: Switch Provider to Gemini → Refreshes Article List
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-002` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — provider dropdown |
| **User Story** | As an admin, I want to switch the AI provider dropdown to Gemini and see Gemini-sourced articles refresh, so I can compare content across providers. |
| **Precondition** | Admin logged in. Page loaded with MiniMax (SOURCE-001). |
| **Exact Browser Steps** | 1. Find provider dropdown (label "AI Source"). 2. Select "Serah AI" (gemini). 3. Wait for loading. |
| **Expected Visible Result** | Loading spinner. Table refreshes with Gemini articles. Badge shows "0 selected". |
| **Expected Network Call** | `GET /gemini/sourceArticles/all` → 200. `localStorage.setItem('sourceProvider', 'gemini')`. |
| **Backend/Data Verification** | `selectedProvider` = `gemini`. localStorage updated. |
| **Cleanup** | Switch back to MiniMax. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — API-dependent. |

---

### SOURCE-003: Switch Provider to GPT → Refreshes
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-003` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — provider dropdown |
| **User Story** | As an admin, I want to switch to GPT and see Magic AI content. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Select "Magic AI" (gpt) from dropdown. 2. Wait. |
| **Expected Visible Result** | Table refreshes with GPT articles. |
| **Expected Network Call** | `GET /gpt/sourceArticles/all`. |
| **Backend/Data Verification** | Same as SOURCE-002. |
| **Cleanup** | Switch back to MiniMax. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-004: Switch Provider to Perplexity → Refreshes
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-004` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — provider dropdown |
| **User Story** | As an admin, I want to switch to Perplexity (Beatrice AI) and see its content. |
| **Exact Browser Steps** | 1. Select "Beatrice AI" (perplexity). 2. Wait. |
| **Expected Network Call** | `GET /perplexity/sourceArticles/all`. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-005: Switch Provider to X (Nicolah) → Refreshes
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-005` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — provider dropdown |
| **User Story** | As an admin, I want to switch to X (Nicolah) and see its content. |
| **Exact Browser Steps** | 1. Select "Nicolah" (x). 2. Wait. |
| **Expected Network Call** | `GET /x/sourceArticles/all`. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-006: Refresh Button → Re-fetches Current Provider
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-006` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — Refresh button |
| **User Story** | As an admin, I want to click Refresh to get the latest source articles, so I don't have to manually switch providers to update. |
| **Exact Browser Steps** | 1. Click "Refresh" button. 2. Wait. |
| **Expected Visible Result** | Loading spinner. Table re-populates with fresh data. |
| **Expected Network Call** | `GET /<currentProvider>/sourceArticles/all`. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-007: Select Single Article via Checkbox
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-007` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — table row checkbox |
| **User Story** | As an admin, I want to select a single source article by checking its checkbox, so I can convert just that one article. |
| **Exact Browser Steps** | 1. Click checkbox on any article row. |
| **Expected Visible Result** | Checkbox checked. Badge updates to "1 selected". "Convert Selected Articles" button becomes active. |
| **Expected Network Call** | None. |
| **Backend/Data Verification** | `selectedArticles` array = `[articleKey]`. |
| **Cleanup** | Uncheck. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-008: Select All Checkbox → Selects All Visible Articles
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-008` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — header checkbox |
| **User Story** | As an admin, I want to click the "All" checkbox in the table header to select all visible articles, so I can bulk-convert many at once. |
| **Exact Browser Steps** | 1. Click "All" checkbox in table header. |
| **Expected Visible Result** | All checkboxes checked. Badge shows "N selected" (all). "Convert Selected Articles" button active. |
| **Expected Network Call** | None. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-009: Convert Single Source → Create Article
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-009` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — create button per row |
| **User Story** | As an admin, I want to click the "file-earmark-plus" icon on a source article row to convert it to a full article, so I can create content quickly. |
| **Precondition** | Admin logged in. Source articles loaded. |
| **Exact Browser Steps** | 1. Click file-earmark-plus icon on any article row. 2. Swal "Converting article..." loading. 3. Wait for navigate. |
| **Expected Visible Result** | Loading overlay. URL changes to `/admin/articles/create?newArticle=true&fromSource=true&articleId=...`. Create form pre-filled with generated content. |
| **Expected Network Call** | `POST /minimax/generate-article/by-id` (or current provider) with `{id: sourceArticleId}` → 200 with `{title, article, summary, slug, sources, coverUrl}`. |
| **Backend/Data Verification** | `localStorage.setItem('newArticleData', JSON.stringify({...}))`. `savedSourceArticleIds` localStorage updated. |
| **Cleanup** | Clear localStorage. Delete created article. |
| **Evidence** | Screenshot of create form. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### SOURCE-010: Convert Single Source → See Duplicate Skip Message
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-010` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — duplicate source handling |
| **User Story** | As an admin, when I try to convert a source article that's already been converted, I want to see how many were duplicates vs new, so I'm not confused. |
| **Precondition** | Same source article converted before (in SOURCE-009). |
| **Exact Browser Steps** | 1. Click file-earmark-plus icon on same article again. 2. Wait. |
| **Expected Visible Result** | Swal success: "Sources Found! — Added N new sources (M duplicates skipped)". |
| **Automation Status** | `Automatable`. |

---

### SOURCE-011: Bulk Convert Multiple Sources → Background Generation
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-011` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — "Convert Selected Articles" button |
| **User Story** | As an admin, I want to select multiple articles and click "Convert Selected" so all convert in background, so I can batch-create content. |
| **Precondition** | 2+ articles selected via checkboxes. |
| **Exact Browser Steps** | 1. Check 2+ article checkboxes. 2. Click "Convert Selected Articles". 3. Loading overlay. 4. Swal: "Articles are being generated — We are generating N article(s) in the background." 5. Click OK. |
| **Expected Visible Result** | Selection cleared. Informational alert. No immediate navigation to create. |
| **Expected Network Call** | `POST /minimax/generate-articles/by-ids` with `{ids: [id1, id2...]}` → 200. |
| **Backend/Data Verification** | Multiple proto articles being generated server-side. |
| **Cleanup** | N/A. Wait for background job or check later. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### SOURCE-012: View Article Preview Modal
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-012` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — view (eye) button + Bootstrap modal |
| **User Story** | As an admin, I want to click the eye icon on a source article and see a preview of its content in a modal, so I can decide if it's worth converting. |
| **Exact Browser Steps** | 1. Click eye icon on any article row. 2. View modal opens with article content. |
| **Expected Visible Result** | Modal title = article title. Modal body shows article HTML content. Footer has "Create Article From This Source" button. |
| **Expected Network Call** | None — content from local state. |
| **Cleanup** | Click X or Cancel. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-013: Delete Source Article
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-013` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — trash icon |
| **User Story** | As an admin, I want to delete a source article from my local list, so I can remove ones I don't want to convert. |
| **Exact Browser Steps** | 1. Click trash icon on any row. 2. Confirm `confirm()` dialog. 3. Article removed from table. |
| **Expected Visible Result** | Row disappears from table. |
| **Expected Network Call** | None (client-side removal only — no backend delete endpoint called). |
| **Cleanup** | Refresh to restore. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-014: Generate New Source Article (Modal Opens)
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-014` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — Generate button + Bootstrap modal |
| **User Story** | As an admin, I want to click "Generate New Source Article" and fill in a topic so AI creates a new source article I can then convert. |
| **Exact Browser Steps** | 1. Click "Generate New Source Article" button. 2. Modal opens with Topic/Keywords input and Instructions textarea. |
| **Expected Visible Result** | Generate modal visible. Topic input empty. Instructions empty. |
| **Expected Network Call** | None yet. |
| **Cleanup** | Cancel modal. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-015: Generate New Source Article → Submit
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-015` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — Generate modal + `generateArticle()` |
| **User Story** | As an admin, I want to type a topic, submit, and see the new source article added to my list. |
| **Precondition** | Generate modal open from SOURCE-014. |
| **Exact Browser Steps** | 1. Type "Renewable energy trends" in topic input. 2. Click "Generate Article". 3. Loading. 4. Modal closes. 5. New article appears at top of table. |
| **Expected Visible Result** | New article row prepended to table. ID = timestamp (temporary). |
| **Expected Network Call** | `POST /minimax/generate-article` with `{messages: [{role:'system',...}, {role:'user', content: topic}]}` → 200 with `{html, summary}`. |
| **Backend/Data Verification** | New article added to `sourceArticles` ref. |
| **Cleanup** | Delete new article. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — AI-dependent. |

---

### SOURCE-016: Provider Persists After Page Reload
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-016` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — provider localStorage persistence |
| **User Story** | As an admin, when I switch providers and reload the page, I want the same provider to still be selected, so I don't have to reselect it. |
| **Exact Browser Steps** | 1. Select "Magic AI" (gpt). 2. Reload page. 3. Wait for load. |
| **Expected Visible Result** | Provider dropdown shows "Magic AI" selected. Table shows GPT articles. |
| **Expected Network Call** | `GET /gpt/sourceArticles/all` on reload. |
| **Backend/Data Verification** | `localStorage.getItem('sourceProvider')` = `'gpt'`. |
| **Cleanup** | Switch back to MiniMax. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### SOURCE-017: Empty State — No Articles Found
| Field | Value |
|-------|-------|
| **Test ID** | `SOURCE-017` |
| **Frontend URL** | `/admin/source-articles` |
| **Screen/Component** | `SourceArticles.vue` — empty state |
| **User Story** | As an admin, when there are no source articles for a provider, I want to see a clear empty state with a "Generate" button, so I'm not confused. |
| **Precondition** | Provider has no articles (or use a provider that returns empty). |
| **Exact Browser Steps** | 1. Switch to a provider with no articles. 2. Wait. |
| **Expected Visible Result** | Empty state: file-earmark-text icon, "No source articles found" text, "Generate New Source Article" button. |
| **Expected Network Call** | `GET /<provider>/sourceArticles/all` → 200 with empty array. |
| **Cleanup** | Switch back. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

## SECTION 5: ARTICLE PROMPT MANAGER — `/admin/articles/prompts`

**Screen file:** `src/views/Admin/Articles/PromptManager.vue`

### PROMPTS-001: Load Prompt Manager (SuperAdmin Only)
| Field | Value |
|-------|-------|
| **Test ID** | `PROMPTS-001` |
| **Frontend URL** | `/admin/articles/prompts` |
| **Screen/Component** | `PromptManager.vue` |
| **User Story** | As a SuperAdmin, I want to see a list of AI prompts I can edit, so I can customize how AI generates articles. |
| **Precondition** | SuperAdmin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles/prompts`. |
| **Expected Visible Result** | Page loads with prompts list. |
| **Expected Network Call** | `GET /laudium/api/v1/prompts` → 200 with prompts array. |
| **Backend/Data Verification** | Prompts list populated. |
| **Automation Status** | `Automatable`. |

---

### PROMPTS-002: Non-SuperAdmin Access → 403 Forbidden
| Field | Value |
|-------|-------|
| **Test ID** | `PROMPTS-002` |
| **Frontend URL** | `/admin/articles/prompts` |
| **Screen/Component** | Router guard + `PromptManager.vue` |
| **User Story** | As an admin (non-superadmin), I want to be redirected to 403 when trying to access prompts, so I can't modify AI system prompts. |
| **Precondition** | Admin logged in (role=admin, not superadmin). |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles/prompts`. |
| **Expected Visible Result** | Redirected to `/403`. |
| **Expected Network Call** | None — guard check before route load. |
| **Backend/Data Verification** | Route guard `isSuperAdminRoute` check. |
| **Automation Status** | `Automatable`. |

---

## SECTION 6: ARTICLES LIST — `/admin/articles`

**Screen file:** `src/views/Admin/Articles/Index.vue`
**Components:** `Stats`, `ArticlesTable`, `ArticlePreview`, `DatePicker`

### LIST-001: Load Articles List (All Status)
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-001` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` |
| **User Story** | As an admin, I want to see all articles in a sortable table, so I can find articles to edit or delete. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/articles`. |
| **Expected Visible Result** | Stats row at top (total counts per status). Articles table below. Pagination at bottom. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `{}` → 200 with `{articles: [...], page, totalPages}`. |
| **Backend/Data Verification** | `posts` ref populated. |
| **Automation Status** | `Automatable`. |

---

### LIST-002: Filter by Published Status → Only Published Shown
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-002` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — status tabs |
| **User Story** | As an admin, I want to click the "Published" tab and see only published articles, so I can manage live content. |
| **Exact Browser Steps** | 1. Click "Published" tab. |
| **Expected Visible Result** | Tab highlights. Table shows only `status: "published"` articles. URL query updates `?status=published`. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `status: "published"` → 200. |
| **Automation Status** | `Automatable`. |

---

### LIST-003: Filter by Draft Status
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-003` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — status tabs |
| **User Story** | As an admin, I want to click the "Draft" tab and see only draft articles, so I can find unpublished work. |
| **Exact Browser Steps** | 1. Click "Draft" tab. |
| **Expected Visible Result** | Tab highlights. Table shows only `status: "draft"` articles. URL query updates `?status=draft`. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `status: "draft"` → 200. |
| **Backend/Data Verification** | Table shows only draft articles. |
| **Cleanup** | Click "All" tab to reset. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### LIST-004: Filter by Scheduled Status
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-004` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — status tabs |
| **User Story** | As an admin, I want to click the "Scheduled" tab and see only scheduled articles, so I can manage queued content. |
| **Exact Browser Steps** | 1. Click "Scheduled" tab. |
| **Expected Visible Result** | Tab highlights. Table shows only `status: "scheduled"` articles. URL query updates `?status=scheduled`. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `status: "scheduled"` → 200. |
| **Backend/Data Verification** | Table shows only scheduled articles. |
| **Cleanup** | Click "All" tab to reset. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### LIST-005: Filter by Archived Status
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-005` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — status tabs |
| **User Story** | As an admin, I want to click the "Archived" tab and see only archived articles, so I can find old content. |
| **Exact Browser Steps** | 1. Click "Archived" tab. |
| **Expected Visible Result** | Tab highlights. Table shows only `status: "archived"` articles. URL query updates `?status=archived`. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `status: "archived"` → 200. |
| **Backend/Data Verification** | Table shows only archived articles. |
| **Cleanup** | Click "All" tab to reset. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. | |

---

### LIST-006: Search Articles by Keyword
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-006` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — search input |
| **User Story** | As an admin, I want to type a keyword in search and see matching articles update in real-time, so I can find specific articles quickly. |
| **Exact Browser Steps** | 1. Type "climate" in search input. 2. Wait 500ms (debounce). |
| **Expected Visible Result** | Table updates with articles matching "climate" in title/content. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `search: "climate"` → 200. |
| **Automation Status** | `Automatable`. |

---

### LIST-007: Filter by Category
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-007` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — category select |
| **User Story** | As an admin, I want to filter articles by category, so I can see only articles in a specific topic. |
| **Exact Browser Steps** | 1. Select a category from dropdown. |
| **Expected Visible Result** | Table filters to show only articles with that category. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `category: <id>`. |
| **Automation Status** | `Automatable`. |

---

### LIST-008: Date Range Filter
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-008` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — `DatePicker` |
| **User Story** | As an admin, I want to select a date range and see only articles created within that period. |
| **Exact Browser Steps** | 1. Click DatePicker. 2. Select start and end date. 3. Click "Apply Filters". |
| **Expected Visible Result** | Table filters to date range. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `startDate`, `endDate`. |
| **Automation Status** | `Automatable`. |

---

### LIST-009: Clear All Filters
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-009` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — "Clear Filters" button |
| **User Story** | As an admin, I want to click "Clear Filters" to reset all filters at once, so I can return to the full list. |
| **Exact Browser Steps** | 1. Apply filters (search + category + date). 2. Click "Clear Filters". |
| **Expected Visible Result** | Search cleared. Category reset. Date range cleared. Table shows all articles. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with empty params → 200. |
| **Automation Status** | `Automatable`. |

---

### LIST-010: Pagination → Next Page
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-010` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — pagination |
| **User Story** | As an admin, I want to click "Next" to see the next page of articles, so I can browse beyond the first page. |
| **Exact Browser Steps** | 1. Click "Next" in pagination. |
| **Expected Visible Result** | URL query updates `?page=1`. Table shows next set of articles. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `page: 1`. |
| **Automation Status** | `Automatable`. |

---

### LIST-011: Change Page Size
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-011` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — page size select |
| **User Story** | As an admin, I want to change the page size to 50 so I can see more articles at once. |
| **Exact Browser Steps** | 1. Select "50" from page size dropdown. |
| **Expected Visible Result** | Table refreshes showing up to 50 articles per page. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `size: 50`. |
| **Automation Status** | `Automatable`. |

---

### LIST-012: Preview Article → Opens Modal
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-012` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — preview (eye) button + `ArticlePreview` modal |
| **User Story** | As an admin, I want to click the preview (eye) button on any article row and see a full preview in a modal, so I can review before editing. |
| **Exact Browser Steps** | 1. Click eye icon on any article row. 2. Preview modal opens. |
| **Expected Visible Result** | Modal shows full article preview with title, content, image, metadata. Edit and Close buttons in footer. |
| **Expected Network Call** | None — uses data already loaded in table. |
| **Backend/Data Verification** | `selectedArticle` set. |
| **Cleanup** | Click X or Close. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### LIST-013: Preview → Edit → Navigate to Edit Screen
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-013` |
| **Frontend URL** | `/admin/articles` → `/admin/articles/edit/:id` |
| **Screen/Component** | `ArticlePreview` modal → Edit button |
| **User Story** | As an admin, viewing a preview, I want to click Edit so I can go directly to the edit form. |
| **Exact Browser Steps** | 1. Open preview (LIST-012). 2. Click "Edit" button. |
| **Expected Visible Result** | Modal closes. URL → `/admin/articles/edit/:id`. Edit form loads. |
| **Expected Network Call** | `GET /laudium/api/v1/articles/:id`. |
| **Automation Status** | `Automatable`. |

---

### LIST-014: Delete Article from List
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-014` |
| **Frontend URL** | `/admin/articles` |
| **Screen/Component** | `Index.vue` — delete button + confirmation modal |
| **User Story** | As an admin, I want to delete an article directly from the list using the trash icon, so I don't have to open edit first. |
| **Exact Browser Steps** | 1. Click trash icon on article row. 2. Confirmation modal opens. 3. Click "Delete Article". |
| **Expected Visible Result** | Modal closes. Row disappears from table. |
| **Expected Network Call** | `DELETE /laudium/api/v1/articles/:id`. |
| **Backend/Data Verification** | Article deleted from DB. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### LIST-015: Publish All Scheduled Articles
| Field | Value |
|-------|-------|
| **Test ID** | `LIST-015` |
| **Frontend URL** | `/admin/articles` (when status=scheduled) |
| **Screen/Component** | `Index.vue` — "Publish All" button |
| **User Story** | As an admin, I want to click "Publish All" to immediately publish all scheduled articles, so I can batch-publish queued content. |
| **Exact Browser Steps** | 1. Click "Scheduled" tab. 2. Click "Publish All". 3. Loading. 4. Toast "Published Successfully". |
| **Expected Visible Result** | Toast success. All scheduled articles now published. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/publish-scheduled` with `{startDate, endDate, publishAll}`. |
| **Backend/Data Verification** | All targeted `status` changed to `published`. `scheduled_for` cleared. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

## SECTION 7: ADMIN DASHBOARD — `/admin/dashboard`

**Screen file:** `src/views/Admin/Dashboard/Index.vue`

### DASH-001: Load Admin Dashboard
| Field | Value |
|-------|-------|
| **Test ID** | `DASH-001` |
| **Frontend URL** | `/admin/dashboard` |
| **Screen/Component** | `Dashboard/Index.vue` |
| **User Story** | As an admin, I want the dashboard to load with statistics and charts, so I can see an overview of site health. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/dashboard`. |
| **Expected Visible Result** | Dashboard renders with stats cards, charts, activity. |
| **Expected Network Call** | `GET /dashboard/stats` (or equivalent). |
| **Automation Status** | `Automatable`. |

---

## SECTION 8: ADMIN ADS MANAGEMENT — `/admin/ads` + `/admin/ads/create` + `/admin/ads/edit/:id`

**Screen file:** `src/views/Admin/Ads/AdForm.vue`
**Services:** `ads.js` — `createAd`, `editAd`, `getAd`
**Composables:** `useAdForm`

### AD-001: Load Create Ad Form
| Field | Value |
|-------|-------|
| **Test ID** | `AD-001` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` |
| **User Story** | As an admin, I want the create ad form to load with all fields and defaults, so I can fill in ad details. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/ads/create`. |
| **Expected Visible Result** | Form loads: Title, Business dropdown + inline create, Campaign dropdown + inline create, Description, Media type toggle (Image/Video), Image upload OR YouTube URL input, Placement dropdown, Click URL, Start Date, End Date (auto-calculated), Total Cost (R900), Payment section, Tags, Enabled checkbox, Save button. |
| **Expected Network Call** | `GET /placements`, `GET /businesses`, `GET /campaigns`, `GET /tags` all in parallel. |
| **Automation Status** | `Automatable`. |

---

### AD-002: Create Ad — Select Image Media Type
| Field | Value |
|-------|-------|
| **Test ID** | `AD-002` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — media type toggle |
| **User Story** | As an admin, I want to click "Image Ad" and see the image upload section, so I can provide a banner image for my ad. |
| **Exact Browser Steps** | 1. Click "Image Ad" button. |
| **Expected Visible Result** | Image section shows: `MultiImagePicker` component. Video section hidden. |
| **Expected Network Call** | None. |
| **Automation Status** | `Automatable`. |

---

### AD-003: Create Ad — Select Video Media Type → YouTube URL
| Field | Value |
|-------|-------|
| **Test ID** | `AD-003` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — media type toggle + YouTube input |
| **User Story** | As an admin, I want to click "Video Ad" and enter a YouTube URL so my ad plays a video. |
| **Exact Browser Steps** | 1. Click "Video Ad" button. 2. Enter `https://www.youtube.com/watch?v=abc123` in URL field. |
| **Expected Visible Result** | Video section shows URL input + YouTube embed preview iframe. Image section hidden. |
| **Expected Network Call** | None. |
| **Automation Status** | `Automatable`. |

---

### AD-004: Create Ad — YouTube Short Detected (9:16 Badge)
| Field | Value |
|-------|-------|
| **Test ID** | `AD-004` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — YouTube Short detection |
| **User Story** | As an admin, when I paste a YouTube Shorts URL, I want to see a "YouTube Short (9:16)" badge so I know the format is correct for mobile ads. |
| **Exact Browser Steps** | 1. Video Ad selected. 2. Paste `https://youtube.com/shorts/xyz123`. |
| **Expected Visible Result** | Red "YouTube Short (9:16)" badge appears in preview label. Preview uses 9:16 aspect ratio. |
| **Expected Network Call** | None. |
| **Automation Status** | `Automatable`. |

---

### AD-005: Create Ad — Inline Create Business
| Field | Value |
|-------|-------|
| **Test ID** | `AD-005` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — Business dropdown + "+" button + modal |
| **User Story** | As an admin, when the business I need doesn't exist, I want to click "+" and create it inline without leaving the ad form. |
| **Exact Browser Steps** | 1. Click "+" next to Business dropdown. 2. Inline modal opens. 3. Enter business name. 4. Click Create. 5. Modal closes. 6. Business dropdown auto-selects new business. |
| **Expected Visible Result** | New business in dropdown selected. Success toast. |
| **Expected Network Call** | `POST /businesses` → 201. |
| **Backend/Data Verification** | Business created in DB. |
| **Cleanup** | Delete business after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### AD-006: Create Ad — Inline Create Campaign
| Field | Value |
|-------|-------|
| **Test ID** | `AD-006` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — Campaign dropdown + "+" button |
| **User Story** | As an admin, I want to create a campaign inline from the ad form, so I don't have to go to a separate screen. |
| **Exact Browser Steps** | 1. Select a business first. 2. Click "+" next to Campaign dropdown. 3. Enter campaign name. 4. Click Create. |
| **Expected Visible Result** | New campaign selected in dropdown. |
| **Expected Network Call** | `POST /campaigns` → 201. |
| **Backend/Data Verification** | Campaign created in DB. |
| **Cleanup** | Delete campaign after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### AD-007: Create Ad — Save (All Fields Valid)
| Field | Value |
|-------|-------|
| **Test ID** | `AD-007` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — submit |
| **User Story** | As an admin, I want to fill in all required fields and save, so my ad is created and goes live according to its schedule. |
| **Precondition** | Form data valid. |
| **Exact Browser Steps** | 1. Fill all required fields. 2. Click Save. 3. Loading. 4. Success toast. 5. Modal closes. |
| **Expected Visible Result** | Success toast. Redirect to ads list. |
| **Expected Network Call** | `POST /ads` with full payload. |
| **Backend/Data Verification** | Ad record created in DB. |
| **Cleanup** | Delete ad after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### AD-008: Create Ad — Validation Error (Missing Required Field)
| Field | Value |
|-------|-------|
| **Test ID** | `AD-008` |
| **Frontend URL** | `/admin/ads/create` |
| **Screen/Component** | `AdForm.vue` — `validateForm()` |
| **User Story** | As an admin, I want validation errors shown inline when I try to save without required fields, so I know exactly what's missing. |
| **Exact Browser Steps** | 1. Leave title empty. 2. Click Save. |
| **Expected Visible Result** | Save blocked. Title field gets `is-invalid`. Alert: "Title is required" (or first validation error). |
| **Expected Network Call** | None. |
| **Automation Status** | `Automatable`. |

---

### AD-009: Edit Ad — Load Pre-filled Form
| Field | Value |
|-------|-------|
| **Test ID** | `AD-009` |
| **Frontend URL** | `/admin/ads/edit/:id` |
| **Screen/Component** | `AdForm.vue` (edit mode) |
| **User Story** | As an admin, I want the ad form pre-filled when I open edit, so I can see and modify existing ad settings. |
| **Exact Browser Steps** | 1. Navigate to `/admin/ads/edit/:id`. |
| **Expected Visible Result** | All fields pre-filled. Header says "Edit Ad". |
| **Expected Network Call** | `GET /ads/:id` (full data) plus all dropdown data. |
| **Backend/Data Verification** | Form matches DB record. |
| **Automation Status** | `Automatable`. |

---

### AD-010: Edit Ad — Save Changes
| Field | Value |
|-------|-------|
| **Test ID** | `AD-010` |
| **Frontend URL** | `/admin/ads/edit/:id` |
| **Screen/Component** | `AdForm.vue` — submit |
| **User Story** | As an admin, I want to change ad settings and save, so the ad is updated on the site. |
| **Exact Browser Steps** | 1. Change description. 2. Click Save. |
| **Expected Visible Result** | Success toast. Modal closes. |
| **Expected Network Call** | `PUT /ads/:id` with updated payload. |
| **Backend/Data Verification** | DB record updated. |
| **Cleanup** | Revert manually if needed. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

## SECTION 9: ADMIN ANNOUNCEMENTS — Create/Edit

**Screen file:** `src/views/Admin/Announcements/CreateOrEdit.vue`

### ANN-001: Load Create Announcement Form
| Field | Value |
|-------|-------|
| **Test ID** | `ANN-001` |
| **Frontend URL** | `/admin/announcements/create` |
| **Screen/Component** | `CreateOrEdit.vue` |
| **User Story** | As an admin, I want the create announcement form to load with all fields, so I can create community announcements. |
| **Exact Browser Steps** | 1. Navigate to `/admin/announcements/create`. |
| **Expected Visible Result** | Form: Category dropdown, Priority dropdown, Title input, ImagePicker, Content (Quill) OR Funeral form, Location input, Status dropdown, Publish Date, Expiry Date, Save/Cancel buttons. |
| **Expected Network Call** | `GET /announcements/categories`. |
| **Automation Status** | `Automatable`. |

---

### ANN-002: Create Announcement → Publish Now
| Field | Value |
|-------|-------|
| **Test ID** | `ANN-002` |
| **Frontend URL** | `/admin/announcements/create` |
| **Screen/Component** | `CreateOrEdit.vue` — save |
| **User Story** | As an admin, I want to fill in announcement details and publish immediately, so the announcement appears on the site right away. |
| **Exact Browser Steps** | 1. Fill category, priority, title, content. 2. Select status "published". 3. Click Create. |
| **Expected Visible Result** | Success toast. Redirect to `/admin/announcements`. |
| **Expected Network Call** | `POST /announcements` with all fields. |
| **Backend/Data Verification** | Announcement in DB. |
| **Cleanup** | Delete announcement after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### ANN-003: Create Announcement — Select Funeral Category → Hides Content Editor
| Field | Value |
|-------|-------|
| **Test ID** | `ANN-003` |
| **Frontend URL** | `/admin/announcements/create` |
| **Screen/Component** | `CreateOrEdit.vue` — `isSelectedFuneralCategory` computed |
| **User Story** | As an admin, when I select a "Funeral" category, I want the rich text content editor to be hidden since funeral announcements only need the image. |
| **Exact Browser Steps** | 1. Select category containing "funeral" (case-insensitive). |
| **Expected Visible Result** | Content (Quill) editor hidden. ImagePicker shown as required. Location field shown. |
| **Expected Network Call** | None. |
| **Automation Status** | `Automatable`. |

---

### ANN-004: Edit Announcement
| Field | Value |
|-------|-------|
| **Test ID** | `ANN-004` |
| **Frontend URL** | `/admin/announcements/edit/:id` |
| **Screen/Component** | `CreateOrEdit.vue` (edit mode) |
| **User Story** | As an admin, I want to edit an existing announcement so I can correct errors or update details. |
| **Exact Browser Steps** | 1. Navigate to `/admin/announcements/edit/:id`. 2. Change title. 3. Click Update. |
| **Expected Network Call** | `GET /announcements/:id`, then `PUT /announcements/:id`. |
| **Automation Status** | `Automatable`. |

---

## SECTION 10: ADMIN ADS PLACEMENTS — `/admin/ads/ad-placements`

**Screen file:** `src/views/Admin/AdPlacements/Index.vue`

### PLAC-001: Load Ad Placements List
| Field | Value |
|-------|-------|
| **Test ID** | `PLAC-001` |
| **Frontend URL** | `/admin/ads/ad-placements` |
| **Screen/Component** | `AdPlacements/Index.vue` |
| **User Story** | As a SuperAdmin, I want to see all ad placements (positions) so I can manage where ads appear on the site. |
| **Exact Browser Steps** | 1. Navigate to `/admin/ads/ad-placements`. |
| **Expected Visible Result** | Placements table/list loads. |
| **Expected Network Call** | `GET /ad-placements`. |
| **Automation Status** | `Automatable`. |

---

### PLAC-002: Create Ad Placement
| Field | Value |
|-------|-------|
| **Test ID** | `PLAC-002` |
| **Frontend URL** | `/admin/ads/ad-placements` |
| **Screen/Component** | `AdPlacements/Form.vue` |
| **User Story** | As a SuperAdmin, I want to create a new ad placement so ads can appear in a new location on the site. |
| **Exact Browser Steps** | 1. Click Create (or open form). 2. Fill placement details. 3. Submit. |
| **Expected Network Call** | `POST /ad-placements`. |
| **Automation Status** | `Automatable`. |

---

### PLAC-003: Verify Placement Renders on Public Homepage
| Field | Value |
|-------|-------|
| **Test ID** | `PLAC-003` |
| **Frontend URL** | `/` (public homepage) |
| **Screen/Component** | `AdPlacements/Index.vue` + public homepage |
| **User Story** | As an admin, after creating an ad placement, I want to verify it actually renders on the public site in the correct position. |
| **Exact Browser Steps** | 1. Create placement (PLAC-002). 2. Open new browser/tab. 3. Navigate to `/`. 4. Find ad in correct position. |
| **Expected Network Call** | `GET /laudium/api/v1/ads/placement/main_page_ad/all` returns placement ads. |
| **Backend/Data Verification** | Ad renders visually in expected position. |
| **Cleanup** | Delete placement after test. |
| **Evidence** | Screenshot of ad on homepage. |
| **Automation Status** | `Manual` — requires visual verification. |

---

## SECTION 11: ADMIN BUSINESSES — `/admin/businesses`

**Screen file:** `src/views/Admin/Businesses/Index.vue`

### BIZ-001: Load Businesses List
| Field | Value |
|-------|-------|
| **Test ID** | `BIZ-001` |
| **Frontend URL** | `/admin/businesses` |
| **Screen/Component** | `Admin/Businesses/Index.vue` |
| **User Story** | As an admin, I want to see all registered businesses so I can manage them. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Navigate to `/admin/businesses`. |
| **Expected Visible Result** | Businesses table/list loads with business names, categories, status. |
| **Expected Network Call** | `GET /laudium/api/v1/businesses` → 200. |
| **Backend/Data Verification** | Business list populated. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### BIZ-002: Create Business Inline
| Field | Value |
|-------|-------|
| **Test ID** | `BIZ-002` |
| **Frontend URL** | `/admin/businesses` |
| **Screen/Component** | `Admin/Businesses/Index.vue` — inline create |
| **User Story** | As an admin, I want to create a new business directly from the businesses list so I don't have to navigate away. |
| **Precondition** | Admin logged in. |
| **Exact Browser Steps** | 1. Click "Create Business" or "+" button. 2. Fill business name and details. 3. Submit. |
| **Expected Visible Result** | New business appears in list. Success toast. |
| **Expected Network Call** | `POST /laudium/api/v1/businesses` → 201. |
| **Backend/Data Verification** | Business record created in DB. |
| **Cleanup** | Delete created business after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. | |

---

## SECTION 12: BUSINESS LOGIN + REGISTER + DASHBOARD

### BIZLOGIN-001: Business Login Page Loads
| Field | Value |
|-------|-------|
| **Test ID** | `BIZLOGIN-001` |
| **Frontend URL** | `/business/login` |
| **Screen/Component** | `Business/Login.vue` |
| **User Story** | As a business user, I want to see the login form so I can access my business dashboard. |
| **Precondition** | None. |
| **Exact Browser Steps** | 1. Navigate to `/business/login`. |
| **Expected Visible Result** | Login form renders: email/phone input, password input, Login button, Register link. |
| **Expected Network Call** | None on load. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### BIZLOGIN-002: Business Login Success → Redirect to Dashboard
| Field | Value |
|-------|-------|
| **Test ID** | `BIZLOGIN-002` |
| **Frontend URL** | `/business/login` |
| **Screen/Component** | `Business/Login.vue` |
| **User Story** | As a business user, I want to log in with valid credentials and be redirected to my dashboard. |
| **Precondition** | Valid business account with email/password. |
| **Exact Browser Steps** | 1. Navigate to `/business/login`. 2. Enter email. 3. Enter password. 4. Click Login. |
| **Expected Visible Result** | Button shows "Logging in..." then redirects to `/business/dashboard`. |
| **Expected Network Call** | `POST /laudium/api/v1/auth/login` or `/business/login` → 200 with token. |
| **Backend/Data Verification** | Session stored. User redirected to dashboard. |
| **Cleanup** | Log out after test. |
| **Evidence** | Screenshot of dashboard. HAR. |
| **Automation Status** | `Automatable` — needs `TEST_BUSINESS_EMAIL` + `TEST_BUSINESS_PASSWORD`. |

---

### BIZREG-001: Business Register Page Loads
| Field | Value |
|-------|-------|
| **Test ID** | `BIZREG-001` |
| **Frontend URL** | `/business/register` |
| **Screen/Component** | `Business/Register.vue` |
| **User Story** | As a business user, I want to see the registration form so I can create a new account. |
| **Precondition** | None. |
| **Exact Browser Steps** | 1. Navigate to `/business/register`. |
| **Expected Visible Result** | Registration form renders: business name, email, phone, password, confirm password, Submit button, Login link. |
| **Expected Network Call** | None on load. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### BIZREG-002: Business Registration → Creates Account + Redirects
| Field | Value |
|-------|-------|
| **Test ID** | `BIZREG-002` |
| **Frontend URL** | `/business/register` |
| **Screen/Component** | `Business/Register.vue` |
| **User Story** | As a new business, I want to register and be redirected to my dashboard. |
| **Precondition** | No existing account with test email. |
| **Exact Browser Steps** | 1. Navigate to `/business/register`. 2. Fill all required fields. 3. Click Register. |
| **Expected Visible Result** | Button shows "Registering..." then redirects to `/business/dashboard`. Success message. |
| **Expected Network Call** | `POST /laudium/api/v1/businesses/register` or `/auth/register` → 201. |
| **Backend/Data Verification** | Business account created in DB. |
| **Cleanup** | Delete created business account after test. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — needs unique test email for each run. |

---

## SECTION 13: PUBLIC PAGES — ALL 21 PUBLIC ROUTES

### PUBPAGE-001: Homepage Loads → Newspaper Gallery
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-001` |
| **Frontend URL** | `/` |
| **Screen/Component** | `News/News.vue` |
| **User Story** | As a visitor, I want the homepage to load with the newspaper gallery showing article cards, so I can browse the latest news. |
| **Exact Browser Steps** | 1. Navigate to `/`. |
| **Expected Visible Result** | Newspaper gallery with article cards. Breaking news ticker. Main page ads. |
| **Expected Network Call** | `POST /laudium/api/v1/articles/feed` → 200. |
| **Backend/Data Verification** | Articles visible. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-002: News Listing Page — `/news`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-002` |
| **Frontend URL** | `/news` |
| **Screen/Component** | `News/News.vue` |
| **User Story** | As a visitor, I want to see the latest news articles in a listing, so I can browse recent stories. |
| **Exact Browser Steps** | 1. Navigate to `/news`. |
| **Expected Visible Result** | Article listing loads. Cards visible with titles, summaries, dates. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-003: News Archive — `/news/archive`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-003` |
| **Frontend URL** | `/news/archive` |
| **Screen/Component** | `News/Archive.vue` |
| **User Story** | As a visitor, I want to browse archived news articles. |
| **Exact Browser Steps** | 1. Navigate to `/news/archive`. |
| **Expected Visible Result** | Archive listing loads. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with archive filter → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-004: Article Detail — `/news/:slug`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-004` |
| **Frontend URL** | `/news/:slug` |
| **Screen/Component** | `Article/Article.vue` |
| **User Story** | As a visitor, I want to read a full article with images, audio, and related content. |
| **Precondition** | Known article slug exists. |
| **Exact Browser Steps** | 1. Click article card on homepage. 2. Wait for page load. |
| **Expected Visible Result** | Article title, content, cover image, author, date visible. Audio player if available. |
| **Expected Network Call** | `GET /laudium/api/v1/articles/slug/:slug` → 200. |
| **Cleanup** | Navigate back. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-005: Category Filter — `/categories/:slug`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-005` |
| **Frontend URL** | `/categories/:slug` |
| **Screen/Component** | `Category/Index.vue` |
| **User Story** | As a visitor, I want to filter articles by category. |
| **Precondition** | Known category slug exists. |
| **Exact Browser Steps** | 1. Navigate to `/categories/:slug`. |
| **Expected Visible Result** | Filtered article list. Category name shown in header. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `category` filter → 200. |
| **Cleanup** | Navigate back. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-006: Tag Filter — `/tags/:slug`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-006` |
| **Frontend URL** | `/tags/:slug` |
| **Screen/Component** | `Tag/Index.vue` |
| **User Story** | As a visitor, I want to filter articles by tag. |
| **Precondition** | Known tag slug exists. |
| **Exact Browser Steps** | 1. Navigate to `/tags/:slug`. |
| **Expected Visible Result** | Filtered article list. Tag name shown. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `tag` filter → 200. |
| **Cleanup** | Navigate back. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-007: Community Notices — `/community`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-007` |
| **Frontend URL** | `/community` |
| **Screen/Component** | `Community/Index.vue` |
| **User Story** | As a visitor, I want to see community notices and announcements. |
| **Exact Browser Steps** | 1. Navigate to `/community`. |
| **Expected Visible Result** | Community notices listing loads. |
| **Expected Network Call** | `GET /laudium/api/v1/community` or equivalent → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-008: Notice Detail — `/community/:slug`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-008` |
| **Frontend URL** | `/community/:slug` |
| **Screen/Component** | `Community/Notice.vue` |
| **User Story** | As a visitor, I want to read a full community notice. |
| **Precondition** | Known notice slug exists. |
| **Exact Browser Steps** | 1. Navigate to `/community/:slug`. |
| **Expected Visible Result** | Notice title, content, date visible. |
| **Expected Network Call** | `GET /laudium/api/v1/community/:slug` → 200. |
| **Cleanup** | Navigate back. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-009: Announcements — `/announcements`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-009` |
| **Frontend URL** | `/announcements` |
| **Screen/Component** | `Announcements/Index.vue` |
| **User Story** | As a visitor, I want to see public announcements. |
| **Exact Browser Steps** | 1. Navigate to `/announcements`. |
| **Expected Visible Result** | Announcements listing loads. |
| **Expected Network Call** | `GET /laudium/api/v1/announcements` → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-010: Business Directory — `/directory`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-010` |
| **Frontend URL** | `/directory` |
| **Screen/Component** | `Directory/Index.vue` |
| **User Story** | As a visitor, I want to browse the business directory. |
| **Exact Browser Steps** | 1. Navigate to `/directory`. |
| **Expected Visible Result** | Business directory listing loads. |
| **Expected Network Call** | `GET /laudium/api/v1/businesses` → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-011: Directory Item — `/directory/:slug`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-011` |
| **Frontend URL** | `/directory/:slug` |
| **Screen/Component** | `Directory/Item.vue` |
| **User Story** | As a visitor, I want to see details of a specific business. |
| **Precondition** | Known business slug exists. |
| **Exact Browser Steps** | 1. Navigate to `/directory/:slug`. |
| **Expected Visible Result** | Business name, description, contact info, image visible. |
| **Expected Network Call** | `GET /laudium/api/v1/businesses/:slug` → 200. |
| **Cleanup** | Navigate back. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-012: Community Events — `/events`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-012` |
| **Frontend URL** | `/events` |
| **Screen/Component** | `Events/Events.vue` |
| **User Story** | As a visitor, I want to see community events. |
| **Exact Browser Steps** | 1. Navigate to `/events`. |
| **Expected Visible Result** | Events listing loads. |
| **Expected Network Call** | `GET /laudium/api/v1/events` → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-013: Search Results — `/search`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-013` |
| **Frontend URL** | `/search` |
| **Screen/Component** | `Search/Search.vue` |
| **User Story** | As a visitor, I want to search for articles and content. |
| **Exact Browser Steps** | 1. Navigate to `/search`. 2. Type query. 3. Submit. |
| **Expected Visible Result** | Search results listing. |
| **Expected Network Call** | `POST /laudium/api/v1/articles` with `search` query → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-014: YouTube Podcasts — `/podcasts`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-014` |
| **Frontend URL** | `/podcasts` |
| **Screen/Component** | `YouTube/Index.vue` |
| **User Story** | As a visitor, I want to see YouTube podcast videos. |
| **Exact Browser Steps** | 1. Navigate to `/podcasts`. |
| **Expected Visible Result** | Podcast video listing loads. |
| **Expected Network Call** | `GET /laudium/api/v1/podcasts` or YouTube API → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-015: Terms of Use — `/terms-of-use`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-015` |
| **Frontend URL** | `/terms-of-use` |
| **Screen/Component** | `TermsOfUse.vue` |
| **User Story** | As a visitor, I want to read the terms of use. |
| **Exact Browser Steps** | 1. Navigate to `/terms-of-use`. |
| **Expected Visible Result** | Static terms page renders. |
| **Expected Network Call** | None (static page). |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-016: Privacy Policy — `/privacy-policy`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-016` |
| **Frontend URL** | `/privacy-policy` |
| **Screen/Component** | `PrivacyPolicy.vue` |
| **User Story** | As a visitor, I want to read the privacy policy. |
| **Exact Browser Steps** | 1. Navigate to `/privacy-policy`. |
| **Expected Visible Result** | Static privacy policy renders. |
| **Expected Network Call** | None (static page). |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-017: About — `/about`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-017` |
| **Frontend URL** | `/about` |
| **Screen/Component** | `AboutPublisher.vue` |
| **User Story** | As a visitor, I want to read about Laudium Post. |
| **Exact Browser Steps** | 1. Navigate to `/about`. |
| **Expected Visible Result** | Static about page renders. |
| **Expected Network Call** | None (static page). |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-018: Editorial Policy — `/editorial-policy`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-018` |
| **Frontend URL** | `/editorial-policy` |
| **Screen/Component** | `EditorialPolicy.vue` |
| **User Story** | As a visitor, I want to read the editorial policy. |
| **Exact Browser Steps** | 1. Navigate to `/editorial-policy`. |
| **Expected Visible Result** | Static editorial policy renders. |
| **Expected Network Call** | None (static page). |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-019: Corrections Policy — `/corrections`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-019` |
| **Frontend URL** | `/corrections` |
| **Screen/Component** | `CorrectionsPolicy.vue` |
| **User Story** | As a visitor, I want to read the corrections policy. |
| **Exact Browser Steps** | 1. Navigate to `/corrections`. |
| **Expected Visible Result** | Static corrections policy renders. |
| **Expected Network Call** | None (static page). |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-020: Payment Success — `/payment/success/:id`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-020` |
| **Frontend URL** | `/payment/success/:id` |
| **Screen/Component** | `Payment/Success.vue` |
| **User Story** | As a user, after paying for an ad I want to see a success confirmation. |
| **Precondition** | Valid payment ID from Payfast. |
| **Exact Browser Steps** | 1. Navigate to `/payment/success/123`. |
| **Expected Visible Result** | "Payment Successful" message. Order/reference details. |
| **Expected Network Call** | `GET /laudium/api/v1/payments/:id` → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

### PUBPAGE-021: Payment Cancelled — `/payment/cancel/:id`
| Field | Value |
|-------|-------|
| **Test ID** | `PUBPAGE-021` |
| **Frontend URL** | `/payment/cancel/:id` |
| **Screen/Component** | `Payment/Cancelled.vue` |
| **User Story** | As a user, if payment fails I want to see a clear cancellation message. |
| **Precondition** | Payment ID from Payfast. |
| **Exact Browser Steps** | 1. Navigate to `/payment/cancel/123`. |
| **Expected Visible Result** | "Payment Cancelled" message. Option to retry. |
| **Expected Network Call** | None or `GET /laudium/api/v1/payments/:id` → 200. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

## SECTION 14: ADMIN LOGIN — `/admin/login`

### ADMLOG-001: Admin Login Page Loads
| Field | Value |
|-------|-------|
| **Test ID** | `ADMLOG-001` |
| **Frontend URL** | `/admin/login` |
| **Screen/Component** | `Admin/Login.vue` |
| **User Story** | As an admin, I want to see the login form so I can access the admin dashboard. |
| **Precondition** | None. |
| **Exact Browser Steps** | 1. Navigate to `/admin/login`. |
| **Expected Visible Result** | Login form renders: email/phone input, password input, Login button. |
| **Expected Network Call** | None on load. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. |
| **Automation Status** | `Automatable`. |

---

### ADMLOG-002: Admin Login Success → Dashboard
| Field | Value |
|-------|-------|
| **Test ID** | `ADMLOG-002` |
| **Frontend URL** | `/admin/login` |
| **Screen/Component** | `Admin/Login.vue` |
| **User Story** | As an admin, I want to log in with valid credentials and be redirected to the admin dashboard. |
| **Precondition** | Valid admin account. |
| **Exact Browser Steps** | 1. Navigate to `/admin/login`. 2. Enter email. 3. Enter password. 4. Click Login. |
| **Expected Visible Result** | Button shows "Logging in..." then redirects to `/admin/dashboard`. |
| **Expected Network Call** | `POST /laudium/api/v1/admin/login` → 200 with token. |
| **Backend/Data Verification** | Admin session stored. User redirected to dashboard. |
| **Cleanup** | Log out after test. |
| **Evidence** | Screenshot of dashboard. HAR. |
| **Automation Status** | `Needs credential` — needs `TEST_ADMIN_EMAIL` + `TEST_ADMIN_PASSWORD`. |

---

### ADMLOG-003: Admin Login Invalid Credentials → Error
| Field | Value |
|-------|-------|
| **Test ID** | `ADMLOG-003` |
| **Frontend URL** | `/admin/login` |
| **Screen/Component** | `Admin/Login.vue` |
| **User Story** | As an admin, I want to see a clear error when I enter wrong credentials so I know the login failed. |
| **Precondition** | None. |
| **Exact Browser Steps** | 1. Navigate to `/admin/login`. 2. Enter wrong email. 3. Enter wrong password. 4. Click Login. |
| **Expected Visible Result** | Error message displayed. URL stays on `/admin/login`. No redirect. |
| **Expected Network Call** | `POST /laudium/api/v1/admin/login` → 401. |
| **Backend/Data Verification** | No session created. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable` — use intentionally wrong credentials. |

---

### ADMLOG-004: Unauthenticated Access to /admin → Redirect to Login
| Field | Value |
|-------|-------|
| **Test ID** | `ADMLOG-004` |
| **Frontend URL** | `/admin/dashboard` (without auth) |
| **Screen/Component** | Vue Router navigation guard |
| **User Story** | As an unauthenticated user, I want to be redirected to login when accessing admin routes directly. |
| **Precondition** | No admin session. |
| **Exact Browser Steps** | 1. Navigate directly to `/admin/dashboard` without logging in. |
| **Expected Visible Result** | Redirect to `/admin/login`. URL changes. |
| **Expected Network Call** | `GET /laudium/api/v1/admin/me` → 401 (if called). |
| **Backend/Data Verification** | No admin data exposed. |
| **Cleanup** | N/A. |
| **Evidence** | Screenshot. HAR. |
| **Automation Status** | `Automatable`. |

---

## SUMMARY COUNTS

| Category | Route Count | Granular Tests Defined |
|----------|------------|----------------------|
| Public Routes | 21 | See PUBPAGE-001–PUBPAGE-021 |
| Admin Routes | 27 | See EDIT, CREATE, SOURCE, PROMPT, LIST, AD, ANN, ADMLOG sections |
| Business Routes | 9 | See BIZ, BIZLOGIN, BIZREG sections |

---

## SACHA EXECUTION INSTRUCTION

**Do NOT execute the old high-level matrix.** Execute only the granular user-story tests in this document.

**Execution order recommendation:**
1. Run all EDIT-001–EDIT-033 (article edit screen — most complex, most user-visible AI actions)
2. Run CREATE-001–CREATE-029 (article create — mirrors edit tests)
3. Run SOURCE-001–SOURCE-017 (source articles — all 5 providers)
4. Run PROMPT-001–PROMPT-003 (article prompt modal)
5. Run LIST-001–LIST-015 (article list management)
6. Run AD-001–AD-010 (ad create/edit)
7. Run ANN-001–ANN-004 (announcements)
8. Run ADMLOG-001–ADMLOG-004 (admin auth), BIZ-001–BIZ-002 (business admin), BIZLOGIN-001–BIZLOGIN-002, BIZREG-001–BIZREG-002 (business auth)
9. Run PUBPAGE-001–PUBPAGE-021 (public page load + nav per route)
10. Run remaining admin sub-section tests

**For each test:**
- Capture screenshot on pass AND on fail
- Export HAR on any API failure
- Check console for Error-level messages
- Document actual vs expected in run-history

---

## BLOCKERS

| Blocker | Impact | Who Resolves |
|---------|--------|---------------|
| Admin credentials (`TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`) | Cannot run ADM-*, EDIT-*, SOURCE-*, LIST-*, AD-*, ANN-*, BIZ-001-002 | Alex |
| Business user credentials | Cannot run BIZLOGIN-*, BIZREG-* | Alex |
| AI provider API reachability (MiniMax, Gemini, GPT, Perplexity, X) | Cannot run SOURCE-* for non-MiniMax, PROMPT-002, EDIT-007, EDIT-008/009 | Alex/Chris |
| `tests/assets/test-image.png` not created | Cannot run EDIT-011 (image upload) | Sacha |
| Anti-bot/captcha on admin login | May break automated login tests | Chris |
| Backend running at `localhost:9011` | Cannot run any API-dependent tests locally | Dev environment |

---

**Document version:** 1.0 — Granular per-screen, per-control matrix
**Supersedes:** Section 3 (Test Matrix) of `LCP712_HANDOVER_BRIEF.md`
**Next:** Alex reviews → Sacha executes granular matrix → Run evidence in `docs/standartTest/run-history/`
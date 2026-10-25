# ENVIRONMENT.md — LCP #712 Test Environment Configuration

## Environment URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_BASE_URL` | `https://laudiumpost.co.za` | Production frontend URL |
| `TEST_API_BASE_URL` | `https://server.safai.co.za/Laudiumbiz/api/v1/` | Production backend API |
| `LOCAL_FRONTEND_URL` | `http://localhost:5173` | Local dev frontend |
| `LOCAL_BACKEND_URL` | `http://localhost:9011/Laudiumbiz/api/v1/` | Local dev backend |

## Current Environment Status

| Service | URL | Status | Last Check |
|---------|-----|--------|-----------|
| Production Frontend | https://laudiumpost.co.za | ✅ 200 OK | 2026-05-17 |
| Production Backend API | https://server.safai.co.za/Laudiumbiz/api/v1/ | ✅ 200 OK | 2026-05-17 |
| Local Frontend | http://localhost:5173 | ❌ Not running | 2026-05-17 |
| Local Backend | http://localhost:9011 | ❌ Not running | 2026-05-17 |

## Browser Configuration

- **Default browser:** Chromium (headless for CI, headed for debugging)
- **Optional browsers:** Firefox, Safari (if installed)
- **Viewport:** 1280×720 (standard desktop)
- **Timeout:** 30 seconds per action

## API Endpoints (Public)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/laudium/api/v1/articles` | POST | Public | Article listing with filters |
| `/laudium/api/v1/articles/feed` | POST | Public | Article feed with mixed ads |
| `/laudium/api/v1/articles/:id` | GET | Public | Single article by ID |
| `/laudium/api/v1/articles/slug/:slug` | GET | Public | Single article by slug |
| `/laudium/api/v1/ads/placement/main_page_ad/all` | GET | Public | Main page ad placements |
| `/laudium/api/v1/ads/placement/sidebar/all` | GET | Public | Sidebar ad placements |
| `/laudium/api/v1/media/:id` | GET | Public | Media by ID |
| `/laudium/api/v1/categories` | GET | Public | Categories list |

## API Endpoints (Admin)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/laudium/api/v1/articles/create` | POST | Admin | Create article |
| `/laudium/api/v1/articles/:id` | PUT | Admin | Update article |
| `/laudium/api/v1/articles/:id` | DELETE | Admin | Delete article |
| `/laudium/api/v1/ads` | GET | Admin | Ads management list |
| `/laudium/api/v1/ads/create` | POST | Admin | Create ad |
| `/laudium/api/v1/ads/:id` | PUT | Admin | Update ad |
| `/laudium/api/v1/ads/:id` | DELETE | Admin | Delete ad |
| `/laudium/api/v1/ad-placements` | GET | Admin | List ad placements |
| `/laudium/api/v1/auth/login` | POST | Public | Admin login |
| `/{provider}/sourceArticles/all` | GET | Admin | Source articles by provider |
| `/{provider}/generate-article/by-id` | POST | Admin | Generate article from source |

## AI Providers for Source Articles

| Provider | Endpoint | Status |
|----------|----------|--------|
| MiniMax M2 | `/minimax/sourceArticles/all` | Requires API key |
| Serah AI (Gemini) | `/gemini/sourceArticles/all` | Requires API key |
| Magic AI (GPT) | `/gpt/sourceArticles/all` | Requires API key |
| Beatrice AI (Perplexity) | `/perplexity/sourceArticles/all` | Requires API key |
| Nicolah (X) | `/x/sourceArticles/all` | Requires API key |

## Environment Variables for Tests

```bash
# Admin credentials (required for admin tests)
TEST_ADMIN_EMAIL=info@laudiumpost.co.za
TEST_ADMIN_PASSWORD=<ask Alex>

# Business credentials (required for business portal tests)
TEST_BUSINESS_EMAIL=<ask Alex>
TEST_BUSINESS_PASSWORD=<ask Alex>

# Base URLs (defaults work for production)
TEST_BASE_URL=https://laudiumpost.co.za
TEST_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/
```

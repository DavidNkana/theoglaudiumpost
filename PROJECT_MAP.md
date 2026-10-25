# Laudium Biz - Project Map

## Overview
Laudium Biz is a community news platform for Laudium, South Africa. It consists of a Vue.js frontend and a Spring Boot backend API.

---

## Project Structure

```
Laudium/
├── frontend/                  # Vue.js Frontend Application
├── backend/                   # Spring Boot Backend API
├── _related/                  # Legacy/reference folders, not active source
├── .claude/                   # Claude Code configuration
├── INIT.md                    # Project initialization notes
├── COMPLIANCE_CHECKLIST_SUMMARY.md
└── backend.log
```

---

## Frontend (Vue.js)

**Location:** `frontend/`

### Tech Stack
- **Framework:** Vue 3 (v3.5.13)
- **Build Tool:** Vite (v7.1.11)
- **State Management:** Vuex (v4.1.0)
- **Routing:** Vue Router (v4.5.0)
- **HTTP Client:** Axios (v1.8.4)
- **UI Framework:** Bootstrap 5 (v5.3.5)
- **Rich Text Editor:** Vue Quill (v1.2.0)
- **Charts:** Chart.js with vue-chartjs
- **Mobile:** Capacitor (Android/iOS support)
- **PWA:** vite-plugin-pwa
- **Push Notifications:** OneSignal
- **Error Tracking:** Sentry

### Source Structure (`src/`)

```
src/
├── assets/
│   └── custom.scss              # Custom SCSS styles
├── components/                   # Reusable Vue components
│   ├── Ad.vue                   # Ad display component
│   ├── Article.vue              # Article display
│   ├── BreakingNewsTicker.vue   # Breaking news ticker
│   ├── BusinessSpotlight.vue    # Business spotlight section
│   ├── DatePicker.vue           # Date picker component
│   ├── DateRangeFilter.vue      # Date range filtering
│   ├── EventCard.vue            # Event card display
│   ├── FeaturedArticles.vue     # Featured articles section
│   ├── FeaturedStorySlider.vue  # Story slider/carousel
│   ├── HeaderSearch.vue         # Header search component
│   ├── ImageModal.vue           # Image modal viewer
│   ├── InArticleAd.vue          # In-article advertisement
│   ├── MultiImagePicker.vue     # Multiple image selection
│   ├── Navbar.vue               # Navigation bar
│   ├── PopupAd.vue              # Popup advertisement
│   ├── RotatingAd.vue           # Rotating ad banner
│   ├── SearchField.vue          # Search input field
│   ├── SidebarAd.vue            # Sidebar advertisement
│   ├── TagSelector.vue          # Tag selection component
│   ├── VideoCard.vue            # Video card display
│   └── icons/                   # Icon components
├── composables/                  # Vue 3 composables (hooks)
│   ├── useAds.js                # Ads management
│   ├── useAuth.js               # Authentication (imported in router)
│   ├── usePushNotifications.js  # Push notification handling
│   ├── useSweetAlert.js         # SweetAlert2 wrapper
│   └── useYoutube.js            # YouTube integration
├── layouts/                      # Layout components
│   ├── AppLayout.vue            # Public pages layout
│   ├── AdminLayout.vue          # Admin panel layout
│   ├── BusinessLayout.vue       # Business user layout
│   └── Partials/
│       └── NavLink.vue          # Navigation link component
├── plugins/
│   └── axios.js                 # Axios configuration
├── router/
│   └── index.js                 # Vue Router configuration
├── services/                     # API service modules
│   ├── ads.js                   # Ads API
│   ├── announcements.js         # Announcements API
│   ├── auth.js                  # Authentication API
│   ├── businesses.js            # Businesses API
│   ├── businessDashboard.js     # Business dashboard API
│   ├── categories.js            # Categories API
│   ├── dashboard.js             # Admin dashboard API
│   ├── errorHandler.js          # Error handling
│   ├── GlobalVariables.js       # Global variables/constants
│   ├── onesignal.js             # OneSignal push notifications
│   ├── payfast.js               # PayFast payment integration
│   ├── payments.js              # Payments API
│   ├── posts.js                 # Posts/Articles API
│   ├── responses.js             # API response handling
│   ├── Storage.js               # Local storage management
│   ├── tags.js                  # Tags API
│   ├── TimeManager.js           # Time/date utilities
│   ├── utils.js                 # Utility functions
│   └── youtube.js               # YouTube API integration
├── store/                        # Vuex store
│   ├── index.js                 # Store configuration
│   └── modules/
│       ├── notices.js           # Notices state module
│       ├── tags.js              # Tags state module
│       └── youtube.js           # YouTube state module
├── utils/
│   ├── devLog.js                # Development logging
│   └── responses.js             # Response utilities
└── views/                        # Page components
```

### Views/Pages Structure

```
views/
├── Admin/                        # Admin Panel
│   ├── AdminLogin.vue           # Admin login page
│   ├── Dashboard/
│   │   ├── Index.vue            # Admin dashboard
│   │   └── Partials/
│   │       ├── AdsAnalytics.vue # Ads analytics widget
│   │       └── Stats.vue        # Statistics widget
│   ├── Articles/
│   │   ├── Index.vue            # Articles list
│   │   ├── Create.vue           # Create article
│   │   ├── Edit.vue             # Edit article
│   │   ├── ArticlePromptView.vue # AI article generation
│   │   ├── PromptManager.vue    # AI prompt management
│   │   ├── SourceArticles.vue   # Source articles management
│   │   └── Partials/
│   │       ├── ArticlePreview.vue
│   │       ├── ArticlesTable.vue
│   │       ├── Stats.vue
│   │       ├── Tags.vue
│   │       └── TagSelector.vue
│   ├── Ads/
│   │   ├── Index.vue            # Ads management
│   │   ├── AdForm.vue           # Ad create/edit form
│   │   ├── Payments/
│   │   │   ├── Index.vue        # Payments list
│   │   │   ├── PaymentForm.vue  # Payment form
│   │   │   └── Partials/
│   │   │       └── PaymentsTable.vue
│   │   └── Partials/
│   │       └── AdsTable.vue
│   ├── AdPlacements/
│   │   ├── Index.vue            # Ad placements list
│   │   ├── Form.vue             # Placement form
│   │   └── Partials/
│   │       └── AdPlacementsTable.vue
│   ├── Announcements/
│   │   ├── Index.vue            # Announcements list
│   │   ├── CreateOrEdit.vue     # Create/edit announcement
│   │   ├── Categories.vue       # Categories management
│   │   └── Partials/
│   │       ├── CategoriesTable.vue
│   │       ├── CategoryForm.vue
│   │       ├── Form.vue
│   │       ├── NoticesTable.vue
│   │       └── Preview.vue
│   ├── Businesses/
│   │   ├── Index.vue            # Businesses list
│   │   ├── BusinessForm.vue     # Business form
│   │   └── Partials/
│   │       └── BusinessesTable.vue
│   └── Campaigns/
│       ├── Index.vue            # Campaigns list
│       ├── CampaignForm.vue     # Campaign form
│       └── Partials/
│           └── CampaignsTable.vue
├── Business/                     # Business User Portal
│   ├── Login.vue                # Business login
│   ├── Register.vue             # Business registration
│   ├── AdvertiseWithUs.vue      # Advertising info page
│   ├── Dashboard/
│   │   └── Index.vue            # Business dashboard
│   ├── Ads/
│   │   └── Index.vue            # Business ads management
│   └── Payments/
│       └── Index.vue            # Business payment history
├── News/                         # Public News Pages
│   ├── News.vue                 # News listing (Home)
│   └── Partials/
│       ├── Pagination.vue
│       └── Tags.vue
├── Article/
│   └── Article.vue              # Single article view
├── Category/
│   └── Index.vue                # Category articles
├── Tag/
│   └── Index.vue                # Tag articles
├── Community/
│   ├── Index.vue                # Community notices list
│   └── Notice.vue               # Single notice view
├── Announcements/
│   └── Index.vue                # Public announcements
├── Directory/
│   ├── Index.vue                # Business directory
│   └── Item.vue                 # Directory item detail
├── Events/
│   └── Events.vue               # Community events
├── Search/
│   └── Search.vue               # Search results
├── YouTube/
│   └── Index.vue                # YouTube podcasts
├── Payment/
│   ├── Success.vue              # Payment success page
│   └── Cancelled.vue            # Payment cancelled page
├── Errors/
│   ├── 403.vue                  # Forbidden error page
│   └── 404.vue                  # Not found page
├── AboutPublisher.vue           # About page
├── CorrectionsPolicy.vue        # Corrections policy
├── EditorialPolicy.vue          # Editorial policy
├── PrivacyPolicy.vue            # Privacy policy
├── TermsOfUse.vue               # Terms of use
└── ProjectDocumentation.vue     # Dev-only documentation
```

### Routes Summary

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Home/News | No |
| `/news/:slug` | Article detail | No |
| `/categories/:slug` | Category articles | No |
| `/tags/:slug` | Tag articles | No |
| `/community` | Community notices | No |
| `/announcements` | Public announcements | No |
| `/directory` | Business directory | No |
| `/events` | Community events | No |
| `/search` | Search | No |
| `/podcasts` | YouTube podcasts | No |
| `/business/login` | Business login | No |
| `/business/register` | Business registration | No |
| `/business/dashboard` | Business dashboard | Yes (advertiser) |
| `/business/ads` | Business ads | Yes (advertiser) |
| `/business/payments` | Payment history | Yes (advertiser) |
| `/admin/login` | Admin login | No |
| `/admin/dashboard` | Admin dashboard | Yes (admin) |
| `/admin/articles` | Article management | Yes (admin) |
| `/admin/ads` | Ads management | Yes (admin) |
| `/admin/businesses` | Business management | Yes (admin) |
| `/admin/announcements` | Announcement management | Yes (admin) |

### User Roles
- **Public** - No authentication required
- **Advertiser** - Business users who can manage their ads
- **Admin** - Can manage content, users, ads
- **Super Admin** - Full access including ad placements, payments, prompts

---

## Backend (Spring Boot)

**Location:** `lauduimbizAPI BAckend/`

### Tech Stack
- **Framework:** Spring Boot 3.4.5
- **Java Version:** 24
- **Database:** MySQL with HikariCP connection pool
- **ORM:** Custom MCQL library (not JPA)
- **Security:** Spring Security with JWT (jjwt)
- **API Documentation:** SpringDoc OpenAPI (Swagger)
- **AI Integration:** Google Gemini, OpenAI GPT, Perplexity
- **Media Storage:** Cloudinary
- **Payments:** PayFast (South African payment gateway)
- **Push Notifications:** OneSignal
- **Email:** Spring Boot Mail (SMTP)
- **Error Tracking:** Sentry

### Configuration
- **Port:** 9011
- **Context Path:** `/laudium`
- **Base URL:** `http://localhost:9011/laudium`
- **Swagger UI:** `http://localhost:9011/laudium/swagger-ui.html`
- **API Docs:** `http://localhost:9011/laudium/api-docs`

### Source Structure (`src/main/java/com/laudiumbiz/Laudiumbiz/`)

```
src/main/java/com/laudiumbiz/Laudiumbiz/
├── LaudiumbizApplication.java    # Main Spring Boot application
├── Controllers/                   # REST API Controllers
│   ├── AdController.java         # Ads endpoints
│   ├── AdPlacementController.java # Ad placements
│   ├── ArticleController.java    # Articles CRUD
│   ├── AuthController.java       # Authentication (login/register)
│   ├── BusinessController.java   # Business management
│   ├── BusinessDashboardController.java
│   ├── CampaignController.java   # Campaigns
│   ├── CategoryController.java   # Categories
│   ├── CustomGlobalExceptionHandler.java
│   ├── DashboardController.java  # Admin dashboard
│   ├── HomeController.java       # Home/health endpoints
│   ├── MediaController.java      # Media upload
│   ├── NoticeController.java     # Community notices
│   ├── PaymentController.java    # PayFast payments
│   ├── TagController.java        # Tags management
│   ├── UserController.java       # User management
│   └── ai/                       # AI Controllers
│       ├── AiController.java     # Generic AI endpoint
│       ├── ChatGPTController.java
│       ├── GeminiController.java
│       └── PerplexityController.java
├── Services/                      # Business Logic
│   ├── ArticleService.java       # Article operations
│   ├── ChatGPTNewsService.java   # ChatGPT integration
│   ├── CloudinaryService.java    # Image/media upload
│   ├── EmailService.java         # Email sending
│   ├── GeminiService.java        # Google Gemini AI
│   ├── GoogleAuthService.java    # Google OAuth
│   ├── GPTService.java           # OpenAI GPT
│   ├── JwtService.java           # JWT token handling
│   ├── NewsAIService.java        # AI article generation
│   ├── OneSignalService.java     # Push notifications
│   ├── PayFastService.java       # Payment processing
│   ├── PerplexityService.java    # Perplexity AI
│   ├── SourceArticleService.java # Source article handling
│   └── SourceArticlePersistenceService.java
├── Models/                        # Data Models
│   ├── DB/                       # Database entities
│   │   ├── Ad.java
│   │   ├── AdImage.java
│   │   ├── AdPlacement.java
│   │   ├── AdTags.java
│   │   ├── Announcement.java
│   │   ├── AnnouncementCategory.java
│   │   ├── Articles.java
│   │   ├── ArticleTags.java
│   │   ├── AuthRequest.java
│   │   ├── AuthResponse.java
│   │   ├── Businesses.java
│   │   ├── Campaigns.java
│   │   ├── Category.java
│   │   ├── LoginUserRequest.java
│   │   ├── Media.java
│   │   ├── Payment.java
│   │   ├── Placement.java
│   │   ├── Prompt.java
│   │   ├── PromptDTO.java
│   │   ├── RegisterUserRequest.java
│   │   ├── Role.java
│   │   ├── SourceArticles.java
│   │   ├── Tag.java
│   │   └── User.java
│   ├── DTO/                      # Data Transfer Objects
│   │   ├── AdPlacementRequestDTO.java
│   │   ├── AdPlacementResponseDTO.java
│   │   ├── AdRequestDTO.java
│   │   ├── AdResponseDTO.java
│   │   ├── AnnouncementCategoryRequestDTO.java
│   │   ├── AnnouncementCategoryResponseDTO.java
│   │   ├── AnnouncementRequestDTO.java
│   │   ├── AnnouncementResponseDTO.java
│   │   ├── ArticleByIdRequest.java
│   │   ├── ArticleQueryParams.java
│   │   ├── ArticleRefinementRequest.java
│   │   ├── BulkArticleByIdsRequest.java
│   │   ├── DraftArticleResponse.java
│   │   ├── GeneratedArticleResponse.java
│   │   ├── PaymentInfo.java
│   │   ├── PaymentRequestDTO.java
│   │   ├── PaymentResponseDTO.java
│   │   ├── PromptRequest.java
│   │   ├── PublishRequestDTO.java
│   │   ├── SourceArticleResponse.java
│   │   ├── TopicRequest.java
│   │   └── UserDto.java
│   ├── GeminiRest/               # Gemini API models
│   │   ├── Candidate.java
│   │   ├── Content.java
│   │   ├── GeminiRequest.java
│   │   ├── GeminiResponse.java
│   │   ├── GoogleSearch.java
│   │   ├── GroundingMetadata.java
│   │   ├── Part.java
│   │   ├── Tool.java
│   │   └── UsageMetadata.java
│   └── Gson/                     # JSON serialization
│       ├── CompanyPojo.java
│       └── UserPojo.java
├── config/                        # Configuration classes
│   ├── AsyncConfig.java          # Async processing config
│   ├── CloudinaryConfig.java     # Cloudinary settings
│   ├── MailConfig.java           # Email configuration
│   ├── OneSignalConfiguration.java
│   └── SecurityConfig.java       # Spring Security (JWT)
├── Exceptions/
│   └── ApiException.java         # Custom API exception
├── Logic/
│   └── PaymentLogic.java         # Payment business logic
└── Utils/
    ├── ArticleUtil.java          # Article utilities
    ├── CustomRs.java             # Custom response wrapper
    ├── LocalDateAdapter.java     # Gson date adapter
    ├── LocalDateTimeAdapter.java
    └── error/                    # Error handling
        ├── Controller.java
        ├── ErrorModel.java
        ├── errorlogs.java
        └── ServerError.java
```

### API Endpoints (Base: `/laudium/api/v1`)

#### Articles
- `GET /articles` - List articles (paginated)
- `GET /articles/{slug}` - Get article by slug
- `GET /articles/count` - Get article count
- `GET /articles/stats` - Get article statistics
- `POST /articles` - Create article
- `PUT /articles/{id}` - Update article
- `DELETE /articles/{id}` - Delete article

#### AI/Article Generation
- `POST /ai/generate-article` - Generate article using AI
- `POST /ai/refine-article` - Refine/improve article
- `GET /ai/prompts` - Get AI prompts
- `POST /ai/prompts` - Create/update prompt

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/google` - Google OAuth login
- `POST /auth/refresh` - Refresh JWT token

#### Ads
- `GET /ads` - List ads
- `GET /ads/{id}` - Get ad details
- `POST /ads` - Create ad
- `PUT /ads/{id}` - Update ad
- `DELETE /ads/{id}` - Delete ad

#### Businesses
- `GET /businesses` - List businesses
- `GET /businesses/{id}` - Get business details
- `POST /businesses` - Create business
- `PUT /businesses/{id}` - Update business

#### Payments (PayFast)
- `POST /payments/initiate` - Initiate payment
- `POST /payments/notify` - PayFast webhook (ITN)
- `GET /payments` - List payments
- `GET /payments/{id}` - Get payment details

#### Categories & Tags
- `GET /categories` - List categories
- `POST /categories` - Create category
- `GET /tags` - List tags
- `POST /tags` - Create tag

#### Announcements
- `GET /announcements` - List announcements
- `GET /announcements/{id}` - Get announcement
- `POST /announcements` - Create announcement
- `PUT /announcements/{id}` - Update announcement

#### Dashboard
- `GET /dashboard/stats` - Admin dashboard statistics
- `GET /business-dashboard/stats` - Business dashboard stats

---

## Database

- **Type:** MySQL
- **Default Connection:** `localhost:3306/laudium`
- **Connection Pool:** HikariCP (max 3 connections for dev)

### Main Tables
- `users` - User accounts
- `roles` - User roles (admin, superadmin, advertiser)
- `articles` - News articles
- `article_tags` - Article-tag relationships
- `categories` - Article categories
- `tags` - Content tags
- `ads` - Advertisements
- `ad_images` - Ad media files
- `ad_placements` - Where ads appear
- `placements` - Placement types
- `businesses` - Business profiles
- `campaigns` - Ad campaigns
- `payments` - Payment records
- `announcements` - Community announcements
- `announcement_categories` - Announcement categories
- `prompts` - AI prompts for article generation
- `source_articles` - Source articles for AI processing
- `media` - Uploaded media files

---

## External Services

### AI Services
- **Google Gemini** - Primary AI for article generation
- **OpenAI GPT** - Alternative AI provider
- **Perplexity** - Research/fact-checking AI

### Payment
- **PayFast** - South African payment gateway (sandbox mode enabled)

### Media
- **Cloudinary** - Image and media storage/CDN

### Notifications
- **OneSignal** - Push notifications for mobile/web

### Monitoring
- **Sentry** - Error tracking (frontend & backend)

---

## Development Commands

### Frontend
```bash
cd "Laudium Biz FrontEnd"
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run cap:sync     # Sync with Capacitor (mobile)
```

### Backend
```bash
cd "lauduimbizAPI BAckend"
./mvnw spring-boot:run    # Start Spring Boot server
./mvnw clean compile      # Compile without tests
./mvnw package            # Build WAR file
```

### URLs (Development)
- Frontend: http://localhost:5173
- Backend API: http://localhost:9011/laudium
- Swagger UI: http://localhost:9011/laudium/swagger-ui.html

---

## File Naming Conventions
- Vue components: PascalCase (e.g., `ArticleCard.vue`)
- Services/Utils: camelCase (e.g., `auth.js`)
- Java classes: PascalCase (e.g., `ArticleController.java`)
- Database tables: snake_case (e.g., `article_tags`)

---

*Last Updated: December 2024*

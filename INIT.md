# LaudiumAPP - Initialization & Project Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Frontend Documentation](#frontend-documentation)
4. [Backend Documentation](#backend-documentation)
5. [Key Features](#key-features)
6. [Development Guidelines](#development-guidelines)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Third-Party Integrations](#third-party-integrations)
10. [Getting Started](#getting-started)

---

## 🎯 Project Overview

**LaudiumAPP** is a comprehensive news and business platform for the Laudium community. It consists of two main components:

1. **Frontend** - Vue 3 + Vite web application with mobile support via Capacitor
2. **Backend** - Spring Boot REST API with custom MCQL ORM

### Purpose

LaudiumAPP serves as a news aggregation platform where:
- Community members can publish and read news articles
- Local businesses can advertise and showcase their services
- Admins can manage content, users, and campaigns
- AI-powered tools assist with article generation and content management

### Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Frontend | Vue 3, Vite, TypeScript/JavaScript |
| Mobile | Capacitor (Android, iOS) |
| Backend | Java 24, Spring Boot 3.4.5 |
| Database | MySQL with Custom MCQL ORM |
| Build Tool | Maven (Backend), npm/Vite (Frontend) |
| Cloud | Cloudflare Pages (Frontend deployment) |

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│              LaudiumAPP                 │
├─────────────────────────────────────────┤
│  Frontend (Vue 3 + Vite)                │
│  - Web Application                      │
│  - Mobile Apps (Capacitor)              │
│  - Progressive Web App (PWA)            │
└──────────────┬──────────────────────────┘
               │ HTTPS/REST API
               ▼
┌─────────────────────────────────────────┐
│  Backend (Spring Boot)                  │
│  - REST Controllers                     │
│  - Business Logic                       │
│  - Security (JWT)                       │
│  - AI Integration (Gemini)              │
└──────────────┬──────────────────────────┘
               │ JDBC/HikariCP
               ▼
┌─────────────────────────────────────────┐
│  Database (MySQL)                       │
│  - Articles, Users, Businesses          │
│  - Ads, Campaigns, Payments             │
│  - Categories, Tags, Media              │
└─────────────────────────────────────────┘
```

### Module Organization

```
LaudiumAPP/
├── Laudium Biz FrontEnd/          # Vue 3 Frontend
│   ├── src/
│   │   ├── assets/                # Static assets
│   │   ├── components/            # Reusable components
│   │   ├── composables/           # Vue composition functions
│   │   ├── config/                # Configuration files
│   │   ├── layouts/               # Page layouts
│   │   ├── plugins/               # Vue plugins
│   │   ├── router/                # Vue Router routes
│   │   ├── services/              # API services
│   │   ├── store/                 # Vuex state management
│   │   ├── utils/                 # Utility functions
│   │   └── views/                 # Page components
│   ├── public/                    # Public assets
│   ├── android/                   # Capacitor Android project
│   ├── ios/                       # Capacitor iOS project
│   └── docs/                      # Frontend documentation
│
└── lauduimbizAPI BAckend/         # Spring Boot Backend
    ├── src/main/java/
    │   └── com/laudiumbiz/Laudiumbiz/
    │       ├── Controllers/       # REST Controllers
    │       │   └── ai/            # AI-related controllers
    │       ├── Models/            # Data models
    │       │   ├── DB/            # Database entities
    │       │   ├── DTO/           # Data transfer objects
    │       │   ├── Gson/          # Gson utilities
    │       │   └── GeminiRest/    # Gemini integration models
    │       ├── Services/          # Business logic services
    │       ├── Logic/             # Business logic
    │       ├── Security/          # JWT and security
    │       │   ├── jwt/           # JWT utilities
    │       │   └── dto/           # Security DTOs
    │       ├── Utils/             # Utility classes
    │       └── config/            # Spring configuration
    ├── src/main/resources/
    │   ├── static/api.yaml        # OpenAPI 3 specification
    │   └── templates/             # Email templates (Thymeleaf)
    ├── migrations/                # Database migrations
    ├── libs/                      # Custom libraries
    └── docs/                      # Backend documentation
```

---

## 🎨 Frontend Documentation

### Technology Stack

- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 7.1.11
- **Language**: JavaScript/TypeScript
- **CSS Framework**: Bootstrap 5.3.5 + SCSS
- **State Management**: Vuex 4.1.0
- **Routing**: Vue Router 4.5.0
- **HTTP Client**: Axios 1.8.4
- **Charts**: Chart.js 4.4.9 with vue-chartjs
- **Rich Text Editor**: @vueup/vue-quill
- **Notifications**: OneSignal, SweetAlert2
- **Error Tracking**: Sentry (@sentry/vue)
- **Mobile**: Capacitor 7.4.0

### Key Features

#### 1. **News & Article Management**
- Article creation, editing, and publishing
- Rich text editor for content creation
- Article categorization and tagging
- AI-assisted article generation
- Article source tracking

#### 2. **Business Directory**
- Business listing management
- Advertisement placement
- Campaign management
- Business dashboard

#### 3. **Admin Dashboard**
- User management
- Content moderation
- Analytics and reporting
- Ad placement management
- System configuration

#### 4. **Mobile Support**
- Capacitor integration for Android/iOS
- PWA capabilities
- Offline support
- Push notifications via OneSignal

#### 5. **AI Integration**
- Article generation using Gemini AI
- Content suggestions
- Source article conversion
- Automated tagging

### Project Structure

#### Core Directories

**`src/components/`**
- Reusable Vue components
- Modular UI components
- Shared functionality

**`src/views/`**
- Page-level components organized by feature:
  - `Admin/` - Admin dashboard pages
  - `Article/` - Article pages
  - `Business/` - Business-related pages
  - `Announcements/` - Announcements
  - `Auth/` - Authentication pages

**`src/services/`**
- API communication layer
- External service integrations:
  - `youtube.js` - YouTube API integration
  - `api.js` - Base API client
  - Other service modules

**`src/store/`**
- Vuex store modules for state management
- Centralized application state
- Authentication state
- User preferences

**`src/composables/`**
- Vue Composition API functions
- Reusable logic
- `useAuth.js` - Authentication composable
- `useYoutube.js` - YouTube integration

### Environment Configuration

Create a `.env` file in the frontend root with the following variables:

```env
# API Configuration
VITE_DEV_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/
VITE_TEST_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/
VITE_PROD_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/

# Third-party Services
VITE_SENTRY_DNS=your_sentry_dsn
VITE_ONE_SIGNAL_APP_ID=your_onesignal_app_id
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_YOUTUBE_DEFAULT_CHANNEL_ID=your_default_channel_id

# Payment Gateway (PayFast)
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase
VITE_PAYFAST_RETURN_URL=your_return_url
VITE_PAYFAST_CANCEL_URL=your_cancel_url
VITE_PAYFAST_NOTIFY_URL=your_notify_url
VITE_PAYFAST_SANDBOX=true_or_false
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Build and sync with Capacitor
npm run cap:build

# Open Android project
npm run cap:open:android

# Run on Android device
npm run cap:run:android

# Deploy to Cloudflare Pages
npm run cf:deploy
```

### Code Style Guidelines

- **ESM**: Use `import`/`export` syntax
- **Vue Components**: Composition API with `<script setup>`
- **CSS**: SCSS with scoped styles
- **Naming**: PascalCase for components, camelCase for variables/functions

---

## ⚙️ Backend Documentation

### Technology Stack

- **Language**: Java 24
- **Framework**: Spring Boot 3.4.5
- **Build Tool**: Maven
- **Database**: MySQL 8.0.28
- **Connection Pool**: HikariCP 5.0.0
- **ORM**: Custom MCQL (MySQL Custom Query Language)
- **Security**: Spring Security + JWT
- **API Documentation**: OpenAPI 3 (Swagger)
- **Email**: Spring Mail + Thymeleaf templates
- **Cloud Storage**: Cloudinary 2.3.0
- **AI Integration**: Google Gemini AI
- **JSON**: Google Gson 2.10.1
- **Monitoring**: Sentry 7.10.0
- **HTTP Client**: OkHttp3 5.0.0-alpha.12

### Project Structure

#### Core Packages

**`Controllers/`**
- REST API endpoints
- HTTP request handling
- Request/response mapping
- `ai/` - AI-specific controllers

**`Models/DB/`**
- Database entity classes
- Direct database table mappings
- Result set parsing

**`Models/DTO/`**
- Data Transfer Objects
- Request/response models
- API contracts

**`Services/`**
- Business logic implementation
- Data processing
- External service integration

**`Security/`**
- Authentication & authorization
- JWT token management
- Security filters and configurations

**`Utils/`**
- Utility classes
- Helper functions
- Error handling

### Key Features

#### 1. **REST API**
- Comprehensive REST endpoints
- OpenAPI 3 documentation
- Request/response validation
- Error handling

#### 2. **Authentication & Security**
- JWT-based authentication
- Role-based access control
- Secure password handling
- Session management

#### 3. **AI Integration**
- Google Gemini AI integration
- Article generation
- Content analysis
- Automated source article processing

#### 4. **Database Management**
- Custom MCQL ORM
- MySQL database
- Connection pooling
- Migration support

#### 5. **File & Media Management**
- Cloudinary integration
- Image upload and processing
- Media URL generation
- Thumbnail generation

### Backend Guidelines (From .junie/guidelines.md)

#### Mandatory Behavior

1. **Comment Discipline**
   - Always respect developer comments before modifying code
   - Do not remove or contradict existing comments
   - Every new method/class must include JavaDoc

2. **MCQL Rule Set**
   - Reference `libs/mcql.yaml` before generating/editing models
   - Ensure all fields match SQL schema
   - No undocumented fields or types

3. **REST API Rules**
   - Update `docs/api.yaml` when changing `@RestController` routes
   - Add `@ModifiedByJunie YYYY-MM-DD` tag above affected methods

4. **JSON/DTO Rules**
   - Use explicit Java classes for request/response
   - No `Map<String, Object>` unless absolutely required
   - DTOs must match OpenAPI specification

5. **Gson Usage**
   - Centralize in `*.util.Util.getGson()`
   - Must include `LocalDateTime` adapter

#### API-Driven Testing Policy

**Traditional unit tests are FORBIDDEN.**

Testing must be performed via:
- OpenAPI example payloads
- At least one full request and response example per endpoint
- Examples must be runnable via Swagger UI

Example OpenAPI snippet:
```yaml
paths:
  /users:
    post:
      summary: Create a new user
      requestBody:
        content:
          application/json:
            example:
              name: "John Doe"
              email: "john@example.com"
      responses:
        '200':
          description: User created
          content:
            application/json:
              example:
                id: "usr_123"
                status: "created"
```

### Build & Run

```bash
# Build the project
./mvnw clean package

# Run the application
./mvnw spring-boot:run

# Run tests
./mvnw test

# Build for production
./mvnw clean package -Pprod

# Run with specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

---

## 🚀 Key Features

### 1. Article Management System

**Frontend Components:**
- Article list views with pagination
- Rich text editor for content creation
- Article preview and publishing
- Source URL tracking
- AI-assisted article generation

**Backend Implementation:**
- REST endpoints for CRUD operations
- Database entities for articles, categories, tags
- AI integration via Gemini
- Media upload handling
- Source article conversion system

**Database Schema:**
```sql
articles (
  id, title, slug, summary, content,
  article_type, author, status, archived,
  sources (JSON), category_id,
  scheduled_for, created_at, updated_at
)
```

### 2. Business Directory & Advertising

**Frontend Features:**
- Business listing pages
- Advertisement display
- Campaign management dashboard
- Payment integration (PayFast)
- Analytics and reporting

**Backend Features:**
- Business model and CRUD operations
- Ad placement system
- Payment tracking
- Campaign management APIs
- Analytics endpoints

**Database Schema:**
```sql
businesses (
  id, name, description, contact_info,
  address, logo_url, status, created_at
)

ads (
  id, business_id, title, content,
  placement, status, start_date, end_date,
  impressions, clicks
)
```

### 3. Admin Dashboard

**Frontend Components:**
- Dashboard analytics (Chart.js)
- User management interface
- Content moderation tools
- System configuration
- Report generation

**Backend APIs:**
- User authentication and authorization
- Admin-only endpoints
- Audit logging
- System health checks
- Metrics and analytics

### 4. AI-Powered Content Generation

**Gemini AI Integration:**
- Article generation from prompts
- Source article analysis and conversion
- Content suggestions and improvements
- Automated tagging

**Implementation:**
- Backend: `Controllers/ai/` directory
- Models: `Models/GeminiRest/`
- API endpoints documented in `docs/api.yaml`
- Frontend: Integration via API services

### 5. Mobile Application

**Capacitor Integration:**
- Native Android/iOS builds
- PWA capabilities
- Push notifications (OneSignal)
- Offline support
- Device-specific features

**Configuration:**
- `capacitor.config.json` - Main configuration
- `android/` - Android project
- `ios/` - iOS project
- Asset generation via `@capacitor/assets`

---

## 📚 Development Guidelines

### Frontend Guidelines

1. **Component Structure**
   ```vue
   <template>
     <!-- Template -->
   </template>

   <script setup>
   import { ref, onMounted } from 'vue';
   // Composition API logic
   </script>

   <style scoped>
   /* Scoped styles */
   </style>
   ```

2. **State Management**
   - Use Vuex for global state
   - Use composables for component logic
   - Keep mutations and actions separate

3. **API Communication**
   - Use axios via `$api` global property
   - Implement proper error handling
   - Use interceptors for common logic

4. **Routing**
   - Lazy loading for route components
   - Navigation guards for authentication
   - Proper route naming conventions

5. **Testing**
   - Use standalone Node.js scripts
   - Name pattern: `test-*.js`
   - Run with: `node test-file-name.js`

### Backend Guidelines

1. **Code Organization**
   - Controllers handle HTTP, Services handle logic
   - DTOs for API contracts, Entities for DB
   - Separation of concerns

2. **API Design**
   - RESTful endpoints
   - Proper HTTP status codes
   - Consistent response format

3. **Database Access**
   - Use MCQL custom ORM
   - Follow `libs/mcql.yaml` schema
   - Implement proper connection pooling

4. **Security**
   - JWT for authentication
   - Role-based access control
   - Input validation and sanitization

5. **Error Handling**
   - Use `@ExceptionHandler`
   - Return consistent error responses
   - Log errors appropriately

---

## 📖 API Documentation

The backend uses OpenAPI 3 specification for API documentation.

### Accessing API Docs

1. **Swagger UI**: Navigate to `http://localhost:8080/laudium/swagger-ui.html` (when running locally)
2. **OpenAPI Spec**: `src/main/resources/static/api.yaml`
3. **Rendered Docs**: `docs/api.html` (if generated)

### Core Endpoints

#### Articles
```
GET    /api/v1/articles              # List articles
POST   /api/v1/articles/create       # Create article
GET    /api/v1/articles/slug/{slug}  # Get article by slug
PUT    /api/v1/articles/{id}         # Update article
DELETE /api/v1/articles/{id}         # Delete article
```

#### Authentication
```
POST   /api/v1/auth/login            # User login
POST   /api/v1/auth/logout           # User logout
GET    /api/v1/auth/profile          # Get user profile
```

#### Businesses
```
GET    /api/v1/businesses            # List businesses
POST   /api/v1/businesses/create     # Create business
GET    /api/v1/businesses/{id}       # Get business
PUT    /api/v1/businesses/{id}       # Update business
DELETE /api/v1/businesses/{id}       # Delete business
```

#### AI Features
```
POST   /api/v1/ai/generate-article   # Generate article with Gemini
POST   /api/v1/ai/convert-source     # Convert source article
POST   /api/v1/ai/suggest-content    # Content suggestions
```

### Request/Response Examples

**Create Article:**
```json
POST /api/v1/articles/create
{
  "title": "Breaking News",
  "slug": "breaking-news",
  "summary": "Article summary",
  "content": "<p>Full content</p>",
  "articleType": "featured",
  "categoryId": 1,
  "status": "published",
  "sources": ["https://example.com/source"],
  "tags": [1, 2, 3],
  "notify": true
}
```

**Response:**
```json
{
  "id": 123,
  "title": "Breaking News",
  "slug": "breaking-news",
  "status": "published",
  "sources": ["https://example.com/source"],
  "category": {
    "id": 1,
    "name": "Technology",
    "slug": "technology"
  },
  "created_at": "2025-11-21T10:00:00"
}
```

---

## 💾 Database Schema

### Core Tables

#### articles
```sql
CREATE TABLE articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  summary TEXT,
  content LONGTEXT,
  article_type VARCHAR(50),
  author VARCHAR(100),
  status VARCHAR(20),
  archived BOOLEAN DEFAULT FALSE,
  sources TEXT, -- JSON array of source URLs
  category_id BIGINT,
  scheduled_for DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

#### businesses
```sql
CREATE TABLE businesses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_info JSON,
  address TEXT,
  logo_url VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### users
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### categories
```sql
CREATE TABLE categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### ads
```sql
CREATE TABLE ads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  business_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  placement VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

### Migration Management

Migrations are stored in the `migrations/` directory:
- SQL scripts with sequential naming (e.g., `001_add_sources_to_articles.sql`)
- Applied in order
- Track database schema changes

Example migration:
```sql
-- migrations/001_add_sources_to_articles.sql
ALTER TABLE articles
ADD COLUMN sources TEXT NULL
COMMENT 'JSON array of source URLs for the article';
```

---

## 🔌 Third-Party Integrations

### Frontend Integrations

#### 1. OneSignal
- **Purpose**: Push notifications
- **Package**: `@onesignal/onesignal-vue3`
- **Usage**: Article notifications, announcements
- **Configuration**: `VITE_ONE_SIGNAL_APP_ID`

#### 2. Sentry
- **Purpose**: Error tracking and monitoring
- **Package**: `@sentry/vue`, `@sentry/node`
- **Usage**: Production error monitoring
- **Configuration**: `VITE_SENTRY_DNS`

#### 3. YouTube API
- **Purpose**: Video integration
- **Service**: `src/services/youtube.js`
- **Usage**: Display videos from YouTube channels
- **Configuration**: `VITE_YOUTUBE_API_KEY`

#### 4. PayFast
- **Purpose**: Payment processing
- **Usage**: Ad payments, business promotions
- **Configuration**: Multiple `VITE_PAYFAST_*` variables

#### 5. Cloudinary
- **Purpose**: Image and media management
- **Usage**: Upload, transform, and serve images
- **Integration**: Backend service + frontend utilities

### Backend Integrations

#### 1. Google Gemini AI
- **Purpose**: Article generation and content analysis
- **Dependencies**:
  - `google-genai` 1.10.0
  - `google-cloud-aiplatform` 3.50.0
  - `google-cloud-vertexai` 1.30.0
- **Usage**: AI-powered content creation

#### 2. Cloudinary
- **Purpose**: Media storage and processing
- **Dependencies**:
  - `cloudinary-core` 2.3.0
  - `cloudinary-http5` 2.3.0
- **Usage**: Image upload, transformation, CDN

#### 3. MySQL
- **Purpose**: Primary database
- **Driver**: `mysql-connector-java` 8.0.28
- **Connection Pool**: HikariCP 5.0.0

#### 4. Sentry
- **Purpose**: Error monitoring
- **Dependency**: `sentry-spring-boot-starter-jakarta` 7.10.0

#### 5. OkHttp3
- **Purpose**: HTTP client
- **Dependency**: `okhttp` 5.0.0-alpha.12
- **Usage**: External API calls

---

## 🚦 Getting Started

### Prerequisites

- **Node.js**: v16 or higher
- **Java**: JDK 24
- **Maven**: 3.6+
- **MySQL**: 8.0+
- **Git**

### Environment Setup

#### 1. Clone the Repository
```bash
# Project is already cloned at C:\JunieProjects\LaudiumAPP
cd C:\JunieProjects\LaudiumAPP
```

#### 2. Backend Setup

```bash
cd "lauduimbizAPI BAckend"

# Create .env file (if not exists)
touch .env

# Build the project
./mvnw clean install

# Run migrations (if needed)
mysql -u root -p < migrations/001_add_sources_to_articles.sql

# Start the backend
./mvnw spring-boot:run
```

Backend will be available at `http://localhost:9011/laudium`

#### 3. Frontend Setup

```bash
cd "Laudium Biz FrontEnd"

# Install dependencies
npm install

# Create .env file with API configuration (or update existing .env)
cat > .env << EOF
VITE_DEV_API_BASE_URL=http://localhost:9011/laudium/api/v1/
VITE_TEST_API_BASE_URL=http://localhost:9011/laudium/api/v1/
VITE_PROD_API_BASE_URL=http://localhost:9011/laudium/api/v1/
EOF

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Development Workflow

#### Daily Development

1. **Start Backend**
   ```bash
   cd "lauduimbizAPI BAckend"
   ./mvnw spring-boot:run
   ```

2. **Start Frontend** (in new terminal)
   ```bash
   cd "Laudium Biz FrontEnd"
   npm run dev
   ```

3. **Access Applications**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9011/laudium/api/v1
   - Swagger UI: http://localhost:9011/laudium/swagger-ui.html
   - OpenAPI Spec: http://localhost:9011/laudium/api.yml

#### Building for Production

**Backend:**
```bash
cd "lauduimbizAPI BAckend"
./mvnw clean package -Pprod
# WAR file will be in target/
```

**Frontend:**
```bash
cd "Laudium Biz FrontEnd"
npm run build
# Build artifacts will be in dist/
```

#### Mobile Development

**Android:**
```bash
cd "Laudium Biz FrontEnd"
npm run cap:build
npm run cap:open:android
# Opens Android Studio
```

**iOS:**
```bash
cd "Laudium Biz FrontEnd"
npm run cap:build
npm run cap:open:ios
# Opens Xcode (requires macOS)
```

### Testing

#### Frontend Testing

Run standalone test scripts:
```bash
cd "Laudium Biz FrontEnd"
node test-login.js
node test-admin-sidebar-navigation.js
# Run any test-*.js file
```

#### Backend Testing

API testing via Swagger:
1. Start backend
2. Navigate to http://localhost:9011/laudium/swagger-ui.html
3. Use the interactive API explorer

Or use curl:
```bash
curl -X GET http://localhost:9011/laudium/api/v1/articles
```

### Common Tasks

#### Adding a New API Endpoint

1. **Backend:**
   - Create/update Controller in `src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/`
   - Update `src/main/resources/static/api.yaml`
   - Add JavaDoc to methods
   - Run tests

2. **Frontend:**
   - Add API service in `src/services/`
   - Create composable in `src/composables/`
   - Update Vuex store if needed
   - Create/update component in `src/views/`

#### Adding a New Frontend Component

```bash
# Create component file
touch "Laudium Biz FrontEnd/src/components/MyComponent.vue"

# Component structure
cat > "Laudium Biz FrontEnd/src/components/MyComponent.vue" << 'EOF'
<template>
  <div class="my-component">
    <!-- Component template -->
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Component logic
</script>

<style scoped>
.my-component {
  /* Styles */
}
</style>
EOF
```

#### Database Migration

```bash
# Create new migration file
touch "lauduimbizAPI BAckend/migrations/002_add_new_feature.sql"

# Write migration SQL
cat > "lauduimbizAPI BAckend/migrations/002_add_new_feature.sql" << 'EOF'
-- Migration description
ALTER TABLE table_name
ADD COLUMN new_column VARCHAR(100);
EOF

# Apply migration
mysql -u root -p database_name < migrations/002_add_new_feature.sql
```

### Troubleshooting

#### Backend Issues

**Port 9011 already in use:**
```bash
# Find process using port (Linux/Mac)
lsof -i :9011
# Kill process
kill -9 <PID>

# Windows
netstat -ano | findstr :9011
taskkill /PID <PID> /F
```

**MySQL connection errors:**
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in application properties
- Check network connectivity

#### Frontend Issues

**Port 5173 already in use:**
```bash
# Use different port
npm run dev -- --port 3000
```

**Node modules issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```bash
# Clean build
npm run build -- --force
```

### Project Documentation Files

- **`/INIT.md`** - This file (comprehensive project documentation)
- **`Laudium Biz FrontEnd/.junie/guidelines.md`** - Frontend development guidelines
- **`lauduimbizAPI BAckend/.junie/guidelines.md`** - Backend development guidelines
- **`lauduimbizAPI BAckend/docs/api.yaml`** - OpenAPI 3 specification
- **`lauduimbizAPI BAckend/CHANGES.md`** - Change log
- **`Laudium Biz FrontEnd/README.md`** - Frontend README

---

## 🚀 Current Runtime Status

### Development Servers (Running Now)

**Backend Server:**
- **Status**: ✅ Running
- **URL**: http://localhost:9011/laudium
- **Context Path**: /laudium
- **API Base**: http://localhost:9011/laudium/api/v1
- **Swagger UI**: http://localhost:9011/laudium/swagger-ui.html
- **OpenAPI Spec**: http://localhost:9011/laudium/api.yml
- **Database**: MySQL (external server)
- **Command**: `./mvnw spring-boot:run`
- **Log File**: `lauduimbizAPI BAckend/backend.log`

**Frontend Server:**
- **Status**: ✅ Running
- **URL**: http://localhost:5173/
- **Local Network**: http://192.168.22.1:5173/, http://192.168.36.1:5173/, http://192.168.0.201:5173/
- **Vue DevTools**: http://localhost:5173/__devtools__/
- **Command**: `npm run dev`
- **Hot Reload**: Enabled

### Connection Status

✅ Backend is accessible and responding to requests
✅ Frontend is accessible and loading
✅ Frontend .env is configured to point to localhost:9011
✅ Both servers are communicating properly

### Testing the Connection

```bash
# Test backend API
curl http://localhost:9011/laudium/api/v1/articles

# Test frontend
curl http://localhost:5173/

# Access Swagger UI
# Navigate to: http://localhost:9011/laudium/swagger-ui.html
```

### Environment Configuration

**Backend** (`lauduimbizAPI BAckend/src/main/resources/application.properties`):
- Server Port: 9011
- Context Path: /laudium
- Database: MySQL at 102.211.30.134:3306
- JWT enabled
- Gemini AI integration enabled

**Frontend** (`Laudium Biz FrontEnd/.env`):
- API Base URL: http://localhost:9011/laudium/api/v1/
- OneSignal enabled
- Sentry error tracking enabled
- YouTube API configured

### Starting Both Applications

**Step-by-step:**

```bash
# Terminal 1: Start Backend
cd "C:\JunieProjects\LaudiumAPP\lauduimbizAPI BAckend"
./mvnw spring-boot:run

# Wait for "Started LaudiumbizApplication" message
# Backend will be at http://localhost:9011/laudium

# Terminal 2: Start Frontend
cd "C:\JunieProjects\LaudiumAPP\Laudium Biz FrontEnd"
npm install  # First time only
npm run dev

# Frontend will be at http://localhost:5173
```

### Stopping the Applications

```bash
# Stop Backend (Ctrl+C in terminal running mvnw)
# Or kill process:
# Linux/Mac: kill $(lsof -ti:9011)
# Windows: taskkill /PID <PID> /F

# Stop Frontend (Ctrl+C in terminal running npm)
```

### Rebuilding & Restarting

**Backend:**
```bash
cd "lauduimbizAPI BAckend"
./mvnw clean compile
./mvnw spring-boot:run
```

**Frontend:**
```bash
cd "Laudium Biz FrontEnd"
npm run build
npm run dev
```

### Notes

- Backend compilation takes ~10-20 seconds on first run
- Frontend starts in ~2-3 seconds with hot reload
- Both servers support live code changes without restart
- Database is hosted externally (no local DB required)
- All third-party APIs are pre-configured

---

## 📝 Summary

LaudiumAPP is a comprehensive platform combining:

✅ **Modern Vue 3 Frontend** with mobile support via Capacitor
✅ **Robust Spring Boot Backend** with AI integration
✅ **Comprehensive News & Business Management** features
✅ **AI-powered Content Generation** using Google Gemini
✅ **RESTful API** with OpenAPI documentation
✅ **Custom MCQL ORM** for database operations
✅ **Third-party Integrations** (Cloudinary, OneSignal, PayFast, YouTube)
✅ **Progressive Web App** capabilities
✅ **Admin Dashboard** for complete system management

For questions or support, refer to:
- Frontend guidelines: `Laudium Biz FrontEnd/.junie/guidelines.md`
- Backend guidelines: `lauduimbizAPI BAckend/.junie/guidelines.md`
- API documentation: `lauduimbizAPI BAckend/docs/api.yaml`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21
**Created by**: Claude Code

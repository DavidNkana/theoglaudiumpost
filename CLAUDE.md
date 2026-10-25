# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sub-Project Documentation

**Read the project-specific CLAUDE.md files for detailed guidance:**
- Backend: `backend/CLAUDE.md`
- Frontend: `frontend/CLAUDE.md`

## Core Principles

### Fail Fast
- Validate inputs immediately - don't let bad data propagate
- Throw exceptions/errors at the point of failure
- Never silently swallow errors or return nulls when something fails
- Show errors to users immediately rather than hiding failures

### Single Method Implementation
- **ONE way to do each thing** - never create 2 or 3 methods/functions that accomplish the same goal
- Before adding new code, search for existing implementations
- If duplicate functionality exists, consolidate it
- Keep the codebase DRY (Don't Repeat Yourself)
- Remove redundant methods when discovered

### Read Before Modify
- **ALWAYS read the PURPOSE comment at the top of every file before modifying it**
- Every class/file has a documentation block explaining its purpose, dependencies, and usage
- If you make structural changes, **UPDATE the PURPOSE comment** to reflect the new structure
- Respect existing developer comments - don't remove or contradict them

## Project Overview

LaudiumAPP is a community news and business platform for Laudium, South Africa:
- **Frontend**: Vue 3 + Vite (`frontend/`)
- **Backend**: Spring Boot 3.4.5 + Java 21 target (`backend/`)

## Development Commands

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
```

### Backend
```bash
cd backend
./mvnw spring-boot:run   # Start server (http://localhost:9011/laudium)
./mvnw clean compile     # Compile without tests
```

### Running Both Together
1. Terminal 1: `cd backend && ./mvnw spring-boot:run`
2. Terminal 2: `cd frontend && npm run dev`

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:9011/laudium/api/v1
- Swagger UI: http://localhost:9011/laudium/swagger-ui.html

## Architecture Summary

### Frontend
- Vue 3 Composition API with `<script setup>`
- Vuex for state, Vue Router with auth guards
- Services layer for API calls (`src/services/`)
- Composables for reusable logic (`src/composables/`)

### Backend
- Spring Boot with Spring Security + JWT
- Custom MCQL ORM (not JPA) - see `libs/mcql.yaml`
- Controllers → Services → Models pattern
- OpenAPI spec at `src/main/resources/static/api.yaml`

## Key Rules

### Backend
- **No unit tests** - use OpenAPI examples in Swagger UI
- Reference `libs/mcql.yaml` before editing models
- Use explicit DTOs - never `Map<String, Object>`
- Add `@ModifiedByJunie YYYY-MM-DD` above modified methods

### Frontend
- Use existing services/composables - don't duplicate
- API calls go through services layer, not direct axios
- Tests are Node.js scripts: `node test-*.js`

## External Integrations

| Service | Purpose |
|---------|---------|
| Google Gemini | AI article generation |
| Cloudinary | Image storage |
| PayFast | Payment processing |
| OneSignal | Push notifications |
| Sentry | Error tracking |

## Database

MySQL with tables: articles, users, businesses, ads, payments, categories, tags, announcements, prompts

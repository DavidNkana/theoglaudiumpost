# CLAUDE.md - Frontend

This file provides guidance to Claude Code when working with the Vue.js frontend.

## Core Principles

### Fail Fast
- Validate data immediately when received from API
- Show errors to user right away - don't hide failures
- Use try/catch and handle errors explicitly
- Don't use || fallbacks that hide real problems

### Single Method Implementation
- ONE composable/service for each concern
- Don't create duplicate utility functions
- If `useAuth` exists, use it - don't create `useAuthentication`
- Check existing services before adding new API calls

## Before Modifying Any File

**ALWAYS read the PURPOSE comment at the top of the file first.** Every file has a documentation block explaining:
- What the file/component does
- Key exports or props
- Dependencies

If you make structural changes, **UPDATE the PURPOSE comment** to reflect the new structure.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run cap:build    # Build + sync Capacitor
npm run cap:open:android  # Open Android Studio
```

## Architecture

```
features/<domain>/  → Business-logic modules. Each owns its OO service(s):
                      <Domain>Service.js — a class extending BaseService that
                      exposes the domain's API as methods + a singleton export
                      (e.g. articlesService). Domains: articles, ads, businesses,
                      auth, payments, media, categories, tags, announcements,
                      dashboard, youtube, posts.
shared/services/    → BaseService (OO base) + shared service infrastructure
services/           → Central HTTP client (api.js) + shared utilities
                      (Storage, TimeManager, utils, responses, errorHandler)
config/             → env.js (sole env reader), app.js, api.js, payfast.js
components/         → Reusable UI components
composables/        → Vue 3 composition functions (useAuth, useAds, etc.)
store/              → Vuex state management
views/              → Page components (route targets)
layouts/            → Page layout wrappers
plugins/            → Vue plugins (axios, capacitor)
router/             → Route definitions with auth guards
utils/              → Helper functions
```

Each domain's API is a class: `import { articlesService } from "@/features/articles/ArticlesService"`
(named function exports are also kept for compatibility). New domain code adds a
method to the `<Domain>Service` class, never a stray axios/fetch call. See
`docs/SERVICE_ARCHITECTURE_MIGRATION.md` for the remaining (views/store)
co-location phases.

## Key Patterns

### API Calls — the service-layer boundary (ENFORCED)

**All API access, URL building, and environment access lives in `src/services/`
and `src/config/`. Nothing else may touch it.** This is enforced by
`harness/check-forbidden-patterns.sh` (the Handre review gate rejects
violations; Sacha fixes them — see `harness/SERVICE_LAYER_BOUNDARY.md`).

Outside `services/` and `config/`, the following are rejected:
- importing `axios` or the raw `apiClient` (`@/services/api`)
- hardcoded API/gateway URLs (our API, PayFast, YouTube, OneSignal, …)
- endpoint path strings (`/api/v1/...`) or raw `fetch()` to the backend
- reading `import.meta.env` / `process.env`

```javascript
// ✅ Use a resource service - never axios/apiClient directly in a component
import { getArticles } from '@/services/articles';
const articles = await getArticles();

// ✅ Need a media image? Use the media service, not apiClient.get(`media/...`)
import { getMediaObjectUrl } from '@/services/media'; // <img> src (display)
import { getMediaDataUrl }  from '@/services/media';  // base64 (re-submitted)

// ✅ Config/flags/keys come from the config layer, never import.meta.env
import { SHOW_ADS, ONESIGNAL_APP_ID } from '@/config/app';
import { IS_DEV } from '@/config/env';
```

**`src/config/env.js` is the ONLY file permitted to read `import.meta.env` /
`process.env`.** `config/api.js`, `config/app.js` and `config/payfast.js` read
through it; everything else imports the resolved constants.

When the API surface is missing a method, ADD it to the relevant service
(build the service ingestion first), then wire the component to it — do not
reach around the service.

### Authentication
```javascript
// Use the useAuth composable
import { useAuth } from '@/composables/useAuth';
const { user, isAuthenticated, hasRole } = useAuth();
```

### State Management
- Use Vuex for global state (auth, shared data)
- Use composables for component logic
- Use local refs for component-only state

### Component Style
- Use `<script setup>` syntax
- Use scoped SCSS styles
- Props with explicit types

## Route Auth

Routes are protected by roles in `router/index.js`:
- `requiresAuth: true` - Must be logged in
- `adminRoute: true` - Must have admin role
- `superAdminRoute: true` - Must have superadmin role

## Testing

Tests are standalone Node.js scripts:
```bash
node test-*.js
```

## Environment Variables

All env vars prefixed with `VITE_`:
- `VITE_DEV_API_BASE_URL` - API URL for development
- `VITE_SENTRY_DNS` - Sentry error tracking
- `VITE_ONE_SIGNAL_APP_ID` - Push notifications
- `VITE_PAYFAST_*` - Payment gateway config

# Laudium POST frontend

This repository is now rooted at the supplied Vue 3/Vite frontend. The UI and
application code are preserved as supplied; this setup only makes the frontend
deployable from the repository root.

## Stack and layout

- Vue 3, Vue Router, Vuex, and Vite
- Source: `src/`
- Static files: `public/`
- Production output: `dist/` (generated, ignored by Git)
- Capacitor configuration: `capacitor.config.json`
- Spring Boot source snapshot: `backend-archive/source/` (not part of the frontend build)

## Local setup

```sh
npm install
cp .env.example .env
# Set the API base values in .env, then:
npm run dev
```

Production build and preview:

```sh
npm run build
npm run preview
```

## API environment variables

The API client reads these through `src/config/api.js` and selects one by Vite
mode:

- `VITE_DEV_API_BASE_URL` for `npm run dev`
- `VITE_TEST_API_BASE_URL` for Vitest/test mode
- `VITE_PROD_API_BASE_URL` for production builds, including Vercel (required)

Values must be the real Spring Boot API base URL, including its API path. The
frontend canonicalizes the value to exactly one trailing slash; query strings,
fragments, and embedded credentials are rejected. Production requires an
absolute HTTPS URL and `npm run build` fails clearly when it is missing or
invalid. Development and tests may use the documented `/api/v1/` same-origin
placeholder (or an explicit local/test URL). Production must not fall back to
the frontend origin and return SPA HTML for API calls. No backend URL or secret
is provided in this repository. Do not commit `.env` files or credentials.

## Vercel

Import this repository with the project root set to the repository root:

- Framework preset: **Vite** (or Other)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install` (Vercel may use its detected equivalent)
- Environment variable: set `VITE_PROD_API_BASE_URL` to the deployed backend API base URL **before building**

`vercel.json` supplies the SPA fallback required by Vue Router history mode, but
explicitly excludes `/api/v1/*`. API requests therefore reach the configured
backend URL rather than being rewritten to `/index.html`; Vercel is not a
backend proxy.
Vercel hosts only this static frontend; it does not run the backend or MariaDB.

## Backend separation

The backend is a separate Spring Boot/MariaDB application and must be deployed
on infrastructure that supports Java and MariaDB. It is retained under
`backend-archive/source/` for reference and must be deployed/configured
separately. The original supplied archives are retained locally under
`backend-archive/` but are excluded from Git because the supplied backend
configuration contains credential-like values; the committed source snapshot
has those values replaced with environment placeholders.

## Capacitor

The existing native workflows remain available:

```sh
npm run cap:sync
npm run cap:build
npm run cap:open:android
npm run cap:run:android
npm run cap:build:android
npm run cap:bootstrap:ios
```

Native projects and platform tooling are separate from the Vercel deployment.

# Deploying Laudium Biz (Vue 3 + Vite) to Cloudflare Pages

## Overview
Laudium Biz is a Vue 3 application built with Vite. The easiest, most reliable way to deploy it is to Cloudflare Pages as a static Single-Page Application (SPA). No server-side rendering (SSR) is required by default.

If you need SSR or APIs at the edge in the future, consider Cloudflare Pages Functions or Cloudflare Workers, but that is not necessary for a standard Vue SPA deployment.

---

## 1) Prerequisites
- Cloudflare account
- GitHub/GitLab/Bitbucket repository with this project
- Node.js 16+ locally (for building and testing)

---

## 2) Build Settings for Cloudflare Pages
In Cloudflare Pages dashboard, create a new project and connect your repository. Use the following settings:

- Framework preset: Vue (optional, but recommended)
- Build command: `npm run build`
- Build output directory: `dist`
- Install command: `npm install` (or leave default)

These values match this project’s Vite setup (vite.config.js) and will produce optimized assets in `dist`.

---

## 3) Environment Variables (VITE_*)
Set environment variables in Cloudflare Pages → Settings → Environment variables. Use the same keys as your local `.env` file but only variables prefixed with `VITE_` will be exposed to the client:

Examples:
- `VITE_DEV_API_BASE_URL`
- `VITE_TEST_API_BASE_URL`
- `VITE_PROD_API_BASE_URL`
- `VITE_SENTRY_DNS`
- `VITE_ONE_SIGNAL_APP_ID`
- `VITE_YOUTUBE_API_KEY`
- `VITE_YOUTUBE_DEFAULT_CHANNEL_ID`
- PayFast variables (`VITE_PAYFAST_*`)

Pages supports per-environment variables (Production/Preview). Set appropriate values for each.

---

## 4) SPA Routing (404 to index.html)
A Vue SPA uses client-side routing. Ensure unknown paths fall back to `index.html` so the Vue Router can handle them. You can enable this in either of the following ways:

Option A: In Cloudflare Pages project settings, enable the framework preset “Vue” which auto-configures SPA fallback.

Option B: Add a `_redirects` file to your public assets so it’s included in the build output:

Create `public/_redirects` with:
```
/*    /index.html   200
```
This tells Pages to serve `index.html` for all routes.

---

## 5) Local Development
Run locally with Vite:
```
npm install
npm run dev
```
This provides hot module replacement and mirrors the production build behavior.

---

## 6) Production Build Preview
You can preview the production build locally:
```
npm run build
npm run preview
```
This serves the built `dist` directory locally.

---

## 7) Optional: PWA considerations
This project uses `vite-plugin-pwa`. Cloudflare Pages serves static files over HTTPS and works well with PWAs. After deploy:
- Visit the site
- Open DevTools → Application → Service Workers to confirm registration
- Verify manifest icons are loading (files are in `public/`)

---

## 8) Troubleshooting
- Blank pages on deep links: Ensure the `_redirects` SPA fallback is set or the Vue framework preset is enabled.
- Missing environment variables: Make sure they are defined in Pages Settings with `VITE_` prefix.
- Stale assets: Use hard refresh or bump asset version; Workbox caching can keep old files around temporarily.

---

## 9) Advanced: Deploy as a Cloudflare Worker (serve SPA from edge)
If you prefer Cloudflare Workers over Pages, this repo now includes a minimal Worker setup that serves the Vite-built SPA with client-side routing fallback.

Steps:
1. Install Wrangler (once):
   npm install -g wrangler

2. Build the app:
   npm run build

3. Preview locally with Workers:
   npm run cf:dev
   - This runs wrangler dev and serves assets from dist

4. Deploy to your account:
   npm run cf:deploy

Notes:
- Configuration: wrangler.toml
- Worker entry: worker.js (serves assets from dist with SPA fallback to /index.html)
- Environment variables: Workers don’t expose VITE_* at runtime; they must be inlined at build time via Vite. Set VITE_* in your CI environment before npm run build.

---

## Summary
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: add `public/_redirects` with `/* /index.html 200` or enable the Vue framework preset in Pages (Pages only)
- Configure `VITE_*` variables in Cloudflare Pages settings (Pages) or provide them at build time for Workers


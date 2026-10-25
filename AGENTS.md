# Repository Guidelines

## Project Structure & Module Organization
The app code lives in `src/`, organized by feature: `components/` (reusable UI), `views/` (route-level pages), `layouts/` (shells for public/business/admin), `router/`, `store/`, `services/` for API clients, and `utils/` for helpers. Static assets reside in `public/` and `src/assets/`; Capacitor native shells live in `android/` and `ios/`. Change logs and reference notes stay under `docs/`. API and regression smoke scripts (`test-*.js`) sit at the repo root; keep new checks in the same pattern.

## Build, Test, and Development Commands
Run `npm install` once per machine to hydrate dependencies. Use `npm run dev` for local development (Vite with auto-reload) and `npm run build` to produce a production bundle in `dist/`. `npm run preview` serves the built bundle for smoke checks. Capacitor flows use `npm run cap:sync` after dependency or asset updates and `npm run cap:run:android` for device testing. Cloudflare Worker deployments follow `npm run cf:dev` (build + Wrangler dev) and `npm run cf:deploy`.

## Coding Style & Naming Conventions
Vue 3 Single File Components favor `<script setup>` and 2-space indentation; keep imports sorted by scope (vue, third-party, local). Components and layouts use PascalCase filenames (`FeaturedStorySlider.vue`); composables begin with `use` (see `src/composables`). Prefer double quotes, trailing commas, and descriptive prop names. Format changes with Prettier 3: `npx prettier --write "src/**/*.{js,vue,scss}"`. Aliased imports should use `@/` per `vite.config.js`. Co-locate feature-specific styles under the same directory and scope them where possible.

## Testing Guidelines
Targeted integration checks live in the `test-*.js` scripts; execute them with Node (e.g., `node test-source-article-conversion.js`) against a staging API. Mirror the existing naming scheme (`test-<feature>.js`) and document any network prerequisites at the top of the file. When adding new features, include at least one script or Vue component-level guard that exercises the API path you touched, and verify `dist/` builds before shipping.

## Commit & Pull Request Guidelines
Follow the existing log format: concise, sentence-case summaries that highlight scope up front (e.g., `Ads: Restrict to single placement`). Group related work into a single commit when possible. Pull requests should include: a one-paragraph context summary, bullet-pointed changes, verification notes (`npm run build`, key tests), and linked issue numbers or task IDs. Attach screenshots/gifs for UI-facing updates and note any `.env` or configuration steps reviewers must perform. Never commit secrets; share environment updates privately.

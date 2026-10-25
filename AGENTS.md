# Repository Guidelines

## Documentation & Context
- Read `.claude/PROJECT_MAP.md` for the project map (modules, key files, endpoints).
- Read `CLAUDE.md` (root + each subproject) for rules, commands, and the required `PURPOSE:` header workflow.

## Project Structure & Module Organization
- `frontend/`: Vue 3 + Vite (+ Capacitor). Source in `src/`; assets in `public/` and `src/assets/`; mobile in `android/` and `ios/`.
- `backend/`: Spring Boot (Java 21 target). Source in `src/main/java/`; resources in `src/main/resources/`; OpenAPI in `src/main/resources/static/api.yml` (reference copy in `backend/docs/api.yaml`); MCQL schema in `backend/libs/mcql.yaml`.
- `frontend/` and `backend/` still contain their original nested `.git/` metadata from the pre-normalization split repos. Do not delete those histories without an explicit migration plan.
- `_related/`: preserved legacy/reference folders only; not active source for normal development.

## Build, Test, and Development Commands
Frontend:
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
```

Backend:
```bash
cd backend
./mvnw spring-boot:run   # http://localhost:9011/laudium (API: /laudium/api/v1)
./mvnw clean compile
./mvnw clean package
# Windows (PowerShell): .\\mvnw.cmd <goal>
```

Run both: start the backend first; configure frontend API via `.env` (`VITE_*_API_BASE_URL`).

## Coding Style & Naming Conventions
- Frontend: Vue SFCs use `<script setup>`, 2-space indentation, and double quotes. Components/layouts use PascalCase (`FeaturedStorySlider.vue`); composables start with `use*`. Route HTTP calls through `src/services/`. Format with `npx prettier --write "src/**/*.{js,vue,scss,md}"`.
- Backend: 4-space indentation and standard Java naming. Keep controllers thin and push business logic into `Services/`/`Logic/`; use explicit DTO classes (avoid `Map<String,Object>`). Read/update the `PURPOSE:` header comment when changing file structure and add `@ModifiedByJunie YYYY-MM-DD` above modified methods.

## Testing Guidelines
- Frontend: use `npm run build` as a smoke check; integration scripts live in the frontend root as `test-*.js` (run with `node test-foo.js`).
- Backend: no unit tests; verify via Swagger UI and OpenAPI examples; keep `src/main/resources/static/api.yml` and `docs/api.yaml` in sync when endpoints/DTOs change.

## Commit & Pull Request Guidelines
- Commit messages commonly follow Conventional Commits (`feat:`, `fix(scope):`, `chore:`) or scoped summaries like `Ads: ...`. Prefer `type(scope): summary` in the imperative mood; use the body for context when needed.
- PRs: include context, bullet list of changes, verification notes (commands run), and screenshots for UI-facing updates; link related issues/tasks and call out any required config changes.

## Security & Configuration Tips
- Never commit real credentials or API keys. Keep secrets in local `.env` / `application.properties` overrides and share only sanitized templates (e.g., `.env.example`).
- Avoid committing generated artifacts (`node_modules/`, `dist/`, `target/`) unless explicitly required for a deployment flow.



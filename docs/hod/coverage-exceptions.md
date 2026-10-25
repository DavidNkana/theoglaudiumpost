# Coverage Exceptions (Frontend)

Only generated code or composition roots with no business logic may be excluded
from the 100%-per-file coverage gate. Every exclusion is listed here with reason,
owner, and expiry. Unapproved exclusions are an automatic rejection.

| Path / pattern | Reason | Owner | Expiry |
|----------------|--------|-------|--------|
| `src/main.js` | Composition root / app bootstrap (plugin wiring, Sentry/OneSignal init). No business logic; exercised by Playwright E2E. | _pending_ | 2026-09-30 (revisit: move bootstrap logic into tested modules) |
| `src/**/*.spec.js` | Test files themselves. | n/a | n/a |

Notes:
- No `src/features/**`, `src/shared/**`, `src/services/**`, `src/config/**`,
  `src/components/**`, `src/views/**`, `src/composables/**`, or `src/store/**`
  file is excluded — all owned executable code is in the gate's scope.

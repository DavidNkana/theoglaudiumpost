# Quality Gates — Baseline & Program (Laudium)

This records the honest current state of the Multi-Stack Quality Gate Contract
across both stacks, the gates now installed, and the work required to reach the
standard. **No gate is weakened to make it pass.** The gates fail loud today
because the codebase is far from the standard — that failure is the truth.

_Last measured: 2026-06-17._

## Gates installed (this pass)

### Frontend (`frontend/`)
| Gate | Tool | Status |
|------|------|--------|
| Unit/component tests | Vitest + @vue/test-utils + jsdom | ✅ **934 tests green** |
| Coverage (100% per file) | Vitest **istanbul** (`npm run coverage`) | ✅ **enforcing**; service + logic layer at 100% |

**Coverage-provider substitution (justified per AGENTS).** We use the
`istanbul` provider, not `v8`. V8 phantom-reports the completion edge of every
`try/catch/finally` block (and under-counts some real branches), which makes a
true 100%-branch gate impossible without `/* v8 ignore */` comments (banned).
istanbul instruments accurately. One dependency (`vue3-masonry-css`) ships a
broken `main` entry; a resolve alias in `vitest.config.js` points at its real
ESM build so istanbul can instrument the whole tree.
| Architecture | dependency-cruiser (`npm run arch`) | ✅ installed, **enforcing** |
| E2E | Playwright (`npm run test:e2e`) | present (pre-existing) |
| `verify` command | `npm run verify` (arch → coverage → build) | ✅ |
| CI | `.github/workflows/ci.yml` | ✅ |
| Static analysis | ESLint flat config | ⬜ to add |
| Mutation | StrykerJS | ⬜ to add |

### Backend (`backend/`)
| Gate | Tool | Status |
|------|------|--------|
| Unit/slice/integration tests | JUnit 5 + Mockito + Testcontainers | ⬜ (1 regression test only) |
| Coverage (100% per class) | JaCoCo (`verify`) | ✅ installed, **enforcing** |
| Architecture | ArchUnit | ✅ installed, **enforcing**, 2 rules |
| Mutation | PIT | ⬜ to add |
| Static analysis | Checkstyle/Spotless + SpotBugs/Error Prone | ⬜ to add |
| CI | `.github/workflows/ci.yml` | ✅ |

## Measured baseline (the honest numbers)

_Updated during the program execution (operator: "execute this")._

| Metric | Start | Now |
|--------|-------|-----|
| Frontend tests | 19 | **3,449 passing** |
| Frontend coverage (ALL ~280 files) | 0.44% | **100% per file — `npm run verify` EXIT 0** |
| Frontend circular deps (arch) | 21 | **0** (useAuth/layouts/views use `useRouter()` not the singleton) |
| Backend coverage | ~0% | ~0% (Phase 4) |
| Backend architecture violations | `PaymentController`→repo | open (Phase 4) |

**Frontend (Phases 1–3): COMPLETE.** 100% per-file line/branch/function/statement
coverage, zero circular dependencies, build green — all enforced by `npm run verify`
and CI. No `/* istanbul ignore */` comments, no excluded source (except the
documented `main.js` bootstrap), no weakened gates.

Closed by root-cause (not exclusions): deleted dead `getPathFromUrl`, dead
`Storage.js` (imported the uninstalled `@capacitor/storage`), an unreachable
env guard, a `devLog` fallback, a `usePushNotifications` self-assign no-op, and
a PayFast dead default param; fixed a real router title bug. Zero
`/* istanbul ignore */` / `/* v8 ignore */` comments; zero gate weakening.

## Violations the gates already caught (must be fixed, not silenced)

1. **21 frontend circular dependencies** — same class of bug that crashed the
   app at runtime (`api → useAuth → AuthService → BaseService → api`). The
   runtime crash one was fixed; the rest remain and the arch gate fails on them.
2. **Backend controllers inject repositories** — `PaymentController` takes
   `PaymentRepository` in its constructor. AGENTS forbids controller→repository
   coupling; route through a service.

## Program to reach the standard (NEEDS OPERATOR SCOPE DECISION)

Bringing the entire existing app to 100% coverage + mutation + integration + E2E
+ zero architecture violations is a multi-iteration program, not a single change.
Per AGENTS "Nothing Is Out of Scope" the only valid way to phase it is an
explicit operator scope decision with **owner, ticket, and target date**.

Proposed phases (each ships gates green for the slice it covers):
1. Frontend service layer (`features/**`, `shared/services`, `config/**`) to 100% + MSW API-client tests.
2. Frontend components/views/composables/store to 100% + Playwright E2E for critical flows (auth, article read, advertise/pay).
3. Resolve all 21 circular dependencies; turn on no-cycle in CI as blocking.
4. Backend: extract `PaymentController` repo/SQL into services; ArchUnit layering + no-cycle; JUnit/Testcontainers to 100% per class; PIT on payments/auth/fiscalization.
5. Add StrykerJS (FE) + PIT (BE) mutation, ESLint/Checkstyle/SpotBugs static gates.

**Owner / ticket / target date: _pending operator assignment._**

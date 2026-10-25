# Enforcement Harness

Last Updated: 2026-03-31

## Overview

Mechanical enforcement of CLAUDE.md rules for the LaudiumAPP project. The harness
ensures compliance automatically -- developers and Claude Code agents don't need to
remember rules manually. Every Edit or Write of a `.java`, `.vue`, `.js`, or `.ts`
file triggers the forbidden pattern scanner via a Claude Code PostToolUse hook.

**Project:** LaudiumAPP -- community news and business platform for Laudium, South Africa
**Stack:** Vue 3 + Vite frontend, Spring Boot 3.4.5 + Java 24 backend

## Components

### 1. Forbidden Pattern Scanner

**Location:** `harness/check-forbidden-patterns.sh`
**Run:** `bash harness/check-forbidden-patterns.sh <file-path>`
**Exit:** 0 = clean, 1 = violations found

#### Java Rules (*.java)

| Pattern | What It Catches | CLAUDE.md Rule |
|---------|----------------|----------------|
| `Map<String, Object>` | Untyped map responses -- use explicit DTO classes | Backend: "Use explicit DTOs - never Map<String, Object>" |
| `@Autowired` (field injection) | Field-level @Autowired -- use constructor injection | Backend: Constructor injection is the project standard |
| `e.printStackTrace()` | Lazy error handling -- use Logger instead | Root: "Never silently swallow errors" |
| `System.exit()` | Direct JVM exit -- let Spring manage lifecycle | Fail Fast principle |
| Empty catch blocks | Swallowed exceptions -- handle or rethrow | Root: "Never silently swallow errors" |
| `new Gson()` | Manual Gson instantiation -- use `Utils.getGson()` | Backend: "Use centralized Util.getGson() method" |
| `TODO.*implement` stubs | Placeholder code left unfinished | General quality |

#### Frontend Rules (*.vue, *.js, *.ts)

| Pattern | What It Catches | CLAUDE.md Rule |
|---------|----------------|----------------|
| `console.log/debug/info/warn` | Debug logging left in code -- use devLog utility | Frontend: Proper error handling |
| Direct `import axios` in views/components | Bypassing the services layer | Frontend: "API calls go through services layer" |
| `TODO.*implement` stubs | Placeholder code left unfinished | General quality |
| Hardcoded `localhost` fallback URLs | Environment-dependent defaults leaking into code | Frontend: Use env config |

### 2. Drift Detection

**Location:** `harness/detect-drift.sh`
**Run:** `bash harness/detect-drift.sh`
**Exit:** 0 = no drift, 1 = drift detected

| Check | Compares |
|-------|----------|
| CLAUDE.md sub-project files | Backend and frontend CLAUDE.md existence |
| Root CLAUDE.md references | Root doc links to both sub-project docs |
| MCQL yaml | `libs/mcql.yaml` exists (required by CLAUDE.md for model editing) |
| Integration config | All integrations listed in CLAUDE.md found in application.properties |
| Harness documentation | `docs/harness/HARNESS.md` exists |
| Code inventory | Controller, service, DTO, view, component counts reported |

### 3. Architectural Tests

**Status:** Not yet implemented (future phase).

Recommended approach: Add ArchUnit tests to enforce:
- Controllers only call Services (never Repos directly)
- Naming conventions (files ending with Controller, Service, etc.)
- DTO restrictions (no `LocalDateTime` in DTOs, etc.)
- Use `FreezingArchRule` to baseline existing violations

### 4. Spec Validation

**Location:** `lauduimbizAPI BAckend/docs/api.yaml`
**Status:** Manual validation via Swagger UI (project does not use unit tests).

The api.yaml is the source of truth for the API contract. Validation is done
through Swagger UI examples as stated in CLAUDE.md.

### 5. Claude Code Hooks

**Location:** `.claude/settings.local.json`
**Trigger:** Every `Edit` or `Write` tool invocation
**Filter:** Only `.java`, `.vue`, `.js`, `.ts` files
**Action:** Runs `harness/check-forbidden-patterns.sh` on the edited file

The hook is configured as a PostToolUse hook with matcher `Edit|Write`. If the
scanner finds violations, it exits with code 1 and prints `[VIOLATION]` lines
that Claude Code surfaces to the agent, forcing self-correction.

## How to Run

### Scan a single file
```bash
bash harness/check-forbidden-patterns.sh path/to/file.java
```

### Scan all Java files
```bash
find "lauduimbizAPI BAckend/src" -name "*.java" -exec bash harness/check-forbidden-patterns.sh {} \;
```

### Scan all frontend files
```bash
find "Laudium Biz FrontEnd/src" \( -name "*.vue" -o -name "*.js" -o -name "*.ts" \) -exec bash harness/check-forbidden-patterns.sh {} \;
```

### Run drift detection
```bash
bash harness/detect-drift.sh
```

## Adding New Rules

### New Forbidden Pattern

1. Open `harness/check-forbidden-patterns.sh`
2. Add a new block under the appropriate language section (Java or Frontend)
3. Comment with the CLAUDE.md rule name above the block
4. Use `grep -nE 'PATTERN' "$FILE" 2>/dev/null` to match
5. Print a `[VIOLATION]` message on match
6. Increment `VIOLATIONS` counter
7. Test on a clean file (should exit 0) and a violating file (should exit 1)

Example:
```bash
# --- [Rule Name from CLAUDE.md] ---
if grep -nE 'PATTERN_HERE' "$FILE" 2>/dev/null; then
    echo "[VIOLATION] Description of violation ($FILE)"
    VIOLATIONS=$((VIOLATIONS + 1))
fi
```

### New Drift Check

1. Open `harness/detect-drift.sh`
2. Add a comparison block using `grep`, `find`, or `wc`
3. Print `[OK]` on match, `[DRIFT]` on mismatch
4. Increment `DRIFT_COUNT` on mismatch
5. Use `-E` (extended regex) for cross-platform compatibility

### New Architectural Test (future)

1. Add ArchUnit dependency to `pom.xml`
2. Create test class extending `ArchUnitBaseTest`
3. Use `FreezingArchRule` if existing violations exist (baselines them)
4. Run `./mvnw test` to verify

## Existing Violations (Baseline)

The following known violations exist in the current codebase. These are baselined
and should be cleaned up incrementally:

| Violation | Count | Files |
|-----------|-------|-------|
| `Map<String, Object>` usage | ~312 occurrences | 42 Java files |
| `@Autowired` field injection | ~5 occurrences | 2 Java files |
| `e.printStackTrace()` | ~5 occurrences | 4 Java files |
| `console.log` in frontend | ~220 occurrences | 65 files |
| Direct axios import in views | 1 occurrence | 1 file |

The harness enforces **no new violations** -- existing ones are caught but
represent technical debt to be cleaned up over time.

## Cross-References

- **Root rules:** `CLAUDE.md` (project root)
- **Backend rules:** `lauduimbizAPI BAckend/CLAUDE.md`
- **Frontend rules:** `Laudium Biz FrontEnd/CLAUDE.md`
- **MCQL ORM reference:** `lauduimbizAPI BAckend/libs/mcql.yaml`
- **API spec:** `lauduimbizAPI BAckend/docs/api.yaml`
- **Hook config:** `.claude/settings.local.json`

## File Tree

```
LaudiumAPP/
  harness/
    check-forbidden-patterns.sh    # Per-file pattern scanner
    detect-drift.sh                # Code-vs-docs comparison
  docs/
    harness/
      HARNESS.md                   # This file
  .claude/
    settings.local.json            # PostToolUse hooks (triggers scanner)
  CLAUDE.md                        # Root project rules
  lauduimbizAPI BAckend/
    CLAUDE.md                      # Backend-specific rules
  Laudium Biz FrontEnd/
    CLAUDE.md                      # Frontend-specific rules
```

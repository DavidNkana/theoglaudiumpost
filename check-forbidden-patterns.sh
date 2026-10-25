#!/usr/bin/env bash
# Harness: Forbidden Pattern Check
# Scans a single file for prohibited patterns from CLAUDE.md.
# Usage: check-forbidden-patterns.sh <file-path>
# Exit code 0 = clean, 1 = violations found.
#
# Rules enforced:
#   Backend (CLAUDE.md):  No Map<String,Object>, no @Autowired fields,
#                         no e.printStackTrace(), no System.exit(), no empty
#                         catch blocks, use Util.getGson() not new Gson()
#   Frontend (CLAUDE.md): No console.log (use devLog), no direct axios in
#                         views/components, no placeholder stubs

set -uo pipefail

FILE="$1"
VIOLATIONS=0

if [ ! -f "$FILE" ]; then
    echo "File not found: $FILE"
    exit 1
fi

# ========================================================================
# JAVA RULES (*.java files only)
# ========================================================================
if echo "$FILE" | grep -qE '\.java$'; then

    # --- [No Map<String, Object> - use explicit DTOs] ---
    # CLAUDE.md Backend: "Use explicit DTOs - never Map<String, Object>"
    if grep -nE 'Map<String,\s*Object>' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] Map<String, Object> found - use explicit DTO classes instead ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # --- [No @Autowired field injection] ---
    # CLAUDE.md: Constructor injection is the project standard (see ArticleController)
    # Only flags @Autowired on fields (lines without method signature patterns)
    if grep -nE '^\s*@Autowired' "$FILE" 2>/dev/null | grep -vE '(public|private|protected)\s+\w+\s*\(' 2>/dev/null; then
        echo "[VIOLATION] @Autowired field injection found - use constructor injection instead ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # --- [No e.printStackTrace()] ---
    # CLAUDE.md: Fail Fast - don't silently handle errors; use proper logging
    if grep -nE 'e\.printStackTrace\(\)' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] e.printStackTrace() found - use Logger instead ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # --- [No System.exit()] ---
    # Spring Boot applications should never call System.exit
    if grep -nE 'System\.exit\(' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] System.exit() found - let Spring manage lifecycle ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # --- [No empty catch blocks] ---
    # CLAUDE.md: Fail Fast - "Never silently swallow errors"
    if grep -nE 'catch\s*\([^)]*\)\s*\{\s*\}' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] Empty catch block found - handle or rethrow exceptions ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # --- [Use Util.getGson() - no new Gson()] ---
    # CLAUDE.md Backend: "Use centralized Util.getGson() method"
    # Exclude the Utils.java file itself where getGson() is defined
    if ! echo "$FILE" | grep -q 'Utils\.java$'; then
        if grep -nE 'new\s+Gson\(\)' "$FILE" 2>/dev/null; then
            echo "[VIOLATION] new Gson() found - use Utils.getGson() for centralized config ($FILE)"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi

    # --- [No placeholder / stub implementations] ---
    # General quality: no TODO-implement stubs in committed code
    if grep -nEi 'TODO:?\s*(implement|add|fix|hack|stub)' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] TODO stub/placeholder found - implement before committing ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

fi

# ========================================================================
# VUE / JAVASCRIPT / TYPESCRIPT RULES (*.vue, *.js, *.ts files)
# ========================================================================
if echo "$FILE" | grep -qE '\.(vue|js|ts)$'; then

    # --- [No console.log - use devLog or proper logging] ---
    # CLAUDE.md Frontend: Fail Fast / proper error handling
    # Allow devLog.js itself to use console.log
    if ! echo "$FILE" | grep -q 'devLog'; then
        if grep -nE 'console\.(log|debug|info|warn)\(' "$FILE" 2>/dev/null; then
            echo "[VIOLATION] console.log/debug/info/warn found - use devLog utility instead ($FILE)"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi

    # --- [No direct axios imports in views/components] ---
    # CLAUDE.md Frontend: "API calls go through services layer, not direct axios"
    if echo "$FILE" | grep -qE '/(views|components)/'; then
        if grep -nE "import\s+(axios|{[^}]*})\s+from\s+['\"]axios['\"]" "$FILE" 2>/dev/null; then
            echo "[VIOLATION] Direct axios import in view/component - use services layer ($FILE)"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi

    # --- [No placeholder / stub implementations] ---
    if grep -nEi 'TODO:?\s*(implement|add|fix|hack|stub)' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] TODO stub/placeholder found - implement before committing ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # --- [No hardcoded localhost URLs as fallback defaults] ---
    if grep -nE '\|\|\s*["\x27]https?://localhost' "$FILE" 2>/dev/null; then
        echo "[VIOLATION] Hardcoded localhost fallback URL found - use env config ($FILE)"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

fi

# ========================================================================
# RESULT
# ========================================================================
if [ "$VIOLATIONS" -gt 0 ]; then
    echo ""
    echo "=== $VIOLATIONS forbidden pattern(s) found in $FILE ==="
    exit 1
fi

exit 0

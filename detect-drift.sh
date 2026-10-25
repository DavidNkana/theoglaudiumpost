#!/usr/bin/env bash
# Harness: Drift Detection
# Compares code reality against documentation claims.
# Exit code 0 = no drift, 1 = drift detected.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRIFT_COUNT=0

echo "=== Harness: Drift Detection ==="
echo ""

# --- Controller count vs api.yaml documentation ---
BACKEND_SRC="$PROJECT_ROOT/lauduimbizAPI BAckend/src/main/java/com/laudiumbiz/Laudiumbiz"
CONTROLLER_COUNT=$(find "$BACKEND_SRC/Controllers" -name "*Controller.java" 2>/dev/null | wc -l | tr -d ' ')
echo "[INFO] Backend controllers found: $CONTROLLER_COUNT"

API_YAML="$PROJECT_ROOT/lauduimbizAPI BAckend/docs/api.yaml"
if [ -f "$API_YAML" ]; then
    # Count unique path groups in api.yaml (top-level path entries)
    API_PATH_COUNT=$(grep -cE '^\s*/[a-zA-Z]' "$API_YAML" 2>/dev/null || echo 0)
    echo "[INFO] API paths in api.yaml: $API_PATH_COUNT"
else
    echo "[WARN] api.yaml not found at $API_YAML - cannot compare controller paths"
fi

# --- Service count drift ---
SERVICE_COUNT=$(find "$BACKEND_SRC/Services" -name "*Service.java" -not -path "*/search/*" 2>/dev/null | wc -l | tr -d ' ')
echo "[INFO] Backend services found: $SERVICE_COUNT"

# --- DTO count drift ---
DTO_COUNT=$(find "$BACKEND_SRC/Models/DTO" -name "*.java" 2>/dev/null | wc -l | tr -d ' ')
echo "[INFO] Backend DTOs found: $DTO_COUNT"

# --- Frontend service files vs composables ---
FRONTEND_SRC="$PROJECT_ROOT/Laudium Biz FrontEnd/src"
FE_SERVICE_COUNT=$(find "$FRONTEND_SRC/services" -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
FE_COMPOSABLE_COUNT=$(find "$FRONTEND_SRC/composables" -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
FE_VIEW_COUNT=$(find "$FRONTEND_SRC/views" -name "*.vue" 2>/dev/null | wc -l | tr -d ' ')
FE_COMPONENT_COUNT=$(find "$FRONTEND_SRC/components" -name "*.vue" 2>/dev/null | wc -l | tr -d ' ')
echo "[INFO] Frontend services: $FE_SERVICE_COUNT, composables: $FE_COMPOSABLE_COUNT"
echo "[INFO] Frontend views: $FE_VIEW_COUNT, components: $FE_COMPONENT_COUNT"

# --- CLAUDE.md sub-project file existence ---
BACKEND_CLAUDE="$PROJECT_ROOT/lauduimbizAPI BAckend/CLAUDE.md"
FRONTEND_CLAUDE="$PROJECT_ROOT/Laudium Biz FrontEnd/CLAUDE.md"

if [ ! -f "$BACKEND_CLAUDE" ]; then
    echo "[DRIFT] Backend CLAUDE.md missing: $BACKEND_CLAUDE"
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
else
    echo "[OK] Backend CLAUDE.md exists"
fi

if [ ! -f "$FRONTEND_CLAUDE" ]; then
    echo "[DRIFT] Frontend CLAUDE.md missing: $FRONTEND_CLAUDE"
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
else
    echo "[OK] Frontend CLAUDE.md exists"
fi

# --- Root CLAUDE.md references both sub-projects ---
ROOT_CLAUDE="$PROJECT_ROOT/CLAUDE.md"
if [ -f "$ROOT_CLAUDE" ]; then
    if ! grep -q 'lauduimbizAPI BAckend/CLAUDE.md' "$ROOT_CLAUDE" 2>/dev/null; then
        echo "[DRIFT] Root CLAUDE.md does not reference backend CLAUDE.md"
        DRIFT_COUNT=$((DRIFT_COUNT + 1))
    fi
    if ! grep -q 'Laudium Biz FrontEnd/CLAUDE.md' "$ROOT_CLAUDE" 2>/dev/null; then
        echo "[DRIFT] Root CLAUDE.md does not reference frontend CLAUDE.md"
        DRIFT_COUNT=$((DRIFT_COUNT + 1))
    fi
    echo "[OK] Root CLAUDE.md references both sub-project docs"
else
    echo "[DRIFT] Root CLAUDE.md missing"
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
fi

# --- MCQL yaml existence (required by CLAUDE.md) ---
MCQL_YAML="$PROJECT_ROOT/lauduimbizAPI BAckend/libs/mcql.yaml"
if [ ! -f "$MCQL_YAML" ]; then
    echo "[DRIFT] mcql.yaml missing - CLAUDE.md says to reference it before editing models"
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
else
    echo "[OK] mcql.yaml exists at expected location"
fi

# --- External integrations mentioned in CLAUDE.md vs application.properties ---
APP_PROPS="$PROJECT_ROOT/lauduimbizAPI BAckend/src/main/resources/application.properties"
if [ -f "$APP_PROPS" ]; then
    MISSING_CONFIGS=""
    for KEY in "gemini" "cloudinary" "payfast" "onesignal"; do
        if ! grep -qi "$KEY" "$APP_PROPS" 2>/dev/null; then
            MISSING_CONFIGS="$MISSING_CONFIGS $KEY"
        fi
    done
    if [ -n "$MISSING_CONFIGS" ]; then
        echo "[DRIFT] CLAUDE.md lists integrations not found in application.properties:$MISSING_CONFIGS"
        DRIFT_COUNT=$((DRIFT_COUNT + 1))
    else
        echo "[OK] All documented integrations found in application.properties"
    fi
else
    echo "[WARN] application.properties not found"
fi

# --- Harness documentation exists ---
HARNESS_DOC="$PROJECT_ROOT/docs/harness/HARNESS.md"
if [ ! -f "$HARNESS_DOC" ]; then
    echo "[DRIFT] Harness documentation missing: docs/harness/HARNESS.md"
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
else
    echo "[OK] Harness documentation exists"
fi

echo ""
echo "=== Summary: $DRIFT_COUNT drift issue(s) found ==="

if [ "$DRIFT_COUNT" -gt 0 ]; then
    exit 1
fi
exit 0

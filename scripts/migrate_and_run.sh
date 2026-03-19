#!/usr/bin/env bash
# =============================================================================
#  migrate_and_run.sh
#  Script 2 — Incremental Update: Applies pending migrations (migrate + upgrade)
#              and starts the Flask dev server WITHOUT touching existing DB data.
#
#  Usage:
#    pipenv run dev            (via Pipfile [scripts])
#    bash scripts/migrate_and_run.sh
# =============================================================================

set -euo pipefail   # Exit on any error, unset var, or pipe failure

# ── Color helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${YELLOW}▶ Step $*${RESET}"; }

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ -f ".env" ]; then
    set -o allexport
    # shellcheck source=../.env
    source .env
    set +o allexport
    success ".env loaded"
else
    warn ".env file not found — using existing environment variables"
fi

# ── Validate required environment variables ───────────────────────────────────
: "${FLASK_APP:?FLASK_APP must be set in .env (e.g. FLASK_APP=src/app.py)}"
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"

# ── Step 1: Kill any process already using port 3001 ─────────────────────────
step "1/4 — Freeing port 3001"
if command -v lsof &>/dev/null; then
    PIDS=$(lsof -ti :3001 || true)
    if [ -n "$PIDS" ]; then
        kill -9 $PIDS 2>/dev/null && warn "Killed existing process(es) on port 3001: $PIDS"
    else
        info "Port 3001 is free"
    fi
elif command -v fuser &>/dev/null; then
    fuser -k 3001/tcp 2>/dev/null || true
    info "Port 3001 forcefully cleared (fuser)"
else
    warn "Neither lsof nor fuser found — skipping port cleanup (manual check recommended)"
fi
success "Port 3001 ready"

# ── Step 2: Initialize migrations if folder doesn't exist ────────────────────
step "2/4 — Checking migrations folder"
if [ ! -d "migrations" ]; then
    warn "No migrations folder found — running flask db init first"
    flask db init || error "flask db init failed"
    success "Migrations initialized"
else
    info "Migrations folder exists — skipping init"
fi

# ── Step 3: Generate and apply new migrations ─────────────────────────────────
step "3/4 — Generating and applying pending migrations"
# --autogenerate will detect schema changes; if there are none, it still succeeds
flask db migrate -m "auto: schema update" 2>&1 | tee /tmp/flask_migrate_output.txt || true

# Check if migrate produced any changes
if grep -q "No changes in schema detected" /tmp/flask_migrate_output.txt 2>/dev/null; then
    info "No schema changes detected — running upgrade to ensure DB is current"
else
    success "New migration generated"
fi

flask db upgrade || error "flask db upgrade failed"
success "Database schema is up to date"

# ── Step 4: Start Flask development server ────────────────────────────────────
step "4/4 — Starting Flask server on port 3001"
success "All setup complete — launching server..."
echo ""
exec flask run -p 3001 -h 0.0.0.0

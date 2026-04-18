#!/usr/bin/env bash
# =============================================================================
#  reset_and_run.sh
#  Script 1 — Full Reset: Drops DB, recreates it, reinitializes migrations,
#              runs migrate + upgrade, and starts the Flask dev server.
#
#  Usage:
#    pipenv run reset          (via Pipfile [scripts])
#    bash scripts/reset_and_run.sh
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
    # Export all non-comment, non-empty lines
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

# ── Detect DB backend ─────────────────────────────────────────────────────────
IS_SQLITE=false
IS_POSTGRES=false
if [[ "$DATABASE_URL" == sqlite* ]]; then
    IS_SQLITE=true
elif [[ "$DATABASE_URL" == postgres* || "$DATABASE_URL" == postgresql* ]]; then
    IS_POSTGRES=true
else
    error "Unsupported DATABASE_URL scheme: $DATABASE_URL"
fi

# ── Step 1: Kill any process already using port 3001 ─────────────────────────
step "1/6 — Freeing port 3001"
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

# ── Step 2: Remove existing migrations folder ─────────────────────────────────
step "2/6 — Removing existing migrations"
if [ -d "migrations" ]; then
    rm -rf migrations
    success "Removed ./migrations"
else
    info "No migrations folder found — skipping"
fi

# ── Step 3: Drop and recreate database ───────────────────────────────────────
step "3/6 — Resetting database"
if $IS_SQLITE; then
    # Extract the filesystem path from the sqlite URL
    SQLITE_PATH="${DATABASE_URL#sqlite:///}"
    SQLITE_PATH="${SQLITE_PATH#sqlite://}"
    if [ -f "$SQLITE_PATH" ]; then
        rm -f "$SQLITE_PATH"
        success "Removed SQLite DB: $SQLITE_PATH"
    else
        info "SQLite DB not found at '$SQLITE_PATH' — will be created fresh"
    fi
elif $IS_POSTGRES; then
    # Parse host, user and dbname from the URL
    # Expected format: postgresql://user:pass@host:port/dbname
    DB_HOST=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DATABASE_URL'); print(u.hostname)")
    DB_USER=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DATABASE_URL'); print(u.username)")
    DB_NAME=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DATABASE_URL'); print(u.path.lstrip('/'))")

    if command -v dropdb &>/dev/null; then
        info "Dropping PostgreSQL database '$DB_NAME' on $DB_HOST"
        dropdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>/dev/null || warn "DB '$DB_NAME' did not exist — skipping drop"
        info "Creating PostgreSQL database '$DB_NAME'"
        createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" || error "Failed to create database '$DB_NAME'"
        info "Installing PostgreSQL extensions"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c 'CREATE EXTENSION IF NOT EXISTS unaccent;' || warn "unaccent extension already exists or unavailable"
        success "PostgreSQL DB reset complete"
    else
        warn "dropdb/createdb not found — skipping PostgreSQL reset. Make sure psql tools are installed."
    fi
fi

# ── Step 4: Initialize Flask-Migrate ─────────────────────────────────────────
step "4/6 — Initializing Flask-Migrate"
flask db init || error "flask db init failed"
success "Migrations initialized"

# ── Step 5: Generate and apply migrations ────────────────────────────────────
step "5/6 — Generating and applying migrations"
flask db migrate -m "reset: initial schema" || error "flask db migrate failed"
flask db upgrade || error "flask db upgrade failed"
success "Database schema is up to date"

# ── Step 6: Start Flask development server ────────────────────────────────────
step "6/6 — Starting Flask server on port 3001"
success "All setup complete — launching server..."
echo ""
exec flask run -p 3001 -h 0.0.0.0

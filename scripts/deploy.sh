#!/usr/bin/env bash
# deploy.sh — Full deploy: SAM backend + frontends
# Usage: ./scripts/deploy.sh [dev|prod]
#
# Requires: sam CLI, aws CLI, node, npm

set -euo pipefail

ENV="${1:-dev}"

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│   Altus Retreats — Full Deploy → ${ENV}       │"
echo "└─────────────────────────────────────────────┘"
echo ""

# ── 1. Run backend tests ───────────────────────────────────────────────
echo "▸ Running backend tests…"
(cd backend && npm test -- --forceExit --no-coverage)
echo "  ✓ Tests passed"

# ── 2. SAM build ───────────────────────────────────────────────────────
echo ""
echo "▸ Building Lambda functions…"
sam build --template infrastructure/template.yaml --use-container
echo "  ✓ Build complete"

# ── 3. SAM deploy ──────────────────────────────────────────────────────
echo ""
echo "▸ Deploying infrastructure (${ENV})…"
CONFIRM_FLAG=""
if [ "$ENV" == "prod" ]; then
  CONFIRM_FLAG=""  # samconfig.toml sets confirm_changeset=true for prod
fi
sam deploy --config-env "$ENV" --no-fail-on-empty-changeset
echo "  ✓ Infrastructure deployed"

# ── 4. Frontend deploy ─────────────────────────────────────────────────
echo ""
echo "▸ Deploying frontends…"
./scripts/deploy-frontend.sh "$ENV"

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│   ✓ Full deploy complete!                    │"
echo "└─────────────────────────────────────────────┘"

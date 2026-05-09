#!/usr/bin/env bash
# Gatekeeper for any command that would touch production Supabase.
# Requires the operator to type YES (all caps) on stdin.
#
# Usage: scripts/confirm-prod.sh <command...>
set -euo pipefail

echo ""
echo "🚨  You are about to connect to PRODUCTION Supabase."
echo "   Real member and attendance data lives there."
echo ""
read -r -p "   Type YES to proceed (anything else aborts): " confirm

if [[ "$confirm" != "YES" ]]; then
  echo "   Aborted."
  exit 1
fi

exec "$@"

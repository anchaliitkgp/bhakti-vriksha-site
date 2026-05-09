#!/usr/bin/env bash
# Loads an env file (if it exists) into the current shell and runs the remaining command.
#
# Usage:  scripts/with-env.sh <env-file> <command...>
# Example: scripts/with-env.sh .env.dev.local next dev
set -euo pipefail

ENV_FILE="${1:?usage: with-env.sh <env-file> <command...>}"
shift

if [[ ! -f "$ENV_FILE" ]]; then
  echo "⚠ env file not found: $ENV_FILE" >&2
  exit 1
fi

# Export every KEY=VALUE in the env file, ignoring comments & blank lines.
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

exec "$@"

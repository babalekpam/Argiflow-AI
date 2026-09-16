#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Reconcile the merged lockfile without prompting or rewriting dependencies.
npm ci --no-audit --no-fund
npm run build

# Deliberately no db:push: this app also owns tables outside Drizzle's schema.
# Schema changes require individually reviewed, additive migrations.
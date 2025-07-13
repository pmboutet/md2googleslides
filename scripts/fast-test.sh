#!/bin/bash
# Fast test runner for md2googleslides
# Runs TypeScript compilation and unit tests only, skipping Docker and security scans

set -euo pipefail

echo "⚡ Running fast tests: compile + unit"

npm run clean >/dev/null 2>&1 || true
npm run compile
npm test

echo "✅ Fast tests complete"
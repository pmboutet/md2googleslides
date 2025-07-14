#!/bin/bash

# Script to regenerate package-lock.json with new dependencies
set -e

echo "Regenerating package-lock.json..."

# Remove old lock file
rm -f package-lock.json

# Install dependencies to generate new lock file
npm install

echo "New package-lock.json generated successfully"
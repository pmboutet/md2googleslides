#!/bin/bash

# Quick compilation test script for troubleshooting
# This script tests compilation without running full npm install

set -e

echo "🔧 Testing TypeScript compilation with current dependencies..."

# Check if we have TypeScript available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please ensure Node.js is installed."
    exit 1
fi

# Quick TypeScript compilation test
echo "📦 Testing TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed."
    exit 1
fi

# Test Babel compilation if TypeScript succeeds
echo "🔄 Testing Babel compilation..."
if npx babel --extensions '.ts,.js' --source-maps both -d lib/ src/ 2>/dev/null; then
    echo "✅ Babel compilation successful!"
else
    echo "❌ Babel compilation failed."
    exit 1
fi

echo "🎉 All compilation tests passed!"
echo "💡 You can now run: npm install && npm run compile"
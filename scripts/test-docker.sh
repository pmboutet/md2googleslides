#!/bin/bash

# Docker test and build verification script
set -euo pipefail

echo "🐳 Building Docker image..."
docker build -t md2googleslides:test . || {
    echo "❌ Docker build failed"
    exit 1
}

echo "✅ Docker build successful"

echo "🧪 Testing Docker image..."
docker run --rm md2googleslides:test --help || {
    echo "❌ Docker container failed to start"
    exit 1
}

echo "✅ Docker container test successful"

echo "📝 Creating test markdown file..."
cat > /tmp/test-slides.md << 'EOF'
# Test Presentation

---

## Slide 1
This is a test slide.

---

## Slide 2
- Point 1
- Point 2
- Point 3

---

## Code Example
```javascript
function hello() {
    console.log("Hello World!");
}
```
EOF

echo "🔍 Testing markdown processing..."
docker run --rm -v /tmp:/workspace md2googleslides:test \
    /workspace/test-slides.md \
    --title "Docker Test" \
    --dry-run || {
    echo "❌ Markdown processing test failed"
    exit 1
}

echo "✅ All Docker tests passed!"
echo "🎉 Docker image is ready for deployment"

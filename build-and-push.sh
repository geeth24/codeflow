#!/bin/bash
set -e

REGISTRY="registry.rsft.co"
IMAGE_TAG=${1:-latest}

echo "🚀 Building and Pushing CodeFlow Images"
echo "=========================================="
echo "Tag: $IMAGE_TAG"
echo "Platform: linux/amd64"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

cd "$PROJECT_DIR"

if [ ! -f "server/Dockerfile" ] || [ ! -f "client/Dockerfile" ] || [ ! -f "runners/node/Dockerfile" ]; then
  echo "❌ Error: Required Dockerfiles not found."
  exit 1
fi

echo "📁 Project directory: $PROJECT_DIR"
echo ""

# Backend
echo "🔨 Building Backend..."
docker build \
  --platform linux/amd64 \
  --progress=plain \
  --cache-from ${REGISTRY}/codeflow/backend:latest \
  -t ${REGISTRY}/codeflow/backend:${IMAGE_TAG} \
  -f server/Dockerfile \
  ./server
echo "🚀 Pushing Backend..."
docker push ${REGISTRY}/codeflow/backend:${IMAGE_TAG}
echo "✅ Backend done"
echo ""

# Runner Node
echo "🔨 Building Runner Node..."
docker build \
  --platform linux/amd64 \
  --progress=plain \
  --cache-from ${REGISTRY}/codeflow/runner-node:latest \
  -t ${REGISTRY}/codeflow/runner-node:${IMAGE_TAG} \
  -f runners/node/Dockerfile \
  ./runners/node
echo "🚀 Pushing Runner Node..."
docker push ${REGISTRY}/codeflow/runner-node:${IMAGE_TAG}
echo "✅ Runner Node done"
echo ""

# Frontend
echo "🔨 Building Frontend..."
docker build \
  --platform linux/amd64 \
  --progress=plain \
  --cache-from ${REGISTRY}/codeflow/frontend:latest \
  -t ${REGISTRY}/codeflow/frontend:${IMAGE_TAG} \
  -f client/Dockerfile \
  ./client
echo "🚀 Pushing Frontend..."
docker push ${REGISTRY}/codeflow/frontend:${IMAGE_TAG}
echo "✅ Frontend done"
echo ""

echo "=========================================="
echo "✅ All images built and pushed successfully!"
echo ""
echo "Images pushed:"
echo "  • ${REGISTRY}/codeflow/backend:${IMAGE_TAG}"
echo "  • ${REGISTRY}/codeflow/runner-node:${IMAGE_TAG}"
echo "  • ${REGISTRY}/codeflow/frontend:${IMAGE_TAG}"
echo ""
echo "Deploy with:"
echo "  helm upgrade --install codeflow ./helm/codeflow-chart -n default"

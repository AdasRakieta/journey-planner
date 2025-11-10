#!/bin/bash
# Build Docker images natively on Raspberry Pi (ARM64)
# This avoids QEMU emulation issues during npm install

set -e  # Exit on error

echo "🏗️  Building Journey Planner Docker images for ARM64 (Raspberry Pi)"
echo ""

# Check if running on ARM64
ARCH=$(uname -m)
if [ "$ARCH" != "aarch64" ] && [ "$ARCH" != "arm64" ]; then
    echo "⚠️  Warning: This script is designed for ARM64/aarch64 architecture"
    echo "   Current architecture: $ARCH"
    echo "   Continue anyway? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Get git commit SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD)
REGISTRY="ghcr.io"
IMAGE_OWNER="adasrakieta"
REPO_NAME="journey-planner"

echo "📦 Building backend image..."
docker build \
    --platform linux/arm64 \
    --build-arg NODE_ENV=production \
    -t ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:latest \
    -t ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:sha-${GIT_SHA} \
    -t ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:arm64 \
    -f server/Dockerfile \
    ./server

echo ""
echo "🎨 Building frontend image..."
docker build \
    --platform linux/arm64 \
    --build-arg VITE_API_URL=http://localhost:5001/api \
    -t ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:latest \
    -t ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:sha-${GIT_SHA} \
    -t ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:arm64 \
    -f client/Dockerfile \
    ./client

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Built images:"
echo "  - ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:latest"
echo "  - ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:arm64"
echo "  - ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:latest"
echo "  - ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:arm64"
echo ""
echo "🚀 To push to GitHub Container Registry:"
echo "  docker login ghcr.io -u ${IMAGE_OWNER}"
echo "  docker push ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:latest"
echo "  docker push ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/backend:arm64"
echo "  docker push ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:latest"
echo "  docker push ${REGISTRY}/${IMAGE_OWNER}/${REPO_NAME}/frontend:arm64"
echo ""
echo "💡 Or use docker-compose to start locally without pushing:"
echo "  docker-compose up -d"

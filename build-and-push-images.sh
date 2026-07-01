#!/usr/bin/env bash

# Build frontend/backend images locally or in CI, then push them to a registry.
# Usage:
#   BACKEND_IMAGE=registry.example.com/ns/short-video-backend:latest \
#   FRONTEND_IMAGE=registry.example.com/ns/short-video-frontend:latest \
#   ./build-and-push-images.sh

set -euo pipefail

: "${BACKEND_IMAGE:?BACKEND_IMAGE is required}"
: "${FRONTEND_IMAGE:?FRONTEND_IMAGE is required}"

NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org/}"

if ! docker info >/dev/null 2>&1; then
    echo "错误: Docker 未运行或未安装"
    exit 1
fi

echo "Building backend image: ${BACKEND_IMAGE}"
docker build \
    --build-arg "NPM_REGISTRY=${NPM_REGISTRY}" \
    -t "${BACKEND_IMAGE}" \
    ./backend

echo "Building frontend image: ${FRONTEND_IMAGE}"
docker build \
    --build-arg "NPM_REGISTRY=${NPM_REGISTRY}" \
    -t "${FRONTEND_IMAGE}" \
    ./frontend

echo "Pushing backend image..."
docker push "${BACKEND_IMAGE}"

echo "Pushing frontend image..."
docker push "${FRONTEND_IMAGE}"

echo "Done."
echo "Use these values on the server:"
echo "BACKEND_IMAGE=${BACKEND_IMAGE}"
echo "FRONTEND_IMAGE=${FRONTEND_IMAGE}"

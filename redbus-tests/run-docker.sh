#!/usr/bin/env bash

# Helper script to manage Docker container execution for RedBus Playwright Tests

IMAGE_NAME="redbus-playwright-tests"

echo "🐳 RedBus Playwright Docker Test Runner"
echo "----------------------------------------"

build_image() {
  echo "🔨 Building Docker image '${IMAGE_NAME}'..."
  docker build -t ${IMAGE_NAME} .
}

ACTION="${1:-test}"

case "$ACTION" in
  build)
    build_image
    ;;
  test)
    echo "🚀 Executing Playwright tests in Docker..."
    docker run --rm --ipc=host \
      -v "$(pwd)/test-results:/app/test-results" \
      -v "$(pwd)/playwright-report:/app/playwright-report" \
      ${IMAGE_NAME} npx playwright test "${@:2}"
    ;;
  smoke)
    echo "🔥 Executing @smoke test suite in Docker..."
    docker run --rm --ipc=host \
      -v "$(pwd)/playwright-report:/app/playwright-report" \
      ${IMAGE_NAME} npm run test:smoke "${@:2}"
    ;;
  heal)
    echo "🤖 Executing AI Self-Healing diagnostic CLI in Docker..."
    docker run --rm --ipc=host \
      -v "$(pwd)/test-results:/app/test-results" \
      ${IMAGE_NAME} npm run heal
    ;;
  *)
    echo "⚡ Executing custom command in Docker: $@"
    docker run --rm --ipc=host \
      -v "$(pwd)/test-results:/app/test-results" \
      -v "$(pwd)/playwright-report:/app/playwright-report" \
      ${IMAGE_NAME} "$@"
    ;;
esac

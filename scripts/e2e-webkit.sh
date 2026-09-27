#!/bin/sh
# Runs the e2e suite in WebKit (the iPhone engine) inside Playwright's
# official Ubuntu image, which ships WebKit and its system libraries.
# Mounts the repo at its own path so worktrees (node_modules symlinked to
# the main checkout) resolve; runs as the current user so test-results
# stay owned by you. Extra args go to `playwright test`.
set -eu
IMAGE="mcr.microsoft.com/playwright:v$(node -p "require('@playwright/test/package.json').version")-noble"
REPO="$(git rev-parse --path-format=absolute --git-common-dir | sed 's#/\.git$##')"
exec docker run --rm --network host --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI="${CI:-}" \
  -v "$REPO:$REPO" -w "$PWD" \
  "$IMAGE" npx playwright test --project=webkit-iphone "$@"

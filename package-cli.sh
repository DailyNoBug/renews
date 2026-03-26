#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
BUILD_ROOT="$ROOT_DIR/.packaging"
HELPER_SCRIPT="$ROOT_DIR/scripts/prepare-cli-package.mjs"

usage() {
  cat <<'EOF'
Usage:
  ./package-cli.sh [all|mac|linux|darwin-arm64|darwin-x64|linux-x64|linux-arm64]

Examples:
  ./package-cli.sh mac
  ./package-cli.sh linux
  ./package-cli.sh all

Notes:
  - mac packages are built locally and require the current host arch to match the target arch.
  - linux packages are built in Docker so that native dependencies are installed for Linux.
  - output archives are written to ./artifacts
EOF
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

ensure_docker_ready() {
  require_cmd docker
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is installed but the daemon is not running. Start Docker Desktop or the Docker daemon, then retry." >&2
    exit 1
  fi
}

host_arch() {
  local raw
  raw="$(uname -m)"
  case "$raw" in
    arm64|aarch64) echo "arm64" ;;
    x86_64|amd64) echo "x64" ;;
    *)
      echo "Unsupported host architecture: $raw" >&2
      exit 1
      ;;
  esac
}

resolve_targets() {
  local request="$1"
  local mac_target="darwin-$(host_arch)"

  case "$request" in
    all)
      printf '%s\n' "$mac_target" "linux-x64"
      ;;
    mac)
      printf '%s\n' "$mac_target"
      ;;
    linux)
      printf '%s\n' "linux-x64"
      ;;
    darwin-arm64|darwin-x64|linux-x64|linux-arm64)
      printf '%s\n' "$request"
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown target: $request" >&2
      usage
      exit 1
      ;;
  esac
}

ensure_mac_target_supported() {
  local target_arch="$1"
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "macOS package targets must be built on a macOS host." >&2
    exit 1
  fi
  if [[ "$(host_arch)" != "$target_arch" ]]; then
    echo "Cannot build darwin-$target_arch on this host. Current host arch is $(host_arch)." >&2
    exit 1
  fi
}

docker_platform_for_target() {
  case "$1" in
    linux-x64) echo "linux/amd64" ;;
    linux-arm64) echo "linux/arm64/v8" ;;
    *)
      echo "Unsupported linux target: $1" >&2
      exit 1
      ;;
  esac
}

install_runtime_deps() {
  local target="$1"
  local stage_dir="$2"

  if [[ "$target" == linux-* ]]; then
    ensure_docker_ready
    local docker_platform
    docker_platform="$(docker_platform_for_target "$target")"
    docker run --rm \
      --platform "$docker_platform" \
      -v "$stage_dir:/work" \
      -w /work \
      node:22-bookworm \
      bash -lc 'npm install --omit=dev --no-package-lock --legacy-peer-deps'
    return
  fi

  local target_arch="${target#darwin-}"
  ensure_mac_target_supported "$target_arch"
  (
    cd "$stage_dir"
    npm install --omit=dev --no-package-lock --legacy-peer-deps
  )
}

main() {
  local requested_target="${1:-all}"
  require_cmd node
  require_cmd pnpm
  require_cmd npm
  require_cmd tar

  mkdir -p "$ARTIFACTS_DIR" "$BUILD_ROOT"

  echo "==> Building project"
  (
    cd "$ROOT_DIR"
    pnpm build
  )

  targets=()
  while IFS= read -r target_line; do
    targets+=("$target_line")
  done < <(resolve_targets "$requested_target")

  for target in "${targets[@]}"; do
    local archive_target="$target"
    local package_name="renews-agent-cli-$archive_target"
    local package_dir="$BUILD_ROOT/$archive_target/$package_name"
    local archive_path="$ARTIFACTS_DIR/$package_name.tar.gz"

    echo "==> Preparing package for $target"
    node "$HELPER_SCRIPT" init "$package_dir" "$target"
    install_runtime_deps "$target" "$package_dir"
    node "$HELPER_SCRIPT" populate "$package_dir" "$target"

    echo "==> Creating archive $archive_path"
    mkdir -p "$(dirname "$archive_path")"
    tar -C "$BUILD_ROOT/$archive_target" -czf "$archive_path" "$package_name"
  done

  echo "==> Done"
  echo "Artifacts:"
  ls -1 "$ARTIFACTS_DIR"
}

main "$@"

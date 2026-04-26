#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/src/frontend"
BACKEND_DIR="$ROOT_DIR/src"
CACHE_DIR="$ROOT_DIR/.cache"

mkdir -p "$CACHE_DIR/matplotlib" "$CACHE_DIR/fontconfig"
export MPLCONFIGDIR="$CACHE_DIR/matplotlib"
export XDG_CACHE_HOME="$CACHE_DIR"

if [[ -f "$ROOT_DIR/.venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.venv/bin/activate"
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev] starting backend on http://127.0.0.1:8000"
(cd "$BACKEND_DIR" && uvicorn main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

echo "[dev] starting frontend on http://127.0.0.1:5173"
(cd "$FRONTEND_DIR" && npm run dev -- --host 127.0.0.1 --port 5173) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"

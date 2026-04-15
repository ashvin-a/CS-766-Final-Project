#!/usr/bin/env bash
# Run diffusion script with the project venv (has diffusers, torch, huggingface_hub, etc.).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/.venv/bin/python" "$ROOT/src/diffusion/text_to_image.py" "$@"

#!/usr/bin/env bash
# Editable install of huggingface/diffusers for use from src/diffusion/ (e.g. text_to_image.py).
# Does not modify any Python files under src/.
#
# Prerequisite: uv — https://docs.astral.sh/uv/
# Recommended: activate a venv that already has torch (see repo requirements.txt), then run:
#   bash scripts/install-diffusers-editable.sh
#
# Equivalent manual steps:
#   git clone https://github.com/huggingface/diffusers.git vendor/diffusers
#   uv pip install -e "vendor/diffusers[torch]"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENDOR_DIR="$ROOT/vendor"
TARGET="$VENDOR_DIR/diffusers"
REPO="https://github.com/huggingface/diffusers.git"

if ! command -v uv >/dev/null 2>&1; then
  echo "error: uv is not on PATH. Install: https://docs.astral.sh/uv/" >&2
  exit 1
fi

mkdir -p "$VENDOR_DIR"

if [[ -d "$TARGET/.git" ]]; then
  echo "Updating existing clone: $TARGET"
  git -C "$TARGET" pull --ff-only
else
  echo "Cloning into: $TARGET"
  git clone "$REPO" "$TARGET"
fi

echo "Installing editable diffusers with [torch] extra into the active environment..."
# Same as: cd diffusers && uv pip install -e ".[torch]"
uv pip install -e "${TARGET}[torch]"

if command -v python >/dev/null 2>&1; then
  python -c "import diffusers; print('OK: diffusers', getattr(diffusers, '__version__', ''))" || {
    echo "warning: import check failed — ensure your venv is activated and torch is installed." >&2
  }
else
  echo "warning: python not found on PATH; skip import check." >&2
fi

echo "Done."

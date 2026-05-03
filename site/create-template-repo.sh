#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# create-template-repo.sh
#
# Publishes the site/ directory as a standalone GitHub template repository.
# Prerequisites: git, gh (GitHub CLI, https://cli.github.com), npm
#
# Usage:
#   chmod +x site/create-template-repo.sh
#   cd <repo-root>
#   ./site/create-template-repo.sh [REPO_NAME] [GITHUB_USER]
#
# Defaults:
#   REPO_NAME   = prompt-to-vision-site
#   GITHUB_USER = detected from `gh api user`
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_NAME="${1:-prompt-to-vision-site}"
GITHUB_USER="${2:-$(gh api user --jq .login 2>/dev/null || echo "")}"

if [[ -z "$GITHUB_USER" ]]; then
  echo "❌  Could not detect GitHub username. Run: gh auth login"
  echo "    Then re-run this script, or pass your username as the second argument."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMPDIR_NAME="$(mktemp -d)"

echo "┌──────────────────────────────────────────────────────"
echo "│  Creating template repo: ${GITHUB_USER}/${REPO_NAME}"
echo "│  Staging area          : ${TMPDIR_NAME}"
echo "└──────────────────────────────────────────────────────"

# ── 1. Copy site/ contents into a clean temp dir ──────────────────────────────
cp -r "${SCRIPT_DIR}/." "${TMPDIR_NAME}/"
rm -rf "${TMPDIR_NAME}/node_modules" "${TMPDIR_NAME}/dist" "${TMPDIR_NAME}/.git"
# Remove this script from the template to keep it clean
rm -f "${TMPDIR_NAME}/create-template-repo.sh"

# ── 2. Patch sections.json template URLs to point at the new repo ─────────────
TEMPLATE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}"
if command -v python3 &>/dev/null; then
  python3 - <<PY
import json, pathlib
p = pathlib.Path("${TMPDIR_NAME}/src/data/sections.json")
d = json.loads(p.read_text())
d["githubUrl"] = "${TEMPLATE_URL}"
d["templateRepoUrl"] = "${TEMPLATE_URL}"
p.write_text(json.dumps(d, indent=2) + "\n")
PY
fi

# ── 3. Write a clean standalone README for the template ───────────────────────
cat > "${TMPDIR_NAME}/README.md" <<'TMPL_README'
# Prompt → Vision — product site template

A 3-D guided-tour product site built with **Vite + React + React Three Fiber**.

## Features

- Full-screen 3D canvas (UV shader sphere, beacon markers, wave floor)
- Cinematic follow-cam that flies between section stops
- Fixed sidebar navigation with pause / restart controls
- GitHub repo link + one-click deploy-guide modal
- Single JSON file drives all copy, sections, and links
- GitHub Actions workflow for automatic Pages deployment

## Quick start

```bash
npm install
npm run dev            # dev server on http://localhost:5173
npm run build          # production build → dist/
```

## Customise content

Edit **`src/data/sections.json`** — all text, code blocks, section order, and repo URLs live there. Adding or removing objects from `sections[]` automatically adjusts the 3D tour stops.

## Deploy to GitHub Pages

1. Fork / use this template to create your repository.
2. In your repo: **Settings → Pages → Source → GitHub Actions**.
3. Push to `main`.  
   The workflow (`/.github/workflows/product-site-pages.yml`) builds `site/`  
   and deploys `dist/` automatically.
4. Your site goes live at `https://<user>.github.io/<repo>/`.

> The workflow passes `VITE_BASE=/<repo>/` at build time so asset paths are correct for project-site URLs.
TMPL_README

# ── 4. Init git and create the GitHub repo ────────────────────────────────────
cd "${TMPDIR_NAME}"
git init -b main
git add .
git commit -m "chore: init prompt-to-vision-site template"

echo ""
echo "Creating GitHub repository ${GITHUB_USER}/${REPO_NAME} …"
gh repo create "${GITHUB_USER}/${REPO_NAME}" \
  --public \
  --description "3D guided-tour product site template — Vite + React Three Fiber + GitHub Pages" \
  --source . \
  --push \
  --remote origin

echo ""
echo "✅  Done! Template repo: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo "Next steps:"
echo "  1. Visit https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/pages"
echo "     and set Source → GitHub Actions"
echo "  2. Push any change to trigger the first Pages deployment"
echo "  3. Mark the repo as a template: Settings → check 'Template repository'"
echo ""
echo "Cleaning up …"
rm -rf "${TMPDIR_NAME}"

# Prompt → Vision — product microsite

Self-contained **Vite + React + React Three Fiber** 3D tour page.  
All assets live under `site/` so the rest of the repository is untouched.

---

## Local preview

```bash
cd site
npm install
npm run dev          # http://localhost:5173
```

## Production build

```bash
cd site
npm run build        # output → site/dist/
```

---

## Deploy to GitHub Pages (this repo)

1. Go to **Settings → Pages** in the repository.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Push any change under `site/` (or the workflow file) to `main`.  
   The workflow (`.github/workflows/product-site-pages.yml`) builds `site/`  
   and uploads `dist/` as the Pages artifact automatically.
4. Live URL: `https://suramypidara.github.io/CS-766-Final-Project/`

> The workflow passes `VITE_BASE=/<repo>/` at build time — asset paths are correct for project-site URLs without any manual configuration.

---

## Create a standalone template repository

The site is self-contained and can be published as its own GitHub template.

### Option A — automated (recommended)

Requires [GitHub CLI](https://cli.github.com) (`gh`):

```bash
# From the repository root:
./site/create-template-repo.sh [REPO_NAME] [GITHUB_USER]

# Example:
./site/create-template-repo.sh prompt-to-vision-site suramypidara
```

The script:
1. Copies `site/` to a temp directory (strips `node_modules`, `dist`, `.git`)
2. Patches `sections.json` URLs to point at the new repo
3. Creates a public GitHub repo via `gh repo create`
4. Pushes the initial commit

### Option B — manual

```bash
# 1. Clone this repo and isolate site/ as its own project
git clone https://github.com/suramypidara/CS-766-Final-Project tmp-site
cp -r tmp-site/site prompt-to-vision-site
cd prompt-to-vision-site
rm -rf .git node_modules dist

# 2. Initialise fresh git history
git init -b main
git add .
git commit -m "chore: init product-site template"

# 3. Create the GitHub repo (using gh CLI)
gh repo create suramypidara/prompt-to-vision-site \
  --public \
  --description "3D tour product site — Vite + React Three Fiber" \
  --source . \
  --push

# 4. Enable Pages: Settings → Pages → Source → GitHub Actions
# 5. Mark it as a template: Settings → check "Template repository"
```

---

## Customise content

Edit **`src/data/sections.json`** — that single file controls:

| Key | Effect |
|---|---|
| `tagline` | Hero text in the intro splash |
| `subtitle` | Sidebar sub-heading |
| `githubUrl` | Link target for the sidebar GitHub button |
| `templateRepoUrl` | Link target inside the deploy-guide modal |
| `sections[]` | Tour stops (title, body, code block, image caption) |
| `thankYou` | Final stop title, body, signature |

Adding or removing objects in `sections[]` automatically adjusts 3D beacon positions and the sidebar list.

Tour pacing constants live in `src/App.tsx` (`INTRO_MS`, `TOUR_DURATION_MS`).

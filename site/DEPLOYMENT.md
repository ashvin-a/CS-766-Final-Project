# Deployment Guide — Prompt → Vision product site

## 1. Deploy this repo to GitHub Pages

### One-time setup

1. Go to your repository on GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

That's it. No further configuration is needed.

### How it works

The workflow at `.github/workflows/product-site-pages.yml` triggers on every push to `main` that touches files under `site/` (or the workflow file itself). It:

1. Installs Node 20 and runs `npm ci` inside `site/`.
2. Runs `npm run build` with `VITE_BASE=/<repo-name>/` so asset paths are correct for project-page URLs.
3. Uploads `site/dist/` as a Pages artifact and deploys it.

After the Actions run completes (≈ 90 seconds), the site is live at:

```
https://suramypidara.github.io/CS-766-Final-Project/
```

### Trigger a deployment

Any commit that changes a file under `site/` will trigger the workflow. To force a deploy without a content change:

```bash
git commit --allow-empty -m "chore: trigger pages deploy"
git push
```

---

## 2. Create the standalone template repository

The `site/` directory is entirely self-contained and can be published as its own GitHub template repo that anyone can fork.

### Option A — automated script (recommended)

Requires [GitHub CLI](https://cli.github.com):

```bash
# Install gh if needed
brew install gh
gh auth login

# From the repository root:
./site/create-template-repo.sh prompt-to-vision-site suramypidara
```

The script:
- Copies `site/` to a temp directory (strips `node_modules`, `dist`, `.git`)
- Patches `sections.json` so its URLs point at the new repo
- Creates the public GitHub repo via `gh repo create`
- Pushes an initial commit

### Option B — manual steps

```bash
# 1. Copy site/ into a new directory
cp -r site prompt-to-vision-site
cd prompt-to-vision-site
rm -rf .git node_modules dist

# 2. Initialise a fresh git history
git init -b main
git add .
git commit -m "chore: init product-site template"

# 3. Create the GitHub repo and push
gh repo create suramypidara/prompt-to-vision-site \
  --public \
  --description "3D tour product site — Vite + React Three Fiber" \
  --source . \
  --push
```

### After creating the template repo

1. **Enable Pages** on the new repo: Settings → Pages → Source → GitHub Actions.
2. **Mark as template**: Settings → scroll down → check **Template repository**.  
   This adds a "Use this template" button to the repo homepage.
3. The `vite.config.ts` already reads `VITE_BASE` from the environment, so the workflow works for any repo name without modification.

---

## 3. Using the template (for others)

1. Click **Use this template → Create a new repository** on `github.com/suramypidara/prompt-to-vision-site`.
2. Clone the new repo locally.
3. Edit `src/data/sections.json` — all copy, code blocks, section order, and the GitHub link live there.
4. Enable Pages (Settings → Pages → Source → GitHub Actions).
5. Push to `main` — the site deploys automatically.

---

## 4. Customising content

| Field in `sections.json` | What it controls |
|---|---|
| `tagline` | Hero text on the intro splash |
| `subtitle` | Sub-heading in the sidebar |
| `githubUrl` | URL of the "View on GitHub" sidebar link |
| `templateRepoUrl` | (reserved — no longer shown in UI) |
| `sections[]` | Tour stops: title, body text, code block, image caption |
| `thankYou` | Final stop: title, body, signature line |

Adding or removing objects in `sections[]` automatically adjusts 3D beacon positions and the sidebar navigation list.

Tour timing constants are in `src/App.tsx`:

```ts
const INTRO_MS = 3500          // intro splash duration
const TOUR_DURATION_MS = 40000 // full auto-tour duration
```

# Prompt-to-Model Frontend

A polished, production-quality frontend for the **Prompt-to-Model** computer vision project. Turn natural-language instructions into fine-tuned image classification models.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 6** for fast dev and builds
- **Tailwind CSS** for styling
- **shadcn/ui** (Radix primitives)
- **lucide-react** icons
- **Framer Motion** for animations
- **React Three Fiber** + **drei** for hero background
- **Recharts** for charts
- **React Router** for navigation

## Setup

```bash
cd src/frontend
npm install
npm run dev
```

Runs at [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # shadcn/ui primitives
│   ├── AppShell.tsx
│   ├── HeroCanvas.tsx
│   ├── PromptForm.tsx
│   ├── ModelSelector.tsx
│   ├── FileUploadZone.tsx
│   ├── PipelineStepper.tsx
│   ├── ParsedPromptPreview.tsx
│   ├── DatasetGallery.tsx
│   ├── TrainingRunCard.tsx
│   └── MetricsPanel.tsx
├── pages/            # Route pages
├── data/             # Mock data
├── lib/              # Utils, API placeholders
├── hooks/            # useTheme, etc.
└── types/            # TypeScript types
```

## Backend Integration

API placeholders live in `src/lib/api.ts`. Wire these to your backend:

- `submitNewRun` → `POST /runs`
- `parsePrompt` → `POST /parse-prompt`
- `getPipelineStatus` → `GET /runs/:id/pipeline`
- `getTrainingRuns` → `GET /runs`
- `getRunResult` → `GET /runs/:id/result`
- `getBackendHealth` → `GET /health`

Set `VITE_API_BASE` in `.env` for API base URL.

## Features

- **Dashboard** – Hero, pipeline overview, Start New Run / Load Example
- **New Run** – Full form with prompt, model selector, file uploads, data source toggles, advanced settings
- **Demo presets** – Tomato leaves, concrete crack detection
- **Dataset Studio** – Class distribution, image gallery with source tags
- **Training Runs** – Run cards with status, metrics, loss charts
- **Results** – Final metrics, download link, comparison chart
- **Settings** – API URL, model provider, notifications
- **Theme** – Dark/light/system with persistence
- **Responsive** – Sidebar on desktop, sheet menu on mobile

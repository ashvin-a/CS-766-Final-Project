/**
 * API placeholder functions - wire these to backend endpoints when available.
 * Sample routes: POST /runs, GET /runs/:id, GET /runs/:id/pipeline, etc.
 */

import type { NewRunFormData, ParsedPrompt, TrainingRun, RunResult } from "@/types"
import {
  MOCK_PARSED_PROMPT,
  MOCK_PIPELINE_PROGRESS,
  MOCK_TRAINING_RUNS,
  MOCK_RUN_RESULT,
  DEMO_PRESETS,
} from "@/data/mockData"

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000"

export async function submitNewRun(data: NewRunFormData): Promise<{ runId: string }> {
  const res = await fetch(`${API_BASE}/run/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_prompt: data.prompt }),
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.message ?? "Run failed")
  }
  return { runId: "run-" + Date.now() }
}

export async function parsePrompt(prompt: string): Promise<ParsedPrompt> {
  // TODO: POST ${API_BASE}/parse-prompt
  await delay(500)
  const preset = DEMO_PRESETS.find((p) => prompt.toLowerCase().includes(p.name.split(" ")[0]))
  if (preset) {
    return {
      classes: [...preset.classes],
      searchPrompts: [...preset.searchPrompts],
      diffusionPrompts: [...preset.diffusionPrompts],
      confidence: 0.9,
    }
  }
  return MOCK_PARSED_PROMPT
}

export async function getPipelineStatus(_runId: string) {
  // TODO: GET ${API_BASE}/runs/${_runId}/pipeline
  await delay(300)
  return MOCK_PIPELINE_PROGRESS
}

export async function getTrainingRuns(): Promise<TrainingRun[]> {
  // TODO: GET ${API_BASE}/runs
  await delay(400)
  return MOCK_TRAINING_RUNS
}

export async function getRunResult(_runId: string): Promise<RunResult | null> {
  // TODO: GET ${API_BASE}/runs/${runId}/result
  await delay(300)
  if (_runId === "run-001") return MOCK_RUN_RESULT
  return null
}

export async function getBackendHealth(): Promise<{ status: string; gpuAvailable?: boolean }> {
  // TODO: GET ${API_BASE}/health
  await delay(100)
  return { status: "ok", gpuAvailable: true }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
console.log("API loaded")
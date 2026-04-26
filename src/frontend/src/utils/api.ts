/**
 * API placeholder functions - wire these to backend endpoints when available.
 * Sample routes: POST /runs, GET /runs/:id, GET /runs/:id/pipeline, etc.
 */

import type {
  NewRunFormData,
  NewRunFormJsonPayload,
  ParsedPrompt,
  TrainingRun,
  RunResult,
} from "@/types"
import {
  MOCK_PARSED_PROMPT,
  MOCK_PIPELINE_PROGRESS,
  MOCK_TRAINING_RUNS,
  MOCK_RUN_RESULT,
  DEMO_PRESETS,
} from "@/data/mockData"

//const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000"
const API_BASE = "http://localhost:8000"
/** POST target for the new-run form JSON. Override with VITE_SAMPLE_RUN_URL in .env */

//change this line to connect to the bin "https://httpbin.org/post" or local host or vite
const SAMPLE_RUN_URL =
  import.meta.env.VITE_SAMPLE_RUN_URL ??"http://localhost:8000/run"
const RESULTS_URL = `${API_BASE}/test/`

const LATEST_RUN_ID_KEY = "latestRunId"
const RESULTS_READY_KEY = "resultsReady"
const RESULTS_CACHE_KEY = "latestRunResult"

export class SubmitRunError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown
  ) {
    super(message)
    this.name = "SubmitRunError"
  }
}

export function buildNewRunJsonPayload(data: NewRunFormData): NewRunFormJsonPayload {
  return {
    prompt: data.prompt,
    email: data.email,
    model: data.model,
    dataSources: data.dataSources,
    advanced: data.advanced,
  }
}

/**
 * POST full form as JSON (file metadata only) to a sample URL.
 * Set VITE_SAMPLE_RUN_URL to your own endpoint; default echoes via httpbin.
 */
export async function submitSampleRunConfiguration(
  data: NewRunFormData
): Promise<{ runId: string; message?: string }> {
  const payload = buildNewRunJsonPayload(data)
  let res: Response
  try {
    res = await fetch(SAMPLE_RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw new SubmitRunError(
      e instanceof Error ? `Network error: ${e.message}` : "Network error: could not reach server",
      undefined,
      e
    )
  }

  const rawText = await res.text()
  let parsed: Record<string, unknown> = {}
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>
    } catch {
      throw new SubmitRunError(
        `Server returned non-JSON response (${res.status})`,
        res.status,
        rawText
      )
    }
  }

  if (!res.ok) {
    const detail = parsed.detail ?? parsed.message ?? parsed.error
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d))).join("; ")
          : `Request failed (${res.status} ${res.statusText})`
    throw new SubmitRunError(msg, res.status, parsed)
  }

  if (parsed.success === false) {
    throw new SubmitRunError(String(parsed.message ?? "Server reported failure"), res.status, parsed)
  }

  const runId =
    typeof parsed.runId === "string"
      ? parsed.runId
      : typeof parsed.id === "string"
        ? parsed.id
        : `run-${Date.now()}`
  return {
    runId,
    message:
      typeof parsed.message === "string"
        ? parsed.message
        : "Request delivered to sample endpoint.",
  }
}

/** Legacy full pipeline run (prompt + model + source toggles). */
export async function submitNewRun(
  data: NewRunFormData
): Promise<{ runId: string; message?: string }> {
  const sourceFlags = {
    web_scraping: data.dataSources.webScraping,
    diffusion: data.dataSources.syntheticGeneration,
    augmentation: data.dataSources.augmentation,
    clip_filter: data.dataSources.clipFiltering,
  }

  const res = await fetch(`${API_BASE}/run/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_prompt: data.prompt,
      model: data.model,
      ...sourceFlags,
      dataSources: data.dataSources,
    }),
  })
  const json = (await res.json()) as { success?: boolean; message?: string }
  if (!res.ok || json.success === false) {
    throw new SubmitRunError(json.message ?? res.statusText ?? "Run failed", res.status, json)
  }
  return {
    runId: "run-" + Date.now(),
    message: typeof json.message === "string" ? json.message : undefined,
  }
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

function parseMaybePercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1 ? value / 100 : value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed > 1 ? parsed / 100 : parsed
    }
  }
  return null
}

export async function getRunResult(runId: string): Promise<RunResult | null> {
  let res: Response
  try {
    // Backend currently exposes /test/ for result payload.
    res = await fetch(RESULTS_URL, { method: "GET" })
  } catch {
    return runId === "run-001" ? MOCK_RUN_RESULT : null
  }

  if (!res.ok) {
    return runId === "run-001" ? MOCK_RUN_RESULT : null
  }

  let body: Record<string, unknown>
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    return runId === "run-001" ? MOCK_RUN_RESULT : null
  }

  const hasResultShape =
    body.success === true &&
    Array.isArray(body.baseline_cm) &&
    Array.isArray(body.finetuned_cm) &&
    body.code === 200

  if (!hasResultShape) {
    return runId === "run-001" ? MOCK_RUN_RESULT : null
  }

  const baseline = parseMaybePercent(body.baseline_accuracy)
  const finetuned = parseMaybePercent(body.finetune_accuracy)
  if (baseline == null || finetuned == null) {
    return runId === "run-001" ? MOCK_RUN_RESULT : null
  }

  return {
    runId,
    baselineAccuracy: baseline,
    finalAccuracy: finetuned,
    baselineConfusionMatrix: body.baseline_cm as number[][],
    finetunedConfusionMatrix: body.finetuned_cm as number[][],
    confusionMatrix: body.finetuned_cm as number[][],
    emailSent: false,
  }
}

export function markRunSubmitted(runId: string) {
  localStorage.setItem(LATEST_RUN_ID_KEY, runId)
  localStorage.setItem(RESULTS_READY_KEY, "false")
}

export function markRunResultReady(result: RunResult) {
  localStorage.setItem(RESULTS_READY_KEY, "true")
  localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(result))
}

export function getCachedRunResult(): RunResult | null {
  const raw = localStorage.getItem(RESULTS_CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RunResult
  } catch {
    return null
  }
}

export function getLatestRunId(): string | null {
  return localStorage.getItem(LATEST_RUN_ID_KEY)
}

export function isResultReady(): boolean {
  return localStorage.getItem(RESULTS_READY_KEY) === "true"
}

export async function getBackendHealth(): Promise<{ status: string; gpuAvailable?: boolean }> {
  // TODO: GET ${API_BASE}/health
  await delay(100)
  return { status: "ok", gpuAvailable: true }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
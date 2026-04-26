/**
 * API helpers for the Prompt-to-Model frontend.
 *
 * Backend contract (FastAPI on http://localhost:8000):
 *   POST /run/   – run the full data + training pipeline. Body: NewRunFormData
 *                  + flattened source toggles. Returns
 *                  { classes, code, confidence, total_time, ... } on success.
 *   POST /test/  – run evaluation against the latest finetuned model. Returns
 *                  { success, baseline_cm, finetuned_cm, baseline_accuracy,
 *                    finetune_accuracy, message, code }.
 *
 * Mock data is only used for development presets / explicit sample mode and
 * NEVER as a silent fallback when a real run is requested.
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
  DEMO_PRESETS,
} from "@/data/mockData"

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000"
const RUN_URL = `${API_BASE}/run/`
const RESULTS_URL = `${API_BASE}/test/`
const SAMPLE_RUN_URL =
  (import.meta.env.VITE_SAMPLE_RUN_URL as string | undefined) ?? RUN_URL

const LATEST_RUN_ID_KEY = "latestRunId"
const RESULTS_READY_KEY = "resultsReady"
const RESULTS_CACHE_KEY = "latestRunResult"
const RESULTS_POLLING_ENABLED_KEY = "resultsPollingEnabled"
const RUN_PHASE_KEY = "runPhase"
const RUN_ERROR_KEY = "runError"
const RUN_DATA_SOURCES_KEY = "runDataSources"
const RUN_STARTED_AT_KEY = "runStartedAt"
const POLLING_STARTED_AT_KEY = "runPollingStartedAt"

export type RunPhase = "idle" | "running" | "success" | "error" | "completed"

/** Maximum time we poll /test/ before declaring the run failed. */
export const POLL_TIMEOUT_MS = 75_000

/** Custom event fired whenever any run-state localStorage key is mutated. */
export const RUN_STATE_EVENT = "runstatechange"

function notifyRunStateChange() {
  if (typeof window === "undefined") return
  try {
    window.dispatchEvent(new Event(RUN_STATE_EVENT))
  } catch {
    /* SSR / non-browser environments — ignore */
  }
}

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

export interface SubmitRunResult {
  runId: string
  message?: string
  /** Parsed JSON body returned by the backend (when shape is recognized). */
  response?: {
    classes?: string[]
    code?: number
    confidence?: number
    total_time?: number
    [key: string]: unknown
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

/** Build the exact wire payload expected by backend /run/. */
function buildBackendRunPayload(data: NewRunFormData) {
  return {
    prompt: data.prompt,
    email: data.email,
    model: data.model,
    dataSources: {
      // Backend requires scraping path on; always send true.
      webScraping: true,
      syntheticGeneration: data.dataSources.syntheticGeneration,
      augmentation: data.dataSources.augmentation,
      clipFiltering: data.dataSources.clipFiltering,
    },
    advanced: {
      datasetSizeTarget: data.advanced.datasetSizeTarget,
      augmentationStrength: data.advanced.augmentationStrength,
      clipThreshold: data.advanced.clipThreshold,
      freezeBackbone: data.advanced.freezeBackbone,
      epochs: data.advanced.epochs,
      batchSize: data.advanced.batchSize,
      learningRate: data.advanced.learningRate,
      deliveryFormat: data.advanced.deliveryFormat,
    },
  }
}

async function postJson(url: string, payload: unknown) {
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw new SubmitRunError(
      e instanceof Error
        ? `Network error: ${e.message}. Is the API running on ${API_BASE}?`
        : `Network error contacting ${API_BASE}.`,
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
      if (!res.ok) {
        throw new SubmitRunError(
          `Server returned non-JSON response (${res.status}).`,
          res.status,
          rawText
        )
      }
      parsed = { message: rawText }
    }
  }

  if (!res.ok || parsed.success === false || parsed.code === 400 || parsed.code === 422) {
    const detail = parsed.detail ?? parsed.message ?? parsed.error ?? rawText
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((d) =>
                typeof d === "object" && d && "msg" in d
                  ? String((d as { msg: unknown }).msg)
                  : String(d)
              )
              .join("; ")
          : res.statusText || `Run failed (${res.status})`
    throw new SubmitRunError(msg, res.status, parsed)
  }

  return parsed
}

/** Submit a real pipeline run to the FastAPI backend. */
export async function submitNewRun(data: NewRunFormData): Promise<SubmitRunResult> {
  const payload = buildBackendRunPayload(data)
  const parsed = await postJson(RUN_URL, payload)

  return {
    runId: `run-${Date.now()}`,
    message:
      typeof parsed.message === "string"
        ? parsed.message
        : "Pipeline completed on the backend.",
    response: parsed as SubmitRunResult["response"],
  }
}

/**
 * Submit a sample/demo configuration. Same backend endpoint as submitNewRun
 * but used when explicitly running a preset/demo so we can render mock data
 * while a real run isn't required.
 */
export async function submitSampleRunConfiguration(
  data: NewRunFormData
): Promise<SubmitRunResult> {
  const payload = buildNewRunJsonPayload(data)
  try {
    const parsed = await postJson(SAMPLE_RUN_URL, payload)
    return {
      runId:
        typeof parsed.runId === "string"
          ? parsed.runId
          : typeof parsed.id === "string"
            ? parsed.id
            : `sample-${Date.now()}`,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : "Sample run accepted by backend.",
      response: parsed as SubmitRunResult["response"],
    }
  } catch (err) {
    // For sample mode we degrade gracefully so demos work offline, but we
    // still log so the developer can see what happened.
    if (err instanceof SubmitRunError) {
      console.warn("[sample-run] backend unavailable, returning local stub:", err.message)
    }
    return {
      runId: `sample-${Date.now()}`,
      message: "Sample run prepared locally (backend unavailable).",
    }
  }
}

export async function parsePrompt(prompt: string): Promise<ParsedPrompt> {
  await delay(150)
  const preset = DEMO_PRESETS.find((p) =>
    prompt.toLowerCase().includes(p.name.split(" ")[0])
  )
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
  await delay(200)
  return MOCK_PIPELINE_PROGRESS
}

export async function getTrainingRuns(): Promise<TrainingRun[]> {
  await delay(200)
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

/**
 * Discriminated result of a single /test/ poll, so callers can distinguish
 * between "not ready yet", a hard backend failure (e.g. 500), and a network
 * issue (where retrying makes sense).
 */
export type RunResultOutcome =
  | { status: "ready"; result: RunResult }
  | { status: "pending" }
  | { status: "failed"; message: string; code?: number }
  | { status: "unreachable"; message: string }

/**
 * Poll the backend /test/ endpoint for evaluation metrics.
 *
 * Behavior:
 * - 2xx + valid result body  → `{ status: "ready", result }`
 * - 2xx + body says success:false or shape doesn't match → `{ status: "pending" }`
 *   (or `failed` when the body explicitly reports failure)
 * - 5xx / 4xx                → `{ status: "failed", message, code }`
 * - network / DNS / abort    → `{ status: "unreachable", message }`
 */
export async function getRunResult(runId: string): Promise<RunResultOutcome> {
  let res: Response
  try {
    res = await fetch(RESULTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    })
  } catch (e) {
    return {
      status: "unreachable",
      message:
        e instanceof Error
          ? `Network error: ${e.message}. Is the API running on ${API_BASE}?`
          : `Network error contacting ${API_BASE}.`,
    }
  }

  let rawText = ""
  try {
    rawText = await res.text()
  } catch {
    /* keep empty */
  }

  let body: Record<string, unknown> = {}
  if (rawText) {
    try {
      body = JSON.parse(rawText) as Record<string, unknown>
    } catch {
      // Non-JSON body. If the response was OK we treat it as "pending" so
      // polling continues; otherwise surface the raw text as failure.
      if (!res.ok) {
        return {
          status: "failed",
          message: `Backend returned non-JSON ${res.status}: ${rawText.slice(0, 200)}`,
          code: res.status,
        }
      }
      return { status: "pending" }
    }
  }

  if (!res.ok) {
    const detail = body.detail ?? body.message ?? body.error ?? rawText
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((d) =>
                typeof d === "object" && d && "msg" in d
                  ? String((d as { msg: unknown }).msg)
                  : String(d)
              )
              .join("; ")
          : `Backend error ${res.status}`
    return { status: "failed", message, code: res.status }
  }

  // 200 with explicit failure payload (e.g. success:false / non-200 code field)
  if (
    body.success === false ||
    (typeof body.code === "number" && (body.code as number) >= 400)
  ) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : "Backend reported a failure for the evaluation step."
    return {
      status: "failed",
      message,
      code: typeof body.code === "number" ? (body.code as number) : undefined,
    }
  }

  const hasResultShape =
    body.success === true &&
    Array.isArray(body.baseline_cm) &&
    Array.isArray(body.finetuned_cm) &&
    body.code === 200

  if (!hasResultShape) return { status: "pending" }

  const baseline = parseMaybePercent(body.baseline_accuracy)
  const finetuned = parseMaybePercent(body.finetune_accuracy)
  if (baseline == null || finetuned == null) return { status: "pending" }

  return {
    status: "ready",
    result: {
      runId,
      baselineAccuracy: baseline,
      finalAccuracy: finetuned,
      baselineConfusionMatrix: body.baseline_cm as number[][],
      finetunedConfusionMatrix: body.finetuned_cm as number[][],
      confusionMatrix: body.finetuned_cm as number[][],
      emailSent: false,
    },
  }
}

// ---------- Run state persistence (localStorage) ----------------------------
//
// Every mutator below dispatches a `runstatechange` event so any component
// using `useRunState()` re-renders immediately and stays in sync across the
// dashboard, new-run page and results page.

export function markRunSubmitted(runId: string, dataSources?: NewRunFormData["dataSources"]) {
  localStorage.setItem(LATEST_RUN_ID_KEY, runId)
  localStorage.setItem(RESULTS_READY_KEY, "false")
  localStorage.setItem(RESULTS_POLLING_ENABLED_KEY, "false")
  localStorage.setItem(RUN_PHASE_KEY, "running")
  localStorage.setItem(RUN_STARTED_AT_KEY, String(Date.now()))
  localStorage.removeItem(POLLING_STARTED_AT_KEY)
  localStorage.removeItem(RUN_ERROR_KEY)
  if (dataSources) {
    localStorage.setItem(RUN_DATA_SOURCES_KEY, JSON.stringify(dataSources))
  }
  localStorage.removeItem(RESULTS_CACHE_KEY)
  notifyRunStateChange()
}

export function markRunResultReady(result: RunResult) {
  localStorage.setItem(RESULTS_READY_KEY, "true")
  localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(result))
  localStorage.setItem(RUN_PHASE_KEY, "completed")
  localStorage.setItem(RESULTS_POLLING_ENABLED_KEY, "false")
  localStorage.removeItem(POLLING_STARTED_AT_KEY)
  localStorage.removeItem(RUN_ERROR_KEY)
  notifyRunStateChange()
}

export function markRunBackendSuccess() {
  localStorage.setItem(RUN_PHASE_KEY, "success")
  localStorage.setItem(RESULTS_POLLING_ENABLED_KEY, "true")
  localStorage.setItem(POLLING_STARTED_AT_KEY, String(Date.now()))
  localStorage.removeItem(RUN_ERROR_KEY)
  notifyRunStateChange()
}

export function markRunError(message: string) {
  localStorage.setItem(RUN_PHASE_KEY, "error")
  localStorage.setItem(RUN_ERROR_KEY, message)
  localStorage.setItem(RESULTS_POLLING_ENABLED_KEY, "false")
  localStorage.removeItem(POLLING_STARTED_AT_KEY)
  notifyRunStateChange()
}

export function clearRunState() {
  localStorage.removeItem(LATEST_RUN_ID_KEY)
  localStorage.removeItem(RESULTS_READY_KEY)
  localStorage.removeItem(RESULTS_POLLING_ENABLED_KEY)
  localStorage.removeItem(RUN_PHASE_KEY)
  localStorage.removeItem(RUN_ERROR_KEY)
  localStorage.removeItem(RUN_DATA_SOURCES_KEY)
  localStorage.removeItem(RESULTS_CACHE_KEY)
  localStorage.removeItem(RUN_STARTED_AT_KEY)
  localStorage.removeItem(POLLING_STARTED_AT_KEY)
  notifyRunStateChange()
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

export function markResultsPollingEnabled(enabled: boolean) {
  localStorage.setItem(RESULTS_POLLING_ENABLED_KEY, enabled ? "true" : "false")
  notifyRunStateChange()
}

export function isResultsPollingEnabled(): boolean {
  return localStorage.getItem(RESULTS_POLLING_ENABLED_KEY) === "true"
}

export function getRunPhase(): RunPhase {
  const raw = localStorage.getItem(RUN_PHASE_KEY)
  if (
    raw === "running" ||
    raw === "success" ||
    raw === "error" ||
    raw === "completed"
  ) {
    return raw
  }
  return "idle"
}

export function getRunError(): string | null {
  return localStorage.getItem(RUN_ERROR_KEY)
}

export function getRunDataSources(): NewRunFormData["dataSources"] | null {
  const raw = localStorage.getItem(RUN_DATA_SOURCES_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as NewRunFormData["dataSources"]
  } catch {
    return null
  }
}

function readTimestamp(key: string): number | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function getRunStartedAt(): number | null {
  return readTimestamp(RUN_STARTED_AT_KEY)
}

export function getPollingStartedAt(): number | null {
  return readTimestamp(POLLING_STARTED_AT_KEY)
}

/**
 * True while the application considers a run "in flight" — either the
 * backend `/run/` request is still in progress (phase: "running") or it
 * succeeded and we're polling `/test/` for the metrics (phase: "success").
 *
 * Used to freeze the "Start Run" button and to drive the dashboard's
 * pipeline overview.
 */
export function isRunActive(): boolean {
  const phase = getRunPhase()
  return phase === "running" || phase === "success"
}

/**
 * Returns the number of milliseconds spent polling `/test/`, or null if
 * polling hasn't started yet. Polling timeout enforcement uses this.
 */
export function getPollingElapsedMs(): number | null {
  const start = getPollingStartedAt()
  if (start == null) return null
  return Math.max(0, Date.now() - start)
}

export async function getBackendHealth(): Promise<{ status: string; gpuAvailable?: boolean }> {
  await delay(100)
  return { status: "ok", gpuAvailable: true }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

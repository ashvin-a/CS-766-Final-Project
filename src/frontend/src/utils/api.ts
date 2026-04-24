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
  import.meta.env.VITE_SAMPLE_RUN_URL ??"http://localhost:8000"

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

/** Legacy full pipeline run (prompt + model only). */
export async function submitNewRun(data: NewRunFormData): Promise<{ runId: string }> {
  const res = await fetch(`${API_BASE}/run/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_prompt: data.prompt, model: data.model }),
  })
  const json = (await res.json()) as { success?: boolean; message?: string }
  if (!res.ok || json.success === false) {
    throw new SubmitRunError(json.message ?? res.statusText ?? "Run failed", res.status, json)
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
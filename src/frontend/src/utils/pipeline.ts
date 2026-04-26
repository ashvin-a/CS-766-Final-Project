/**
 * Shared pipeline-stage timing logic.
 *
 * Both NewRun and Dashboard render the same `PipelineStepper` component, and
 * both need to derive its `PipelineStageInfo[]` from the global run state
 * (phase + elapsed time + which optional stages were enabled). This module
 * is the single source of truth for that derivation.
 */

import type { NewRunFormData, PipelineStage, PipelineStageInfo } from "@/types"
import { PIPELINE_STAGES } from "@/data/mockData"

export type RunPhase = "idle" | "running" | "success" | "error" | "completed"

/** Approximate per-stage durations used to drive the visual timer. */
export const PIPELINE_TIMINGS_MS: Partial<Record<PipelineStage, number>> = {
  prompt_parsing: 5_000,
  data_collection: 15_000,
  synthetic_generation: 60_000,
  augmentation: 120_000,
  filtering: 30_000,
  dataset_assembly: 30_000,
  fine_tuning: 180_000,
  evaluation: 15_000,
}

export const TIMED_STAGE_ORDER: PipelineStage[] = [
  "prompt_parsing",
  "data_collection",
  "synthetic_generation",
  "augmentation",
  "filtering",
  "dataset_assembly",
  "fine_tuning",
  "evaluation",
]

export function isStageEnabled(
  id: PipelineStage,
  ds?: NewRunFormData["dataSources"] | null
): boolean {
  if (!ds) return true
  if (id === "synthetic_generation") return ds.syntheticGeneration !== false
  if (id === "augmentation") return ds.augmentation !== false
  if (id === "filtering") return ds.clipFiltering !== false
  return true
}

export function totalEnabledMs(ds?: NewRunFormData["dataSources"] | null): number {
  return TIMED_STAGE_ORDER.reduce((sum, id) => {
    if (!isStageEnabled(id, ds)) return sum
    return sum + (PIPELINE_TIMINGS_MS[id] ?? 0)
  }, 0)
}

export interface BuildPipelineOpts {
  dataSources?: NewRunFormData["dataSources"] | null
  phase: RunPhase
  errorMessage?: string | null
}

/**
 * Build the `PipelineStageInfo[]` array consumed by `PipelineStepper`.
 *
 * - When `phase` is "idle" all stages render as pending.
 * - When `phase` is "running" stages fill in over time based on `elapsedMs`.
 * - When `phase` is "success" data + training stages are completed and
 *   `evaluation` is shown as actively polling.
 * - When `phase` is "completed" everything is marked done (incl. delivery).
 * - When `phase` is "error" the first incomplete stage is marked failed.
 */
export function buildTimedPipeline(
  elapsedMs: number,
  opts: BuildPipelineOpts
): PipelineStageInfo[] {
  const { dataSources, phase, errorMessage } = opts
  const stageStatus = new Map<
    PipelineStage,
    { status: PipelineStageInfo["status"]; progress: number; details?: string; error?: string }
  >()

  let remaining = Math.max(0, elapsedMs)
  let errorPlaced = false

  for (const id of TIMED_STAGE_ORDER) {
    if (!isStageEnabled(id, dataSources)) {
      stageStatus.set(id, {
        status: "skipped",
        progress: 0,
        details: "Disabled in run configuration.",
      })
      continue
    }

    if (phase === "completed") {
      stageStatus.set(id, { status: "completed", progress: 100, details: "Completed" })
      continue
    }

    if (phase === "success") {
      // Backend pipeline (data + training) is finished. Evaluation is the
      // remaining work and we surface it as running until /test/ resolves.
      if (id === "evaluation") {
        stageStatus.set(id, {
          status: "running",
          progress: 50,
          details: "Polling backend for evaluation metrics...",
        })
      } else {
        stageStatus.set(id, {
          status: "completed",
          progress: 100,
          details: "Backend confirmed completion.",
        })
      }
      continue
    }

    const durationMs = PIPELINE_TIMINGS_MS[id] ?? 0

    if (remaining <= 0) {
      if (phase === "error" && !errorPlaced) {
        stageStatus.set(id, {
          status: "failed",
          progress: 0,
          details: errorMessage ?? "Run failed.",
          error: errorMessage ?? "Run failed.",
        })
        errorPlaced = true
      } else {
        stageStatus.set(id, { status: "pending", progress: 0 })
      }
      continue
    }

    if (remaining >= durationMs) {
      stageStatus.set(id, {
        status: "completed",
        progress: 100,
        details: "Completed",
      })
      remaining -= durationMs
      continue
    }

    if (phase === "error" && !errorPlaced) {
      stageStatus.set(id, {
        status: "failed",
        progress: 0,
        details: errorMessage ?? "Run failed.",
        error: errorMessage ?? "Run failed.",
      })
      errorPlaced = true
      remaining = 0
      continue
    }

    const progress = Math.max(1, Math.min(99, Math.round((remaining / durationMs) * 100)))
    stageStatus.set(id, {
      status: "running",
      progress,
      details: `${Math.ceil((durationMs - remaining) / 1000)}s elapsed of ~${Math.round(durationMs / 1000)}s`,
    })
    remaining = 0
  }

  return PIPELINE_STAGES.map((stage) => {
    const s = stageStatus.get(stage.id)
    if (s) return { ...stage, ...s }

    if (stage.id === "delivery") {
      if (phase === "completed") {
        return {
          ...stage,
          status: "completed",
          progress: 100,
          details: "Run finished. Results available in the Results tab.",
        }
      }
      if (phase === "success") {
        return {
          ...stage,
          status: "pending",
          progress: 0,
          details: "Pending evaluation results.",
        }
      }
      if (phase === "error") {
        return {
          ...stage,
          status: "pending",
          progress: 0,
          details: errorMessage ?? "Run failed before delivery.",
        }
      }
      const totalMs = totalEnabledMs(dataSources)
      if (totalMs > 0 && elapsedMs >= totalMs) {
        return {
          ...stage,
          status: "running",
          progress: 50,
          details: "Backend still working — waiting for response...",
        }
      }
    }

    return { ...stage, status: "pending", progress: 0 }
  })
}

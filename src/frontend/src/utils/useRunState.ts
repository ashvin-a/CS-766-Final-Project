/**
 * `useRunState` — single source of truth for the global pipeline-run state
 * across all routes.
 *
 * The state lives in `localStorage` (so navigating between pages, or even
 * reloading the tab, preserves it), and any mutation made through the
 * `markRun*` helpers in `api.ts` fires a `runstatechange` event. Any
 * component that uses this hook will re-render in response to that event,
 * the cross-tab `storage` event, or the active-run tick (used to advance
 * the visual timer once per second while a run is in flight).
 */

import { useEffect, useState } from "react"
import {
  RUN_STATE_EVENT,
  getCachedRunResult,
  getLatestRunId,
  getPollingStartedAt,
  getRunDataSources,
  getRunError,
  getRunPhase,
  getRunStartedAt,
  isResultReady,
  isResultsPollingEnabled,
  isRunActive,
  type RunPhase,
} from "./api"
import type { NewRunFormData, RunResult } from "@/types"

export interface RunStateSnapshot {
  runId: string | null
  phase: RunPhase
  error: string | null
  dataSources: NewRunFormData["dataSources"] | null
  startedAt: number | null
  pollingStartedAt: number | null
  pollingEnabled: boolean
  resultReady: boolean
  cachedResult: RunResult | null
  /** Convenience: true while the run is in `running` or `success` phases. */
  isActive: boolean
  /** Monotonic counter that bumps on every interval tick. Use it to recompute
   *  derived elapsed-time values without having to manage your own timer. */
  tick: number
}

function readSnapshot(tick: number): RunStateSnapshot {
  return {
    runId: getLatestRunId(),
    phase: getRunPhase(),
    error: getRunError(),
    dataSources: getRunDataSources(),
    startedAt: getRunStartedAt(),
    pollingStartedAt: getPollingStartedAt(),
    pollingEnabled: isResultsPollingEnabled(),
    resultReady: isResultReady(),
    cachedResult: getCachedRunResult(),
    isActive: isRunActive(),
    tick,
  }
}

export function useRunState(): RunStateSnapshot {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener(RUN_STATE_EVENT, bump)
    window.addEventListener("storage", bump)

    // Tick once a second so any consumer that derives `Date.now() -
    // startedAt` for a live timer naturally re-renders. We only run the
    // tick while a run is actually in flight to avoid waking the page when
    // it's idle.
    const intervalId = window.setInterval(() => {
      if (isRunActive()) bump()
    }, 1000)

    return () => {
      window.removeEventListener(RUN_STATE_EVENT, bump)
      window.removeEventListener("storage", bump)
      clearInterval(intervalId)
    }
  }, [])

  return readSnapshot(tick)
}

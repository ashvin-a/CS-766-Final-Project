import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { MetricsPanel } from "@/components/MetricsPanel"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  POLL_TIMEOUT_MS,
  clearRunState,
  getRunResult,
  markRunError,
  markRunResultReady,
  type RunPhase,
} from "@/utils/api"
import { useRunState } from "@/utils/useRunState"
import type { RunResult } from "@/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { MOCK_RUN_RESULT } from "@/data/mockData"

type ResultsView =
  | { kind: "empty" }
  | { kind: "sample"; result: RunResult }
  | { kind: "waiting"; phase: RunPhase }
  | { kind: "polling"; phase: RunPhase; secondsLeft: number | null }
  | { kind: "error"; message: string }
  | { kind: "real"; result: RunResult }

export function Results() {
  const [searchParams] = useSearchParams()
  const showSampleParam = searchParams.get("sample") === "true"
  const run = useRunState()
  const requestedRunId = searchParams.get("run") ?? run.runId

  const [availableNotice, setAvailableNotice] = useState<string | null>(null)
  const [showSample, setShowSample] = useState(showSampleParam)

  // Poll the backend evaluation endpoint while the pipeline is in "success"
  // phase (training finished, waiting for /test/ to return metrics). The
  // global state is the source of truth — when phase flips to "completed"
  // or "error" this effect simply unsubscribes.
  useEffect(() => {
    if (run.phase !== "success" || !run.pollingEnabled || !requestedRunId) return
    if (run.resultReady) return

    let cancelled = false

    const poll = async () => {
      if (cancelled) return

      // Timeout — same logic as NewRun, so whichever page is open will
      // detect it. The first one to call `markRunError` wins; the other
      // page picks it up via the runstatechange event.
      const pollingStart = run.pollingStartedAt ?? Date.now()
      if (Date.now() - pollingStart > POLL_TIMEOUT_MS) {
        const seconds = Math.round(POLL_TIMEOUT_MS / 1000)
        markRunError(
          `No evaluation results after ${seconds}s of polling /test/. The backend may have failed silently — check its logs and start a new run.`
        )
        cancelled = true
        return
      }

      const outcome = await getRunResult(requestedRunId)
      if (cancelled) return

      if (outcome.status === "ready") {
        markRunResultReady(outcome.result)
        setAvailableNotice("Results loaded from backend.")
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("Results are available", {
            body: "Your finetuned model metrics are ready.",
          })
        }
        cancelled = true
        return
      }

      if (outcome.status === "failed") {
        const code = outcome.code ? ` (HTTP ${outcome.code})` : ""
        markRunError(`Backend evaluation failed${code}: ${outcome.message}`)
        cancelled = true
        return
      }

      // pending / unreachable → keep polling until timeout
    }

    poll()
    const intervalId = window.setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [run.phase, run.pollingEnabled, run.pollingStartedAt, run.resultReady, requestedRunId])

  const view = useMemo<ResultsView>(() => {
    if (showSample) return { kind: "sample", result: MOCK_RUN_RESULT }
    if (run.phase === "error" && run.error) {
      return { kind: "error", message: run.error }
    }
    if (run.cachedResult) return { kind: "real", result: run.cachedResult }
    if (run.phase === "running") return { kind: "waiting", phase: run.phase }
    if (run.phase === "success") {
      const secondsLeft = run.pollingStartedAt
        ? Math.max(
            0,
            Math.ceil((POLL_TIMEOUT_MS - (Date.now() - run.pollingStartedAt)) / 1000)
          )
        : null
      return { kind: "polling", phase: run.phase, secondsLeft }
    }
    if (run.phase === "completed") {
      // completed but no result cached — backend probably reported success
      // without a confusion-matrix payload.
      return { kind: "empty" }
    }
    return { kind: "empty" }
  }, [
    run.tick,
    run.phase,
    run.error,
    run.cachedResult,
    run.pollingStartedAt,
    showSample,
  ])

  const displayId = requestedRunId ?? "—"

  return (
    <div className="space-y-8 px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground">
            Run <span className="font-mono">{displayId}</span> — final metrics and model delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view.kind === "sample" && <Badge variant="secondary">Sample data</Badge>}
          {view.kind === "real" && <Badge variant="success">Backend results</Badge>}
          {view.kind === "polling" && <Badge>Polling backend</Badge>}
          {view.kind === "waiting" && <Badge>Pipeline running</Badge>}
          {view.kind === "error" && <Badge variant="destructive">Run failed</Badge>}
          <Button
            variant={showSample ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSample((s) => !s)}
          >
            {showSample ? "Hide sample" : "Show sample"}
          </Button>
        </div>
      </div>

      {availableNotice && view.kind === "real" && (
        <p className="text-sm text-emerald-400">{availableNotice}</p>
      )}

      {view.kind === "polling" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Waiting on evaluation</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Backend pipeline finished training. Polling{" "}
              <span className="font-mono">/test/</span> every 5s for confusion matrices.
            </p>
            {view.secondsLeft !== null && (
              <p className="text-xs text-muted-foreground">
                Automatic timeout in {view.secondsLeft}s if /test/ stays silent.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              You'll get a browser notification when results land. Toggle "Show sample" above to
              preview what the layout will look like.
            </p>
          </CardContent>
        </Card>
      )}

      {view.kind === "waiting" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Pipeline running</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Backend is currently scraping, augmenting and fine-tuning. Results will appear here
              automatically when training and evaluation finish.
            </p>
            <p className="text-xs text-muted-foreground">
              Use the "Show sample" toggle above to preview the visualizations with example data.
            </p>
          </CardContent>
        </Card>
      )}

      {view.kind === "error" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-destructive">Run failed</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {view.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Check the backend terminal for stack traces. Common causes: unreachable Groq API key,
              missing Playwright browser, or no images returned by scraping. After fixing, submit a
              new run from the New Run tab.
            </p>
            <Button variant="outline" size="sm" onClick={() => clearRunState()}>
              Clear failed run state
            </Button>
          </CardContent>
        </Card>
      )}

      {view.kind === "empty" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">No results yet</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Submit a run from the New Run tab to see real metrics here. You can also toggle
              "Show sample" to preview the layout with example data.
            </p>
          </CardContent>
        </Card>
      )}

      {(view.kind === "sample" || view.kind === "real") && (
        <ResultsBody result={view.result} sample={view.kind === "sample"} />
      )}
    </div>
  )
}

function ResultsBody({ result, sample }: { result: RunResult; sample: boolean }) {
  const comparisonData = result.baselineAccuracy
    ? [
        { name: "Baseline", accuracy: result.baselineAccuracy * 100 },
        { name: "Synthesized", accuracy: result.finalAccuracy * 100 },
      ]
    : []

  return (
    <>
      {sample && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Showing illustrative sample data. Real backend results will replace this view once the
          pipeline finishes.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <MetricsPanel result={result} />
        </div>
        <div>
          {comparisonData.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 font-semibold">Baseline vs synthesized</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Bar dataKey="accuracy" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

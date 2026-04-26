import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { MetricsPanel } from "@/components/MetricsPanel"
import { Card, CardContent } from "@/components/ui/card"
import { getCachedRunResult, getLatestRunId, getRunResult, isResultReady, markRunResultReady } from "@/utils/api"
import type { RunResult } from "@/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { MOCK_RUN_RESULT } from "@/data/mockData"

export function Results() {
  const [searchParams] = useSearchParams()
  const runId = searchParams.get("run") ?? getLatestRunId() ?? "run-001"
  const [result, setResult] = useState<RunResult>(() => getCachedRunResult() ?? MOCK_RUN_RESULT)
  const [polling, setPolling] = useState(!isResultReady())
  const [availableNotice, setAvailableNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const pollEveryMs = 5000
    let intervalId: number | undefined

    const poll = async () => {
      const apiResult = await getRunResult(runId)
      if (!apiResult || cancelled) return

      const hasBackendResult =
        Array.isArray(apiResult.baselineConfusionMatrix) &&
        Array.isArray(apiResult.finetunedConfusionMatrix)
      if (!hasBackendResult) return

      setResult(apiResult)
      markRunResultReady(apiResult)
      setAvailableNotice("Results are now available from the backend.")
      setPolling(false)
      if (intervalId !== undefined) {
        clearInterval(intervalId)
      }
    }

    if (!isResultReady()) {
      poll()
      intervalId = window.setInterval(poll, pollEveryMs)
      return () => {
        cancelled = true
        if (intervalId !== undefined) {
          clearInterval(intervalId)
        }
      }
    }

    const cached = getCachedRunResult()
    if (cached) {
      setResult(cached)
    }
    setPolling(false)
  }, [runId])

  const comparisonData = result.baselineAccuracy
    ? [
        { name: "Baseline", accuracy: result.baselineAccuracy * 100 },
        { name: "Synthesized", accuracy: result.finalAccuracy * 100 },
      ]
    : []

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-muted-foreground">
          Run {runId} — final metrics and model delivery
        </p>
        {polling && (
          <p className="mt-2 text-sm text-muted-foreground">
            Polling backend for completed metrics. Showing sample data until results are ready.
          </p>
        )}
        {availableNotice && (
          <p className="mt-2 text-sm text-emerald-400">{availableNotice}</p>
        )}
      </div>

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
    </div>
  )
}

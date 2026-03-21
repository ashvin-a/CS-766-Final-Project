import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { MetricsPanel } from "@/components/MetricsPanel"
import { Card, CardContent } from "@/components/ui/card"
import { getRunResult } from "@/lib/api"
import type { RunResult } from "@/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export function Results() {
  const [searchParams] = useSearchParams()
  const runId = searchParams.get("run") ?? "run-001"
  const [result, setResult] = useState<RunResult | null>(null)

  useEffect(() => {
    getRunResult(runId).then(setResult)
  }, [runId])

  if (!result) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-4">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    )
  }

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

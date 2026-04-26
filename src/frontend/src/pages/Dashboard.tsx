import { useMemo, useState } from "react"
import { HeroSection } from "@/components/HeroSection"
import { PipelineStepper } from "@/components/PipelineStepper"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { parsePrompt } from "@/utils/api"
import { DEMO_PRESETS } from "@/data/mockData"
import { useRunState } from "@/utils/useRunState"
import { buildTimedPipeline } from "@/utils/pipeline"

export function Dashboard() {
  const navigate = useNavigate()
  const [expandedStage, setExpandedStage] = useState("")
  const run = useRunState()

  const handleLoadExample = async () => {
    const preset = DEMO_PRESETS[0]
    const parsed = await parsePrompt(preset.prompt)
    navigate("/new-run", {
      state: {
        preset: { ...preset, parsed },
        formData: {
          prompt: preset.prompt,
          email: "",
          model: "efficientnet_b0" as const,
          dataSources: {
            webScraping: true,
            syntheticGeneration: true,
            augmentation: true,
            clipFiltering: true,
          },
          advanced: {
            datasetSizeTarget: 1000,
            augmentationStrength: 0.5,
            clipThreshold: 0.7,
            freezeBackbone: false,
            epochs: 10,
            batchSize: 32,
            learningRate: 0.0001,
            deliveryFormat: "pytorch",
          },
        },
      },
    })
  }

  // The pipeline overview is derived from whatever the global run state is
  // right now. This re-evaluates every second while the run is active
  // because `useRunState` ticks once per second in that mode.
  const stages = useMemo(() => {
    const elapsed =
      run.startedAt != null && (run.phase === "running" || run.phase === "success")
        ? Date.now() - run.startedAt
        : run.phase === "completed"
          ? Number.MAX_SAFE_INTEGER
          : 0
    return buildTimedPipeline(elapsed, {
      dataSources: run.dataSources,
      phase: run.phase,
      errorMessage: run.error,
    })
    // run.tick is intentionally a dep so the elapsed time recomputes 1Hz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.tick, run.phase, run.startedAt, run.dataSources, run.error])

  const headerBadge = (() => {
    switch (run.phase) {
      case "running":
        return <Badge>Pipeline running</Badge>
      case "success":
        return <Badge variant="success">Training complete — evaluating</Badge>
      case "error":
        return <Badge variant="destructive">Run failed</Badge>
      case "completed":
        return <Badge variant="success">Results ready</Badge>
      default:
        return <Badge variant="secondary">No active run</Badge>
    }
  })()

  return (
    <div className="space-y-8">
      <HeroSection onLoadExample={handleLoadExample} />
      <div className="px-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Pipeline overview</h2>
                <p className="text-sm text-muted-foreground">
                  {run.isActive
                    ? "Live status of the run currently in flight."
                    : run.phase === "completed"
                      ? "Most recent run completed successfully."
                      : run.phase === "error"
                        ? "Most recent run failed before delivery."
                        : "End-to-end workflow from prompt to trained model."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {headerBadge}
                {run.runId && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {run.runId}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {run.phase === "error" && run.error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {run.error}
              </div>
            )}
            <PipelineStepper
              stages={stages}
              expandedStage={expandedStage}
              onExpand={setExpandedStage}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {run.isActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/new-run")}
                >
                  Open active run
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate("/new-run")}>
                  Start a new run
                </Button>
              )}
              {run.phase === "completed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      run.runId
                        ? `/results?run=${encodeURIComponent(run.runId)}`
                        : "/results"
                    )
                  }
                >
                  View results
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

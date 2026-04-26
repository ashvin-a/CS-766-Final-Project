import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { PromptForm } from "@/components/PromptForm"
import { ParsedPromptPreview } from "@/components/ParsedPromptPreview"
import { PipelineStepper } from "@/components/PipelineStepper"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  POLL_TIMEOUT_MS,
  clearRunState,
  getRunResult,
  markRunBackendSuccess,
  markRunError,
  markRunResultReady,
  markRunSubmitted,
  parsePrompt,
  type SubmitRunResult,
} from "@/utils/api"
import type { NewRunFormData, ParsedPrompt, RunResult } from "@/types"
import { DEMO_PRESETS } from "@/data/mockData"
import { buildTimedPipeline } from "@/utils/pipeline"
import { useRunState } from "@/utils/useRunState"

export function NewRun() {
  const location = useLocation()
  const navigate = useNavigate()
  const presetFromNav = (
    location.state as { preset?: { parsed: ParsedPrompt; formData: Partial<NewRunFormData> } }
  )?.preset
  const [parsed, setParsed] = useState<ParsedPrompt | null>(presetFromNav?.parsed ?? null)
  const [formData, setFormData] = useState<Partial<NewRunFormData> | null>(
    presetFromNav?.formData ?? null
  )
  const [sampleMode, setSampleMode] = useState(Boolean(presetFromNav))
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const isSampleRunRef = useRef(false)

  // Global run state. This is the single source of truth — local React
  // state mirrors it for things like the parsed-prompt preview and the
  // sample-mode flag, but the pipeline visualization derives entirely
  // from `run`.
  const run = useRunState()

  useEffect(() => {
    if (formData?.prompt && !parsed) {
      parsePrompt(formData.prompt).then(setParsed)
    }
  }, [formData?.prompt])

  const loadPreset = (preset: (typeof DEMO_PRESETS)[number]) => {
    setSampleMode(true)
    setFormData({
      prompt: preset.prompt,
      email: "",
      model: "efficientnet_b0",
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
    })
    setParsed({
      classes: [...preset.classes],
      searchPrompts: [...preset.searchPrompts],
      diffusionPrompts: [...preset.diffusionPrompts],
      confidence: 0.9,
    })
  }

  const handleRunStart = async (
    data: NewRunFormData,
    { runId: id, sampleMode: isSample }: { runId: string; message?: string; sampleMode: boolean }
  ) => {
    isSampleRunRef.current = isSample
    setSubmitMessage(null)
    if (!isSample) {
      // This is the canonical "a run is now in flight" event — every page
      // that watches `useRunState` immediately reflects it.
      markRunSubmitted(id, data.dataSources)
    } else {
      clearRunState()
    }
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission()
    }
    parsePrompt(data.prompt).then(setParsed)
  }

  const handleRunSuccess = async (
    _data: NewRunFormData,
    result: SubmitRunResult & { sampleMode: boolean }
  ) => {
    setSubmitMessage(result.message ?? null)

    if (result.sampleMode) {
      // Sample/demo run — there's no real backend pipeline to reflect.
      return
    }

    // Backend `/run/` succeeded — kick off `/test/` polling. The phase
    // transition to "success" is what enables the polling effect below
    // and starts the timeout clock.
    markRunBackendSuccess()

    if (result.response?.classes) {
      setParsed((prev) =>
        prev
          ? prev
          : {
              classes: (result.response?.classes as string[]) ?? [],
              searchPrompts: [],
              diffusionPrompts: [],
              confidence:
                typeof result.response?.confidence === "number"
                  ? (result.response.confidence as number)
                  : 0.9,
            }
      )
    }
  }

  const handleRunError = async (err: Error, _data: NewRunFormData) => {
    if (!isSampleRunRef.current) {
      markRunError(err.message)
    }
  }

  const cancelActiveRun = () => {
    if (
      window.confirm(
        "Cancel and clear the active run? This won't stop the backend, but it will let you start a new run from the UI."
      )
    ) {
      clearRunState()
    }
  }

  // -------------------------------------------------------------------------
  // /test/ polling — only after the backend /run/ confirms success.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (run.phase !== "success" || !run.runId || isSampleRunRef.current) return

    let cancelled = false
    const pollEveryMs = 5000

    const poll = async () => {
      if (cancelled) return

      // Timeout enforcement: if we've been polling longer than the
      // configured window without a definitive response, declare failure.
      const pollingStart = run.pollingStartedAt ?? Date.now()
      const elapsed = Date.now() - pollingStart
      if (elapsed > POLL_TIMEOUT_MS) {
        const seconds = Math.round(POLL_TIMEOUT_MS / 1000)
        markRunError(
          `No evaluation results after ${seconds}s of polling /test/. The backend may have failed silently — check its logs and start a new run.`
        )
        cancelled = true
        return
      }

      const outcome = await getRunResult(run.runId!)
      if (cancelled) return

      if (outcome.status === "ready") {
        markRunResultReady(outcome.result as RunResult)
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("Run complete", {
            body: "Your finetuned model metrics are ready in the Results tab.",
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
    const intervalId = window.setInterval(poll, pollEveryMs)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [run.phase, run.runId, run.pollingStartedAt])

  // -------------------------------------------------------------------------
  // Pipeline visualization.
  // -------------------------------------------------------------------------
  const stages = useMemo(() => {
    const elapsed =
      run.startedAt != null && (run.phase === "running" || run.phase === "success")
        ? Date.now() - run.startedAt
        : run.phase === "completed"
          ? Number.MAX_SAFE_INTEGER
          : run.phase === "error" && run.startedAt != null
            ? Date.now() - run.startedAt
            : 0
    return buildTimedPipeline(elapsed, {
      dataSources: run.dataSources,
      phase: run.phase,
      errorMessage: run.error,
    })
    // run.tick forces 1Hz recomputation while the run is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.tick, run.phase, run.startedAt, run.dataSources, run.error])

  const phaseBadge = (() => {
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
        return null
    }
  })()

  const pollingSecondsLeft =
    run.phase === "success" && run.pollingStartedAt
      ? Math.max(
          0,
          Math.ceil((POLL_TIMEOUT_MS - (Date.now() - run.pollingStartedAt)) / 1000)
        )
      : null

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">New Run</h1>
        <p className="text-muted-foreground">
          Configure and launch a new fine-tuning run
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="mb-4">
            <CardHeader>
              <h2 className="font-semibold">Demo presets</h2>
              <p className="text-sm text-muted-foreground">
                Load example configurations to try the workflow
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => loadPreset(preset)}
                    disabled={run.isActive && !sampleMode}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
              {sampleMode && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Sample mode is enabled — submissions will be treated as a demo and won't
                  block on the backend pipeline. Clear the form to run a real pipeline.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Configuration</h2>
            </CardHeader>
            <CardContent>
              <PromptForm
                onStart={handleRunStart}
                onSuccess={handleRunSuccess}
                onError={handleRunError}
                initialData={formData ?? undefined}
                sampleMode={sampleMode}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {parsed && <ParsedPromptPreview parsed={parsed} />}
          {run.runId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">Run status</h3>
                  {phaseBadge}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-mono text-sm text-muted-foreground">{run.runId}</p>
                {submitMessage && (
                  <p className="text-xs text-muted-foreground">{submitMessage}</p>
                )}
                {run.phase === "success" && pollingSecondsLeft !== null && (
                  <p className="text-xs text-muted-foreground">
                    Polling /test/ for evaluation metrics… {pollingSecondsLeft}s before
                    automatic timeout.
                  </p>
                )}
                {run.error && (
                  <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {run.error}
                  </p>
                )}
                {run.phase === "completed" && (
                  <button
                    onClick={() =>
                      navigate(`/results?run=${encodeURIComponent(run.runId!)}`)
                    }
                    className="block text-sm text-primary hover:underline"
                  >
                    View results →
                  </button>
                )}
                {run.phase === "error" && (
                  <Button variant="outline" size="sm" onClick={() => clearRunState()}>
                    Clear failed run
                  </Button>
                )}
                {run.isActive && (
                  <Button variant="ghost" size="sm" onClick={cancelActiveRun}>
                    Cancel local run state
                  </Button>
                )}
                <button
                  onClick={() => navigate("/training-runs")}
                  className="block text-sm text-primary hover:underline"
                >
                  View in Training Runs →
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {run.runId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Pipeline progress</h2>
              {isSampleRunRef.current && (
                <Badge variant="secondary">Sample preview</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <PipelineStepper stages={stages} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { PromptForm } from "@/components/PromptForm"
import { ParsedPromptPreview } from "@/components/ParsedPromptPreview"
import { PipelineStepper } from "@/components/PipelineStepper"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { submitNewRun, parsePrompt } from "@/lib/api"
import type { NewRunFormData, ParsedPrompt } from "@/types"
import { MOCK_PIPELINE_PROGRESS, DEMO_PRESETS } from "@/data/mockData"

export function NewRun() {
  const location = useLocation()
  const navigate = useNavigate()
  const presetFromNav = (location.state as { preset?: { parsed: ParsedPrompt; formData: Partial<NewRunFormData> } })?.preset
  const [parsed, setParsed] = useState<ParsedPrompt | null>(presetFromNav?.parsed ?? null)
  const [formData, setFormData] = useState<Partial<NewRunFormData> | null>(presetFromNav?.formData ?? null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [pipelineStages, setPipelineStages] = useState(MOCK_PIPELINE_PROGRESS)

  useEffect(() => {
    if (formData?.prompt && !parsed) {
      parsePrompt(formData.prompt).then(setParsed)
    }
  }, [formData?.prompt])

  const loadPreset = (preset: (typeof DEMO_PRESETS)[number]) => {
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

  const handleSubmit = async (data: NewRunFormData) => {
    setIsSubmitting(true)
    try {
      const { runId: id } = await submitNewRun(data)
      setRunId(id)
      setParsed(await parsePrompt(data.prompt))
      setPipelineStages(
        MOCK_PIPELINE_PROGRESS.map((s, i) => ({
          ...s,
          status: i < 2 ? "completed" : i === 2 ? "running" : "pending",
          progress: i === 2 ? 30 : i < 2 ? 100 : 0,
        }))
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Configuration</h2>
            </CardHeader>
            <CardContent>
              <PromptForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                initialData={formData ?? undefined}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {parsed && (
            <ParsedPromptPreview parsed={parsed} />
          )}
          {runId && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Run started</h3>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm text-muted-foreground">
                  {runId}
                </p>
                <button
                  onClick={() => navigate("/training-runs")}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  View in Training Runs →
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {runId && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Pipeline progress</h2>
          </CardHeader>
          <CardContent>
            <PipelineStepper stages={pipelineStages} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

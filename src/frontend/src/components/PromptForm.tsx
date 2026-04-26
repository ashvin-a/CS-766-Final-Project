import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
import { ModelSelector } from "./ModelSelector"
import type { NewRunFormData, PromptFormState, VisionModel } from "@/types"
import { submitNewRun, submitSampleRunConfiguration, SubmitRunError } from "@/utils/api"
import { Loader2 } from "lucide-react"

const PROMPT_PLACEHOLDERS = [
  "Fine-tune this to detect healthy vs diseased tomato leaves",
  "Train a classifier for cracked vs non-cracked concrete surfaces",
  "Classify indoor vs outdoor scenes",
]

const defaultAdvanced: PromptFormState["advanced"] = {
  datasetSizeTarget: 1000,
  augmentationStrength: 0.5,
  clipThreshold: 0.7,
  freezeBackbone: false,
  epochs: 10,
  batchSize: 32,
  learningRate: 0.0001,
  deliveryFormat: "pytorch",
}

const defaultDataSources: PromptFormState["dataSources"] = {
  webScraping: true,
  syntheticGeneration: true,
  augmentation: true,
  clipFiltering: true,
}

function stateFromInitial(initial?: Partial<NewRunFormData>): PromptFormState {
  return {
    prompt: initial?.prompt ?? "",
    email: initial?.email ?? "",
    model: (initial?.model ?? "efficientnet_b0") as VisionModel,
    dataSources: initial?.dataSources ?? { ...defaultDataSources },
    advanced: initial?.advanced ? { ...defaultAdvanced, ...initial.advanced } : { ...defaultAdvanced },
  }
}

function toNewRunFormData(f: PromptFormState): NewRunFormData {
  return {
    prompt: f.prompt,
    email: f.email,
    model: f.model,
    dataSources: f.dataSources,
    advanced: f.advanced,
  }
}

interface PromptFormProps {
  /** Called after a submit API succeeds. */
  onSuccess?: (
    data: NewRunFormData,
    result: { runId: string; message?: string }
  ) => void | Promise<void>
  initialData?: Partial<NewRunFormData>
  /** Force sample endpoint usage (for example/demo presets). */
  sampleMode?: boolean
}

export function PromptForm({ onSuccess, initialData, sampleMode = false }: PromptFormProps) {
  const [form, setForm] = useState<PromptFormState>(() => stateFromInitial(initialData))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (initialData) {
      setForm(stateFromInitial(initialData))
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    const payload = toNewRunFormData(form)
    setIsSubmitting(true)
    try {
      const hasSufficientData =
        payload.prompt.trim().length > 0 &&
        payload.email.trim().length > 0 &&
        payload.model.trim().length > 0

      const useSample = sampleMode || !hasSufficientData
      const result = useSample
        ? await submitSampleRunConfiguration(payload)
        : await submitNewRun(payload)

      setFeedback({
        kind: "success",
        text:
          result.message ??
          `Submitted successfully. Run id: ${result.runId}. You can continue with pipeline steps below.`,
      })
      try {
        await onSuccess?.(payload, result)
      } catch (hookErr) {
        setFeedback({
          kind: "error",
          text:
            hookErr instanceof Error
              ? `Saved to server, but a follow-up step failed: ${hookErr.message}`
              : "Saved to server, but a follow-up step failed.",
        })
      }
    } catch (err) {
      // If backend run fails in standard mode, gracefully degrade to sample mode.
      if (!sampleMode) {
        try {
          const result = await submitSampleRunConfiguration(payload)
          setFeedback({
            kind: "success",
            text:
              result.message ??
              `Backend run unavailable; submitted as sample. Run id: ${result.runId}.`,
          })
          await onSuccess?.(payload, result)
          return
        } catch {
          // fall through to normal error handling below
        }
      }

      const text =
        err instanceof SubmitRunError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong. Check that the API is running (e.g. FastAPI on port 8000) and try again."
      setFeedback({
        kind: "error",
        text,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {feedback && (
        <div
          role="status"
          className={
            feedback.kind === "success"
              ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
              : "rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {feedback.text}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          placeholder={PROMPT_PLACEHOLDERS[0]}
          value={form.prompt}
          onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
          rows={4}
          className="resize-none font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Describe your classification task in natural language
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
      </div>

      <ModelSelector value={form.model} onChange={(m) => setForm((f) => ({ ...f, model: m }))} />

      <div className="space-y-4">
        <Label>Data sources</Label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <Switch
              checked={form.dataSources.webScraping}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, dataSources: { ...f.dataSources, webScraping: c } }))
              }
            />
            <span className="text-sm">Web Scraping</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={form.dataSources.syntheticGeneration}
              onCheckedChange={(c) =>
                setForm((f) => ({
                  ...f,
                  dataSources: { ...f.dataSources, syntheticGeneration: c },
                }))
              }
            />
            <span className="text-sm">Synthetic Generation</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={form.dataSources.augmentation}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, dataSources: { ...f.dataSources, augmentation: c } }))
              }
            />
            <span className="text-sm">Augmentation</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={form.dataSources.clipFiltering}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, dataSources: { ...f.dataSources, clipFiltering: c } }))
              }
            />
            <span className="text-sm">CLIP Filtering</span>
          </label>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced">
          <AccordionTrigger>Advanced settings</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Dataset size target: {form.advanced.datasetSizeTarget}</Label>
              <Slider
                value={[form.advanced.datasetSizeTarget]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, advanced: { ...f.advanced, datasetSizeTarget: v } }))
                }
                min={100}
                max={5000}
                step={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Augmentation strength: {form.advanced.augmentationStrength}</Label>
              <Slider
                value={[form.advanced.augmentationStrength]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, advanced: { ...f.advanced, augmentationStrength: v } }))
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>CLIP threshold: {form.advanced.clipThreshold}</Label>
              <Slider
                value={[form.advanced.clipThreshold]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, advanced: { ...f.advanced, clipThreshold: v } }))
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <label className="flex items-center gap-2">
              <Switch
                checked={form.advanced.freezeBackbone}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, advanced: { ...f.advanced, freezeBackbone: c } }))
                }
              />
              <span className="text-sm">Freeze backbone</span>
            </label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Epochs</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.advanced.epochs}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      advanced: {
                        ...f.advanced,
                        epochs: parseInt(e.target.value) || 10,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Batch size</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.advanced.batchSize}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      advanced: {
                        ...f.advanced,
                        batchSize: parseInt(e.target.value) || 32,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Learning rate</Label>
                <Input
                  type="number"
                  step={0.0001}
                  value={form.advanced.learningRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      advanced: {
                        ...f.advanced,
                        learningRate: parseFloat(e.target.value) || 0.0001,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery format</Label>
                <Input
                  value={form.advanced.deliveryFormat}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      advanced: { ...f.advanced, deliveryFormat: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Start Run"
        )}
      </Button>
    </form>
  )
}

import { useState } from "react"
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
import { FileUploadZone } from "./FileUploadZone"
import type { NewRunFormData, VisionModel } from "@/types"
import { Loader2 } from "lucide-react"

const PROMPT_PLACEHOLDERS = [
  "Fine-tune this to detect healthy vs diseased tomato leaves",
  "Train a classifier for cracked vs non-cracked concrete surfaces",
  "Classify indoor vs outdoor scenes",
]

interface PromptFormProps {
  onSubmit: (data: NewRunFormData) => Promise<void>
  isSubmitting?: boolean
  initialData?: Partial<NewRunFormData>
}

export function PromptForm({
  onSubmit,
  isSubmitting = false,
  initialData,
}: PromptFormProps) {
  const [prompt, setPrompt] = useState(initialData?.prompt ?? "")
  const [email, setEmail] = useState(initialData?.email ?? "")
  const [model, setModel] = useState<VisionModel>(initialData?.model ?? "efficientnet_b0")
  const [baseModelFile, setBaseModelFile] = useState<File[]>(
    initialData?.baseModelFile ? [initialData.baseModelFile] : []
  )
  const [referenceImages, setReferenceImages] = useState<File[]>(
    initialData?.referenceImages ?? []
  )
  const [dataSources, setDataSources] = useState(
    initialData?.dataSources ?? {
      webScraping: true,
      syntheticGeneration: true,
      augmentation: true,
      clipFiltering: true,
    }
  )
  const [advanced, setAdvanced] = useState(
    initialData?.advanced ?? {
      datasetSizeTarget: 1000,
      augmentationStrength: 0.5,
      clipThreshold: 0.7,
      freezeBackbone: false,
      epochs: 10,
      batchSize: 32,
      learningRate: 0.0001,
      deliveryFormat: "pytorch",
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      prompt,
      email,
      model,
      baseModelFile: baseModelFile[0],
      referenceImages,
      dataSources,
      advanced,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          placeholder={PROMPT_PLACEHOLDERS[0]}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <ModelSelector value={model} onChange={setModel} />

      <FileUploadZone
        label="Base model (optional)"
        description=".pth, .pt, or .onnx files"
        accept=".pth,.pt,.onnx"
        multiple={false}
        maxFiles={1}
        value={baseModelFile}
        onChange={(f) => setBaseModelFile(f)}
      />

      <FileUploadZone
        label="Reference images"
        description="Sample images for each class"
        value={referenceImages}
        onChange={setReferenceImages}
      />

      <div className="space-y-4">
        <Label>Data sources</Label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <Switch
              checked={dataSources.webScraping}
              onCheckedChange={(c) =>
                setDataSources((s) => ({ ...s, webScraping: c }))
              }
            />
            <span className="text-sm">Web Scraping</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={dataSources.syntheticGeneration}
              onCheckedChange={(c) =>
                setDataSources((s) => ({ ...s, syntheticGeneration: c }))
              }
            />
            <span className="text-sm">Synthetic Generation</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={dataSources.augmentation}
              onCheckedChange={(c) =>
                setDataSources((s) => ({ ...s, augmentation: c }))
              }
            />
            <span className="text-sm">Augmentation</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={dataSources.clipFiltering}
              onCheckedChange={(c) =>
                setDataSources((s) => ({ ...s, clipFiltering: c }))
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
              <Label>Dataset size target: {advanced.datasetSizeTarget}</Label>
              <Slider
                value={[advanced.datasetSizeTarget]}
                onValueChange={([v]) =>
                  setAdvanced((a) => ({ ...a, datasetSizeTarget: v }))
                }
                min={100}
                max={5000}
                step={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Augmentation strength: {advanced.augmentationStrength}</Label>
              <Slider
                value={[advanced.augmentationStrength]}
                onValueChange={([v]) =>
                  setAdvanced((a) => ({ ...a, augmentationStrength: v }))
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>CLIP threshold: {advanced.clipThreshold}</Label>
              <Slider
                value={[advanced.clipThreshold]}
                onValueChange={([v]) =>
                  setAdvanced((a) => ({ ...a, clipThreshold: v }))
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <label className="flex items-center gap-2">
              <Switch
                checked={advanced.freezeBackbone}
                onCheckedChange={(c) =>
                  setAdvanced((a) => ({ ...a, freezeBackbone: c }))
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
                  value={advanced.epochs}
                  onChange={(e) =>
                    setAdvanced((a) => ({
                      ...a,
                      epochs: parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Batch size</Label>
                <Input
                  type="number"
                  min={1}
                  value={advanced.batchSize}
                  onChange={(e) =>
                    setAdvanced((a) => ({
                      ...a,
                      batchSize: parseInt(e.target.value) || 32,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Learning rate</Label>
                <Input
                  type="number"
                  step={0.0001}
                  value={advanced.learningRate}
                  onChange={(e) =>
                    setAdvanced((a) => ({
                      ...a,
                      learningRate: parseFloat(e.target.value) || 0.0001,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery format</Label>
                <Input
                  value={advanced.deliveryFormat}
                  onChange={(e) =>
                    setAdvanced((a) => ({
                      ...a,
                      deliveryFormat: e.target.value,
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

import { useState } from "react"
import { HeroSection } from "@/components/HeroSection"
import { PipelineStepper } from "@/components/PipelineStepper"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { MOCK_PIPELINE_PROGRESS } from "@/data/mockData"
import { useNavigate } from "react-router-dom"
import { parsePrompt } from "@/lib/api"
import { DEMO_PRESETS } from "@/data/mockData"

export function Dashboard() {
  const navigate = useNavigate()
  const [expandedStage, setExpandedStage] = useState("")

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

  return (
    <div className="space-y-8">
      <HeroSection onLoadExample={handleLoadExample} />
      <div className="px-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Pipeline overview</h2>
            <p className="text-sm text-muted-foreground">
              End-to-end workflow from prompt to trained model
            </p>
          </CardHeader>
          <CardContent>
            <PipelineStepper
              stages={MOCK_PIPELINE_PROGRESS}
              expandedStage={expandedStage}
              onExpand={setExpandedStage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

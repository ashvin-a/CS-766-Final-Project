import { ChevronRight, Check, Loader2, X } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PipelineStageInfo } from "@/types"

const STAGE_ICONS: Record<string, string> = {
  prompt_parsing: "📝",
  data_collection: "🕷️",
  synthetic_generation: "🎨",
  augmentation: "🔄",
  filtering: "🔍",
  dataset_assembly: "📦",
  fine_tuning: "⚡",
  evaluation: "📊",
  delivery: "📤",
}

interface PipelineStepperProps {
  stages: PipelineStageInfo[]
  expandedStage?: string
  onExpand?: (id: string) => void
}

export function PipelineStepper({
  stages,
  expandedStage,
  onExpand,
}: PipelineStepperProps) {
  return (
    <div className="flex flex-col gap-2 overflow-x-auto pb-4 md:flex-row md:gap-0">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center">
          <Card
            className={cn(
              "min-w-[180px] cursor-pointer transition-shadow hover:shadow-md",
              expandedStage === stage.id && "ring-2 ring-primary"
            )}
            onClick={() => onExpand?.(expandedStage === stage.id ? "" : stage.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{STAGE_ICONS[stage.id] ?? "•"}</span>
                <span className="font-medium text-sm">{stage.label}</span>
                {stage.status === "completed" && (
                  <Check className="h-4 w-4 text-emerald-500" />
                )}
                {stage.status === "running" && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {stage.status === "failed" && (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </div>
              <Badge
                variant={
                  stage.status === "completed"
                    ? "success"
                    : stage.status === "running"
                    ? "default"
                    : stage.status === "failed"
                    ? "destructive"
                    : "secondary"
                }
                className="w-fit text-xs"
              >
                {stage.status}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {stage.status === "running" && stage.progress !== undefined && (
                <Progress value={stage.progress} className="h-1.5" />
              )}
              {expandedStage === stage.id && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>{stage.description}</p>
                  {stage.details && <p>{stage.details}</p>}
                  {stage.error && (
                    <p className="text-destructive">{stage.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {i < stages.length - 1 && (
            <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted-foreground md:block" />
          )}
        </div>
      ))}
    </div>
  )
}

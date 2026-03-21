import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChevronRight, Cpu } from "lucide-react"
import { Link } from "react-router-dom"
import type { TrainingRun } from "@/types"
import { VISION_MODELS } from "@/data/mockData"

interface TrainingRunCardProps {
  run: TrainingRun
}

export function TrainingRunCard({ run }: TrainingRunCardProps) {
  const modelLabel =
    VISION_MODELS.find((m) => m.value === run.model)?.label ?? run.model
  const lossData =
    run.loss?.map((l, i) => ({ epoch: i + 1, loss: l })) ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{run.id}</p>
          <p className="line-clamp-2 font-medium">{run.prompt}</p>
        </div>
        <Badge
          variant={
            run.status === "completed"
              ? "success"
              : run.status === "failed"
              ? "destructive"
              : run.status === "training" || run.status === "generating"
              ? "default"
              : "secondary"
          }
        >
          {run.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cpu className="h-4 w-4" />
          {modelLabel}
          <span>•</span>
          <span>{run.datasetSize} images</span>
        </div>
        {(run.trainAccuracy ?? run.valAccuracy) !== undefined && (
          <div className="flex gap-4 text-sm">
            {run.trainAccuracy !== undefined && (
              <span>
                Train: <strong>{(run.trainAccuracy * 100).toFixed(1)}%</strong>
              </span>
            )}
            {run.valAccuracy !== undefined && (
              <span>
                Val: <strong>{(run.valAccuracy * 100).toFixed(1)}%</strong>
              </span>
            )}
          </div>
        )}
        {lossData.length > 0 && (
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData}>
                <XAxis dataKey="epoch" hide />
                <YAxis hide />
                <Line
                  type="monotone"
                  dataKey="loss"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <Button variant="ghost" size="sm" asChild className="w-full">
          <Link to={`/results?run=${run.id}`}>
            View details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package } from "lucide-react"
import { MOCK_TRAINING_RUNS } from "@/data/mockData"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function Models() {
  const completedRuns = MOCK_TRAINING_RUNS.filter((r) => r.status === "completed")

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Models</h1>
        <p className="text-muted-foreground">
          Trained model artifacts ready for download
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {completedRuns.map((run) => (
          <Card key={run.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{run.id}</p>
                <p className="font-medium line-clamp-2">{run.prompt}</p>
              </div>
              <Badge variant="success">Ready</Badge>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Val accuracy: {(run.valAccuracy! * 100).toFixed(1)}%
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/results?run=${run.id}`}>View & download</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {completedRuns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No models yet</p>
            <p className="text-sm text-muted-foreground">
              Complete a training run to see models here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

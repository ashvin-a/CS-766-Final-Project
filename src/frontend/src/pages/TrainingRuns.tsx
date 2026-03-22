import { useState, useEffect } from "react"
import { TrainingRunCard } from "@/components/TrainingRunCard"
import { getTrainingRuns } from "@/utils/api"
import type { TrainingRun } from "@/types"

export function TrainingRuns() {
  const [runs, setRuns] = useState<TrainingRun[]>([])

  useEffect(() => {
    getTrainingRuns().then(setRuns)
  }, [])

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Training Runs</h1>
        <p className="text-muted-foreground">
          Monitor and inspect your fine-tuning runs
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {runs.map((run) => (
          <TrainingRunCard key={run.id} run={run} />
        ))}
      </div>
    </div>
  )
}

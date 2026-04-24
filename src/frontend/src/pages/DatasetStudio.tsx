import { DatasetGallery } from "@/components/DatasetGallery"
import { MOCK_RUN_PIPELINE_RESPONSE } from "@/data/mockData"

export function DatasetStudio() {
  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Dataset Studio</h1>
        <p className="text-muted-foreground">
          Review pipeline output: class list and run metrics from the last run response
        </p>
      </div>
      <DatasetGallery pipelineResult={MOCK_RUN_PIPELINE_RESPONSE} />
    </div>
  )
}

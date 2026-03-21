import { DatasetGallery } from "@/components/DatasetGallery"
import {
  MOCK_DATASET_IMAGES,
  MOCK_CLASS_DISTRIBUTION,
} from "@/data/mockData"

export function DatasetStudio() {
  const filteringStats = {
    accepted: 1240,
    rejected: 156,
  }

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Dataset Studio</h1>
        <p className="text-muted-foreground">
          Browse scraped, generated, and augmented images by class
        </p>
      </div>
      <DatasetGallery
        images={MOCK_DATASET_IMAGES}
        distribution={MOCK_CLASS_DISTRIBUTION}
        filteringStats={filteringStats}
      />
    </div>
  )
}

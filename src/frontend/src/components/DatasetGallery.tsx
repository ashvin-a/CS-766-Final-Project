import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import type { DatasetImage, ClassDistribution } from "@/types"

const SOURCE_COLORS: Record<string, string> = {
  scraped: "bg-blue-500/80",
  generated: "bg-purple-500/80",
  augmented: "bg-amber-500/80",
  filtered_out: "bg-red-500/50",
}

interface DatasetGalleryProps {
  images: DatasetImage[]
  distribution: ClassDistribution[]
  filteringStats?: { accepted: number; rejected: number }
}

export function DatasetGallery({
  images,
  distribution,
  filteringStats,
}: DatasetGalleryProps) {
  const chartData = distribution.map((d) => ({
    name: d.className,
    count: d.count,
    scraped: d.scraped,
    generated: d.generated,
    augmented: d.augmented,
  }))

  return (
    <div className="space-y-6">
      {filteringStats && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Filtering stats</h3>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <span className="text-2xl font-bold text-emerald-500">
                  {filteringStats.accepted}
                </span>
                <span className="ml-2 text-muted-foreground">accepted</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-red-500">
                  {filteringStats.rejected}
                </span>
                <span className="ml-2 text-muted-foreground">rejected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Class distribution</h3>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="scraped" stackId="a" fill="rgb(59 130 246)" />
                <Bar dataKey="generated" stackId="a" fill="rgb(168 85 247)" />
                <Bar dataKey="augmented" stackId="a" fill="rgb(245 158 11)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <Card key={img.id} className="overflow-hidden">
            <div className="aspect-square bg-muted">
              <img
                src={img.thumbnailUrl ?? img.url}
                alt={img.classLabel}
                className="h-full w-full object-cover"
              />
            </div>
            <CardContent className="flex items-center justify-between p-2">
              <Badge variant="outline">{img.classLabel}</Badge>
              <Badge
                className={cn("text-xs", SOURCE_COLORS[img.source] ?? "bg-muted")}
              >
                {img.source.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { RunPipelineApiResponse } from "@/types"

const CLASS_BAR_COLORS = [
  "rgb(59 130 246)",
  "rgb(168 85 247)",
  "rgb(34 197 94)",
  "rgb(245 158 11)",
  "rgb(236 72 153)",
  "rgb(20 184 166)",
]

interface DatasetGalleryProps {
  pipelineResult: RunPipelineApiResponse
}

export function DatasetGallery({ pipelineResult: data }: DatasetGalleryProps) {
  const classBarData = data.classes.map((name, i) => ({
    name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
    key: name,
    weight: 1,
    fill: CLASS_BAR_COLORS[i % CLASS_BAR_COLORS.length]!,
  }))

  const codeOk = data.code >= 200 && data.code < 300

  return (
    <div className="space-y-8">
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardDescription>Pipeline run summary</CardDescription>
          <h3 className="text-lg font-semibold tracking-tight">Metrics &amp; classes</h3>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">HTTP code</p>
              <p className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums">{data.code}</span>
                {codeOk ? (
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                    OK
                  </Badge>
                ) : (
                  <Badge variant="destructive">Error</Badge>
                )}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Model confidence</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {(data.confidence * 100).toFixed(1)}%
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, data.confidence * 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Total time</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {data.total_time.toFixed(1)}
                <span className="ml-1 text-base font-normal text-muted-foreground">s</span>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Classes in run</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {data.classes.map((c) => (
                <Badge key={c} variant="outline" className="text-sm">
                  {c}
                </Badge>
              ))}
            </div>
            <div className="h-64 min-h-[16rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classBarData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                    formatter={(value, _name, props) => [
                      String((props?.payload as { key?: string })?.key ?? value),
                      "Class",
                    ]}
                  />
                  <Bar dataKey="weight" name="Class" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {classBarData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Equal bar height indicates each listed class is included in the run; compare labels on
              the left.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

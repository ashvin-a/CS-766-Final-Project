import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RunResult } from "@/types"

interface MetricsPanelProps {
  result: RunResult
}

export function MetricsPanel({ result }: MetricsPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Final metrics</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Final accuracy</p>
              <p className="text-2xl font-bold font-mono">
                {(result.finalAccuracy * 100).toFixed(1)}%
              </p>
            </div>
            {result.baselineAccuracy !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Baseline</p>
                <p className="text-2xl font-mono text-muted-foreground">
                  {(result.baselineAccuracy * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
          {result.confusionMatrix && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Confusion matrix
              </p>
              <div className="inline-block rounded-lg border p-2 font-mono text-sm">
                {result.confusionMatrix.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    {row.map((cell, j) => (
                      <span
                        key={j}
                        className={cn(
                          "w-8 text-center",
                          i === j && "font-bold text-primary"
                        )}
                      >
                        {cell}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Model artifact</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.downloadUrl ? (
            <Button asChild>
              <a href={result.downloadUrl} download>
                <Download className="h-4 w-4" />
                Download model
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pre-signed link placeholder (wire to backend)
            </p>
          )}
          <div className="flex items-center gap-2">
            {result.emailSent ? (
              <Badge variant="success" className="gap-1">
                <Mail className="h-3 w-3" />
                Email sent
              </Badge>
            ) : (
              <Badge variant="secondary">Email pending</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {result.samplePredictions && result.samplePredictions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Sample predictions</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {result.samplePredictions.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 rounded-lg border p-3"
                >
                  <img
                    src={s.imageUrl}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                  <div className="text-center text-xs">
                    <p>
                      Predicted: <strong>{s.predicted}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Actual: {s.actual}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

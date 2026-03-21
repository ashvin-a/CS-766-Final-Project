import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ParsedPrompt } from "@/types"

interface ParsedPromptPreviewProps {
  parsed: ParsedPrompt
}

export function ParsedPromptPreview({ parsed }: ParsedPromptPreviewProps) {

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Parsed prompt</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {(parsed.confidence * 100).toFixed(0)}% confidence
          </Badge>
          {parsed.reasoning && (
            <span className="text-xs text-muted-foreground">
              {parsed.reasoning}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Extracted classes
          </h4>
          <div className="flex flex-wrap gap-2">
            {parsed.classes.map((c) => (
              <Badge key={c} variant="outline" className="gap-1">
                {c}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Search prompts
          </h4>
          <ul className="space-y-1 text-sm">
            {parsed.searchPrompts.map((p, i) => (
              <li key={i} className="font-mono text-muted-foreground">
                • {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Diffusion prompts
          </h4>
          <ul className="space-y-1 text-sm">
            {parsed.diffusionPrompts.map((p, i) => (
              <li key={i} className="font-mono text-muted-foreground">
                • {p}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

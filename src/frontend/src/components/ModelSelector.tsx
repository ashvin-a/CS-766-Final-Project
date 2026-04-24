import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { VISION_MODELS } from "@/data/mockData"
import type { VisionModel } from "@/types"

interface ModelSelectorProps {
  value: VisionModel
  onChange: (value: VisionModel) => void
  disabled?: boolean
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Vision model</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as VisionModel)}
        disabled={disabled}
      >
        <SelectTrigger className="bg-black text-white border-zinc-700">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="bg-black text-white border-zinc-700">
          {VISION_MODELS.map((m) => (
            <SelectItem
              key={m.value}
              value={m.value}
              className="text-white focus:bg-zinc-800 focus:text-white data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white"
            >
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

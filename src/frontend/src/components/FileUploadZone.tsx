import { useCallback, useState } from "react"
import { Upload, X, File } from "lucide-react"
import { cn } from "@/utils/utils"

interface FileUploadZoneProps {
  accept?: string
  multiple?: boolean
  maxFiles?: number
  label: string
  description?: string
  value: File[]
  onChange: (files: File[]) => void
  className?: string
}

export function FileUploadZone({
  accept = "image/*,.pth,.pt,.onnx",
  multiple = true,
  maxFiles = 10,
  label,
  description,
  value,
  onChange,
  className,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      const valid = files.slice(0, maxFiles - value.length)
      if (valid.length) onChange([...value, ...valid])
    },
    [value, maxFiles, onChange]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.slice(0, maxFiles - value.length)
    if (valid.length) onChange([...value, ...valid])
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
          value.length >= maxFiles && "opacity-60"
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={value.length >= maxFiles}
          className="hidden"
          id={`file-upload-${label.replace(/\s/g, "-")}`}
        />
        <label
          htmlFor={`file-upload-${label.replace(/\s/g, "-")}`}
          className="flex cursor-pointer flex-col items-center gap-2"
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {value.length >= maxFiles
              ? `Maximum ${maxFiles} files`
              : "Drag and drop or click to browse"}
          </span>
        </label>
        {value.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {value.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm"
              >
                <File className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="rounded p-0.5 hover:bg-destructive/20"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

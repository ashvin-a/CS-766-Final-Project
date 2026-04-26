// Core types for Prompt-to-Model

export type PipelineStage =
  | "prompt_parsing"
  | "data_collection"
  | "synthetic_generation"
  | "augmentation"
  | "filtering"
  | "dataset_assembly"
  | "fine_tuning"
  | "evaluation"
  | "delivery"

export type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped"

export type RunStatus =
  | "queued"
  | "parsing"
  | "generating"
  | "training"
  | "validating"
  | "completed"
  | "failed"

export type ImageSource = "scraped" | "generated" | "augmented" | "filtered_out"

export type VisionModel =
  | "resnet50"
  | "mobilenetv3"
  | "efficientnet_b0"
  | "convnext"
  | "vit_b16"
  | "clip_classifier"
  | "custom_onnx"

export interface ParsedPrompt {
  classes: string[]
  searchPrompts: string[]
  diffusionPrompts: string[]
  confidence: number
  reasoning?: string
}

export interface PipelineStageInfo {
  id: PipelineStage
  label: string
  description: string
  status: StageStatus
  progress?: number
  details?: string
  error?: string
}

export interface DatasetImage {
  id: string
  url: string
  classLabel: string
  source: ImageSource
  thumbnailUrl?: string
}

export interface ClassDistribution {
  className: string
  count: number
  scraped: number
  generated: number
  augmented: number
}

export interface TrainingRun {
  id: string
  prompt: string
  model: VisionModel
  status: RunStatus
  datasetSize: number
  trainAccuracy?: number
  valAccuracy?: number
  loss?: number[]
  createdAt: string
  completedAt?: string
  pipelineStages?: PipelineStageInfo[]
}

export interface RunResult {
  runId: string
  finalAccuracy: number
  baselineAccuracy?: number
  downloadUrl?: string
  emailSent: boolean
  confusionMatrix?: number[][]
  baselineConfusionMatrix?: number[][]
  finetunedConfusionMatrix?: number[][]
  samplePredictions?: { imageUrl: string; predicted: string; actual: string }[]
}

/** Shape returned by the backend /run/ pipeline (dataset & training summary). */
export interface RunPipelineApiResponse {
  classes: string[]
  code: number
  searchPrompts: string
  diffusionPrompts: string[]
  confidence: number
  total_time: number
}

export interface NewRunFormData {
  prompt: string
  email: string
  model: VisionModel
  dataSources: {
    webScraping: boolean
    syntheticGeneration: boolean
    augmentation: boolean
    clipFiltering: boolean
  }
  advanced: {
    classesOverride?: string[]
    datasetSizeTarget: number
    augmentationStrength: number
    clipThreshold: number
    freezeBackbone: boolean
    epochs: number
    batchSize: number
    learningRate: number
    deliveryFormat: string
  }
}

/** JSON-serializable shape POSTed to the sample run API. */
export interface NewRunFormJsonPayload {
  prompt: string
  email: string
  model: VisionModel
  dataSources: NewRunFormData["dataSources"]
  advanced: NewRunFormData["advanced"]
}

export interface PromptFormState {
  prompt: string
  email: string
  model: VisionModel
  dataSources: NewRunFormData["dataSources"]
  advanced: NewRunFormData["advanced"]
}

import type { ParsedPrompt, PipelineStageInfo, TrainingRun, RunResult, RunPipelineApiResponse } from "@/types"

export const DEMO_PRESETS = [
  {
    id: "tomato",
    name: "Healthy vs Diseased Tomato Leaves",
    prompt:
      "Fine-tune this to detect healthy vs diseased tomato leaves for agricultural monitoring",
    classes: ["healthy", "diseased"],
    searchPrompts: [
      "healthy tomato leaf",
      "diseased tomato leaf blight",
      "tomato plant leaf spot",
    ],
    diffusionPrompts: [
      "photograph of a healthy green tomato leaf, natural lighting",
      "photograph of a diseased tomato leaf with yellow spots and wilting",
    ],
  },
  {
    id: "concrete",
    name: "Cracked vs Non-Cracked Concrete",
    prompt:
      "Train a classifier for cracked vs non-cracked concrete surfaces for infrastructure inspection",
    classes: ["cracked", "non-cracked"],
    searchPrompts: [
      "cracked concrete pavement",
      "smooth concrete surface",
      "concrete crack repair",
    ],
    diffusionPrompts: [
      "high resolution photo of cracked concrete surface, construction",
      "high resolution photo of smooth intact concrete surface",
    ],
  },
] as const

export const VISION_MODELS = [
  { value: "resnet50", label: "ResNet50" },
  { value: "mobilenetv3", label: "MobileNetV3" },
  { value: "efficientnet_b0", label: "EfficientNet-B0" },
  { value: "vit_b16", label: "ViT-B/16" },
  { value: "clip_classifier", label: "CLIP-based classifier" },
  { value: "custom_onnx", label: "Custom ONNX upload" },
] as const

export const PIPELINE_STAGES: Omit<PipelineStageInfo, "status" | "progress" | "details" | "error">[] = [
  { id: "prompt_parsing", label: "Prompt Parsing", description: "Extract classes and generate prompts" },
  { id: "data_collection", label: "Data Collection", description: "Web scraping for reference images" },
  { id: "synthetic_generation", label: "Synthetic Generation", description: "Diffusion-based image generation" },
  { id: "augmentation", label: "Augmentation", description: "Apply augmentations" },
  { id: "filtering", label: "Filtering", description: "CLIP similarity filtering" },
  { id: "dataset_assembly", label: "Dataset Assembly", description: "Assemble final dataset" },
  { id: "fine_tuning", label: "Fine-Tuning", description: "Train the model" },
  { id: "evaluation", label: "Evaluation", description: "Validate and evaluate" },
  { id: "delivery", label: "Delivery", description: "Save model and notify" },
]

export const MOCK_PARSED_PROMPT: ParsedPrompt = {
  classes: ["healthy", "diseased"],
  searchPrompts: [
    "healthy tomato leaf",
    "diseased tomato leaf blight",
    "tomato plant leaf spot",
  ],
  diffusionPrompts: [
    "photograph of a healthy green tomato leaf, natural lighting",
    "photograph of a diseased tomato leaf with yellow spots and wilting",
  ],
  confidence: 0.92,
  reasoning: "Identified binary classification task for agricultural plant health.",
}

export const MOCK_PIPELINE_PROGRESS: PipelineStageInfo[] = PIPELINE_STAGES.map((stage, i) => ({
  ...stage,
  status: i < 4 ? "completed" : i === 4 ? "running" : "pending",
  progress: i < 4 ? 100 : i === 4 ? 65 : 0,
  details: i === 4 ? "Filtering 1,240 images with CLIP..." : undefined,
}))

export const MOCK_TRAINING_RUNS: TrainingRun[] = [
  {
    id: "run-001",
    prompt: "Healthy vs diseased tomato leaves",
    model: "efficientnet_b0",
    status: "completed",
    datasetSize: 1240,
    trainAccuracy: 0.94,
    valAccuracy: 0.89,
    loss: [0.8, 0.5, 0.35, 0.22, 0.15],
    createdAt: "2025-03-20T10:00:00Z",
    completedAt: "2025-03-20T12:30:00Z",
    pipelineStages: MOCK_PIPELINE_PROGRESS,
  },
  {
    id: "run-002",
    prompt: "Cracked vs non-cracked concrete",
    model: "resnet50",
    status: "training",
    datasetSize: 890,
    trainAccuracy: 0.82,
    valAccuracy: 0.78,
    loss: [0.6, 0.4, 0.28],
    createdAt: "2025-03-21T09:00:00Z",
    pipelineStages: MOCK_PIPELINE_PROGRESS.map((s, i) => ({
      ...s,
      status: i < 6 ? "completed" : i === 6 ? "running" : "pending",
      progress: i < 6 ? 100 : i === 6 ? 45 : 0,
    })),
  },
  {
    id: "run-003",
    prompt: "Indoor vs outdoor scenes",
    model: "vit_b16",
    status: "queued",
    datasetSize: 0,
    createdAt: "2025-03-21T11:00:00Z",
  },
]

export const MOCK_RUN_RESULT: RunResult = {
  runId: "run-001",
  finalAccuracy: 0.89,
  baselineAccuracy: 0.72,
  downloadUrl: "https://storage.example.com/models/run-001/model.pt",
  emailSent: true,
  confusionMatrix: [
    [85, 12],
    [8, 92],
  ],
  samplePredictions: [
    {
      imageUrl: "https://placehold.co/128x128/22c55e/white?text=H",
      predicted: "healthy",
      actual: "healthy",
    },
    {
      imageUrl: "https://placehold.co/128x128/ef4444/white?text=D",
      predicted: "diseased",
      actual: "diseased",
    },
  ],
}

/** Sample pipeline response for Dataset Studio visualizations (matches /run/ JSON shape). */
export const MOCK_RUN_PIPELINE_RESPONSE: RunPipelineApiResponse = {
  classes: ["healthy", "diseased"],
  code: 200,
  searchPrompts:
    "[['healthy tomato leaf', 'diseased tomato blight'], ['tomato plant leaf spot', 'leaf mold']]",
  diffusionPrompts: [],
  confidence: 0.89,
  total_time: 184.52,
}

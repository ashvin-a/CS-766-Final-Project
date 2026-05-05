  
\# Data Generation and Processing

The data pipeline is composed of four discrete, sequentially orchestrated subsystems: prompt parsing, image acquisition (web scraping and synthetic generation), quality filtering, and augmentation. Each stage is triggered by the central FastAPI orchestrator in \`src/main.py\`.  
\#\# Sourcing

\#\#\# LLM-Driven Prompt Parsing

Raw user input (e.g., "Fine-tune this to detect healthy vs. diseased tomato leaves") is routed to the orchestrator module (\`src/orchestrator/orchestrator.py\`), which delegates to a large language model via the Groq inference API. The LLM is instructed, via a structured system prompt, to return a JSON object containing (a) the extracted class labels (singularized) and (b) three highly specific Google Image search queries per class. The response is sanitized of any markdown fencing and repaired using the \`json\_repair\` library before deserialization. The system prompt is defined as follows:

\`\`\`python  
\# src/orchestrator/orchestrator.py

system\_prompt \= """  
You are an AI assistant helping to build computer vision datasets.  
The user will provide a description of a vision classifier they  
want to train. You must extract the exact target classes and  
generate 3 highly specific Google Image search queries for each  
class.

You MUST respond ONLY with a valid JSON object in this exact format:  
{  
  "classes": \["class1", "class2"\],  
  "search\_queries": {  
    "class1": \["query 1", "query 2", "query 3"\],  
    "class2": \["query 1", "query 2", "query 3"\]  
  }  
}  
The target classes should be made singular while generating the  
JSON object. Make sure that the search queries are highly relevant  
with the corresponding class.  
"""  
\`\`\`

\#\#\# Web Scraping (Bing Images)

For each class-keyword pair, the scraper module (\`src/scraper/scraper.py\`) launches a headless Chromium browser via Playwright, navigates to Bing Image Search, waits for JavaScript-rendered tile anchors (\`a.iusc\`), scrolls to trigger lazy-loading, and then extracts full-resolution image URLs from the \`murl\` field embedded in each tile's JSON \`m\` attribute. BeautifulSoup handles the HTML parsing. A fallback path extracts thumbnail \`src\` attributes from \`img.mimg\` elements when the primary selector yields no results. The scraper is configurable via environment variables: \`MAX\_IMAGES\` (default 20 per query), \`REQUEST\_TIMEOUT\` (default 30s), and a custom \`USER\_AGENT\` string.

\#\#\# Synthetic Image Generation (Diffusion Models)

When the user enables synthetic generation, the system invokes \`generate\_diffusion\_dataset()\` in \`src/diffusion/flux\_api\_hf.py\`. This function first calls the LLM (\`openai/gpt-oss-120b\` via Groq) to produce an optimized base prompt for the given class, then requests up to 100 prompt variations through a second LLM call (\`prompt\_variations()\`). Each variation is sent to the Hugging Face Inference API targeting the FLUX.1-schnell model (\`black-forest-labs/FLUX.1-schnell\`). Generated images are saved as PNG files with a SHA-256-derived run hash in the filename for deduplication.

\#\# Pipeline and Preprocessing

\#\#\# Train/Test Splitting

The \`DataGenerator\` class (\`src/data\_generator/main.py\`) reorganizes the flat \`downloads/\<class\>/\` directory structure into \`downloads/train/\<class\>/\` and \`downloads/test/\<class\>/\` subdirectories using a seeded (\`seed=42\`) 80/20 random split. At least one test image is guaranteed per class when more than one image is available. The split is idempotent: if the \`train/\` and \`test/\` directories already exist, it short-circuits with existing counts.

\#\#\# Data Augmentation

Applied exclusively to the training split, augmentation generates N copies per original image (default 5, configurable via \`copies\_per\_image\`) using a \`torchvision.transforms.Compose\` pipeline. The augmentation transforms are defined as follows:

\`\`\`python  
\# src/data\_generator/main.py

AUGMENTATION\_PIPELINE \= transforms.Compose(\[  
    transforms.RandomHorizontalFlip(p=0.5),  
    transforms.RandomRotation(degrees=20),  
    transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),  
    transforms.ColorJitter(  
        brightness=0.3,  
        contrast=0.3,  
        saturation=0.3,  
        hue=0.1  
    ),  
\])  
\`\`\`

Augmented files are prefixed with \`aug\_\` to prevent re-augmentation on subsequent runs.

\#\#\# CLIP Relevance Filtering

When enabled, the \`CLIPRelevanceVerifier\` (\`src/filters/clip\_relevance.py\`) loads the \`openai/clip-vit-base-patch32\` model and computes cosine similarity between each image's CLIP embedding and a text probe constructed from the class label and user prompt (via \`make\_text\_probe()\` in \`src/filters/text\_probes.py\`). Images scoring below \`RELEVANCE\_THRESHOLD\` (default 0.22) are deleted from disk. The filter is applied to both \`train/\` and \`test/\` subdirectories for each class. A minimum post-filter image count (\`MIN\_IMAGES\_AFTER\_FILTER\`, default 3\) is enforced; if any class falls below this threshold, the pipeline returns an error rather than training on an insufficient dataset.

\#\#\# Corrupt Image Removal

During data loading, the \`Trainer.remove\_corrupt\_images()\` method attempts to open and fully load every image with Pillow. Files that fail are deleted from disk and excluded from the dataset.

\#\#\# Normalization for Model Ingestion

At training and evaluation time, all images are resized to 224×224 pixels and normalized to ImageNet channel statistics. The preprocessing transform chain is:

\`\`\`python  
\# src/trainer/train.py

data\_transforms \= transforms.Compose(\[  
    transforms.Resize((224, 224)),  
    transforms.ToTensor(),  
    transforms.Normalize(  
        mean=\[0.485, 0.456, 0.406\],  
        std=\[0.229, 0.224, 0.225\]  
    ),  
\])  
\`\`\`

\#\# Storage and Formatting

\#\#\# Local Filesystem

Images are stored on disk under \`downloads/\<class\_name\>/\` (post-scraping) and reorganized into \`downloads/train/\<class\>/\` and \`downloads/test/\<class\>/\` after splitting. Filenames include a zero-padded index and an 8-character MD5 hash of the source URL for deduplication. The \`LocalStorage\` class (\`src/scraper/storage.py\`) handles streaming downloads with configurable timeouts.

\#\#\# SQLite Metadata Store

An optional SQLite database (\`image\_scraper.db\`) persists lightweight metadata per image. The schema enforces a \`UNIQUE(keyword, image\_url)\` constraint with \`INSERT OR IGNORE\` semantics to handle duplicate URLs gracefully. Image binary data is never stored in the database. The schema is as follows:

| Column | Type | Constraint |  
|---|---|---|  
| \`id\` | INTEGER | PRIMARY KEY AUTOINCREMENT |  
| \`keyword\` | TEXT | NOT NULL |  
| \`image\_url\` | TEXT | NOT NULL |  
| \`local\_path\` | TEXT | — |  
| \`scraped\_at\` | TEXT | NOT NULL |

\*Table 1\. SQLite images table schema.\*

\#\#\# PyTorch Dataset

For training, \`torchvision.datasets.ImageFolder\` is used to infer class labels from the directory hierarchy under \`downloads/train/\`. The trainer performs label remapping to ensure contiguous 0-based indices compatible with \`nn.CrossEntropyLoss\`, filtering samples to include only the classes specified in the original user prompt.

\---

\# Methodology

\#\# System Architecture

The system follows a three-tier architecture: a React single-page application (frontend), a FastAPI server (backend orchestrator), and external inference APIs (Groq for LLM, Hugging Face for diffusion).

The end-to-end pipeline executes the following stages sequentially within a single synchronous \`POST /run/\` request handler:

1\. \*\*Prompt Parsing\*\* — The user's natural-language prompt is forwarded to the Groq-hosted LLM, which returns structured JSON containing class names and per-class search queries.  
2\. \*\*Data Collection\*\* — For each class-keyword pair, the scraper launches a headless browser, retrieves image URLs from Bing, and downloads them to local disk.  
3\. \*\*Synthetic Generation (optional)\*\* — The LLM generates diffusion-optimized prompt variations, which are sent to the FLUX.1-schnell model via the Hugging Face Inference API. Generated images are saved alongside scraped images.  
4\. \*\*Dataset Assembly\*\* — The DataGenerator splits images into train/test sets (80/20).  
5\. \*\*CLIP Filtering (optional)\*\* — Low-relevance images are purged from both splits based on CLIP cosine similarity scores.  
6\. \*\*Augmentation (optional)\*\* — Training images are augmented with random geometric and photometric transforms.  
7\. \*\*Fine-Tuning\*\* — A pretrained CNN backbone is loaded, its feature-extraction layers are frozen, and a new classification head is trained on the assembled dataset.  
8\. \*\*Evaluation\*\* — Triggered separately via \`POST /test/\`, which loads the finetuned checkpoint and a fresh pretrained baseline, runs inference on the held-out test set, and returns confusion matrices and per-class accuracy metrics for both.

\#\# Algorithmic Choices

\#\#\# Transfer Learning with Frozen Backbones

The project adopts a transfer-learning paradigm: a CNN pretrained on ImageNet-1K is loaded, all backbone parameters are frozen (\`requires\_grad \= False\`), and only a newly initialized classification head (a single \`nn.Linear\` layer matching the number of target classes) is trained. This design choice is motivated by the small, noisy datasets typical of automated scraping and generation — freezing the backbone prevents catastrophic forgetting and reduces training time to minutes rather than hours.

\#\#\# CLIP-Based Quality Assurance

Rather than relying solely on keyword relevance from the search engine, the system employs CLIP (\`openai/clip-vit-base-patch32\`) as a semantic filter. By computing image–text cosine similarity against a probe derived from the class label and the user's task description, the system removes off-topic or low-quality images before they enter the training set. The text probe is constructed as:

\`\`\`python  
\# src/filters/text\_probes.py

def make\_text\_probe(class\_name, user\_prompt=None):  
    if user\_prompt:  
        return f'{user\_prompt}. A clear photo showing: {class\_name}.'  
    return f"a photo of {class\_name}"  
\`\`\`

\#\#\# LLM-as-Orchestrator Pattern

The LLM serves a dual role: (a) as a structured information extractor (parsing natural language into class labels and search queries) and (b) as a prompt engineer (generating diverse, high-quality diffusion prompts). The \`json\_repair\` library provides resilience against malformed JSON output from the LLM, a common failure mode with instruction-following models.

\#\#\# Headless Browser Scraping

Playwright was chosen over static HTTP scraping (e.g., \`requests\` \+ BeautifulSoup alone) because Bing Image Search renders results via JavaScript, making server-side HTML insufficient. The scraper performs three scroll iterations to trigger lazy-loading of additional image tiles.

\#\# Integration

\#\#\# Backend API (FastAPI)

The backend exposes four REST endpoints:

| Endpoint | Method | Purpose |  
|---|---|---|  
| \`/run/\` | POST | Executes the full data-generation and training pipeline |  
| \`/test/\` | POST | Runs baseline vs. finetuned evaluation on the test split |  
| \`/parse-user-prompt/\` | POST | Standalone prompt-parsing (LLM call only) |  
| \`/generate-dataset/\` | POST | Standalone scraping by keyword |

\*Table 2\. FastAPI REST endpoint inventory.\*

Request/response bodies use Pydantic models (\`RunRequest\`, \`DataSources\`, \`AdvancedSettings\`) for validation. CORS is configured to allow requests from \`localhost:5173\` and \`localhost:3000\` (Vite and alternative dev server ports).

\#\#\# Frontend (React \+ Vite \+ Tailwind CSS)

The SPA communicates with the backend via \`fetch()\` calls in \`src/frontend/src/utils/api.ts\`. The primary interaction flow is:

1\. The user fills out a \`PromptForm\` component (prompt, email, model selection, data source toggles, advanced hyperparameters).  
2\. On submission, a JSON payload is POSTed to \`/run/\`. The request is synchronous and blocking — the frontend displays a timed pipeline progress visualization (\`PipelineStepper\`) driven by estimated per-stage durations while waiting for the backend response.  
3\. After \`/run/\` returns, the frontend transitions to a polling phase, sending \`POST /test/\` requests every 5 seconds (with a configurable 75-second timeout) until evaluation metrics are available.  
4\. Results (confusion matrices, accuracy delta) are persisted in \`localStorage\` and rendered on a dedicated Results page.

Run state (phase, timestamps, errors, data-source configuration) is synchronized across pages via \`localStorage\` and a custom \`runstatechange\` DOM event, consumed by the \`useRunState()\` hook.

\#\#\# External API Integrations

\*\*Groq API:\*\* The \`CustomLLM\` class (\`src/utils/llm.py\`) wraps a standard OpenAI-compatible chat completions endpoint. Authentication is via a bearer token (\`GROQ\_API\_KEY\`). The \`trust\_env\` flag on the \`requests.Session\` is explicitly disabled to avoid proxy interference.

\*\*Hugging Face Inference API:\*\* The \`InferenceClient\` from \`huggingface\_hub\` is used with the \`hf-inference\` provider for text-to-image generation. Authentication is via \`HF\_TOKEN\`.

\---

\# Models

\#\# Architecture and Selection

The system employs models across four distinct functional roles:

\#\#\# Large Language Model (Prompt Parsing and Prompt Engineering)

| Attribute | Value |  
|---|---|  
| Model | \`openai/gpt-oss-120b\` (120B-parameter open-source model) |  
| Provider | Groq inference API |  
| Usage | Extracting class labels and search queries; generating base diffusion prompts; producing up to 100 prompt variations |

\*Table 3\. LLM specification.\*

\#\#\# Text-to-Image Diffusion Model (Synthetic Data Generation)

| Attribute | Value |  
|---|---|  
| Primary Model | \`black-forest-labs/FLUX.1-schnell\` (fast distilled variant) |  
| Provider | Hugging Face Inference API (serverless) |  
| Explored Alternative 1 | \`stable-diffusion-v1-5\` — local inference via diffusers \`AutoPipelineForText2Image\`, FP16, \`torch.compile\` |  
| Explored Alternative 2 | \`stable-diffusion-xl-base-1.0\` via StableDiffusionAPI REST endpoint |  
| Explored Alternative 3 | \`FLUX.1-dev\` via Gradio client |

\*Table 4\. Diffusion model specification and explored alternatives.\*

\#\#\# CLIP Model (Relevance Filtering)

| Attribute | Value |  
|---|---|  
| Model | \`openai/clip-vit-base-patch32\` (ViT-B/32) |  
| Provider | Loaded locally via \`transformers.CLIPModel\` and \`CLIPProcessor\` |  
| Usage | Cosine similarity between image and text embeddings to filter irrelevant scraped images |

\*Table 5\. CLIP model specification.\*

\#\#\# Vision Classification Models (Fine-Tuning Targets)

The user selects from four ImageNet-1K pretrained architectures, all loaded via \`torchvision.models\`:

| Enum Value | Architecture | Pretrained Weights |  
|---|---|---|  
| \`RESNET\_50\` | ResNet-50 | \`ResNet50\_Weights.IMAGENET1K\_V1\` |  
| \`MOBILENET\_V3\` | MobileNetV3-Large | \`MobileNet\_V3\_Large\_Weights.IMAGENET1K\_V1\` |  
| \`EFFICIENTNET\` | EfficientNet-B0 | \`EfficientNet\_B0\_Weights.IMAGENET1K\_V1\` |  
| \`CONV\_NEXT\` | ConvNeXt-Tiny | \`ConvNeXt\_Tiny\_Weights.IMAGENET1K\_V1\` |

\*Table 6\. Supported vision model architectures and their pretrained weight identifiers.\*

\#\# Implementation Details

\#\#\# LLM Access

The \`CustomLLM\` wrapper (\`src/utils/llm.py\`) constructs a standard OpenAI-compatible chat completions payload and sends it to the configured Groq endpoint. No fine-tuning or local model hosting is performed — all LLM inference is API-based.

\#\#\# Diffusion Model Access

FLUX.1-schnell is accessed exclusively via the Hugging Face serverless Inference API (\`InferenceClient.text\_to\_image()\`). No local diffusion model weights are downloaded or fine-tuned. The alternative Stable Diffusion v1.5 path in \`text\_to\_image.py\` uses \`AutoPipelineForText2Image.from\_pretrained()\` with FP16 precision and \`torch.compile(mode="reduce-overhead", fullgraph=True)\` for UNet acceleration, but this path is not invoked by the main pipeline.

\#\#\# CLIP Model Access

The CLIP model is loaded locally from Hugging Face Hub on first use (lazy initialization) and cached in memory for subsequent scoring calls within the same process lifetime. Inference runs in \`torch.no\_grad()\` mode with explicit L2-normalization of both image and text embeddings before computing dot-product similarity.

\#\#\# Vision Model Fine-Tuning

The \`ModelBuilder\` class (\`src/utils/model\_builder.py\`) implements a transfer-learning strategy:

1\. Load a pretrained backbone from \`torchvision.models\` with official ImageNet-1K weights.  
2\. Freeze all parameters: \`param.requires\_grad \= False\` for every parameter.  
3\. Replace the final classification head via \`\_replace\_classifier\_head()\`, which locates the terminal \`nn.Linear\` layer (\`.fc\` for ResNet, or the last \`nn.Linear\` found via \`named\_modules()\` for other architectures) and replaces it with a new \`nn.Linear(in\_features, num\_classes)\`. The new head's parameters are trainable by default.  
4\. Move the model to GPU if available.

The trained checkpoint is saved as a dictionary containing both the \`state\_dict\` and the architecture identifier string, enabling the evaluation module to reconstruct the correct skeleton at load time. The classifier head replacement logic is:

\`\`\`python  
\# src/utils/model\_builder.py

for param in model.parameters():  
    param.requires\_grad \= False

\# For ResNet family:  
in\_features \= model.fc.in\_features  
model.fc \= nn.Linear(in\_features, num\_classes)

\# For other architectures: find last nn.Linear via named\_modules()  
\# and replace with nn.Linear(in\_features, num\_classes)  
\`\`\`

\#\# Parameters and Prompting

\#\#\# Training Hyperparameters

| Parameter | Default Value | Source |  
|---|---|---|  
| Optimizer | Adam | \`src/trainer/train.py\` |  
| Learning rate | 0.003 | \`src/trainer/train.py\` |  
| Loss function | \`nn.CrossEntropyLoss\` | \`src/trainer/train.py\` |  
| Batch size (training) | 50 | \`src/trainer/train.py\` |  
| Batch size (evaluation) | 32 | \`src/trainer/test.py\` |  
| Epochs | 12 (user-configurable) | \`src/utils/models.py\` |  
| Input resolution | 224 × 224 | \`src/trainer/train.py\` |  
| Train/test split | 80 / 20 | \`src/data\_generator/main.py\` |  
| Augmented copies per image | 5 | \`src/data\_generator/main.py\` |  
| Random seed (split) | 42 | \`src/data\_generator/main.py\` |

\*Table 7\. Training hyperparameters with default values and source locations.\*

\#\#\# CLIP Filtering Parameters

| Parameter | Default Value | Source |  
|---|---|---|  
| CLIP model | \`openai/clip-vit-base-patch32\` | \`src/config.py\` |  
| Relevance threshold | 0.22 | \`src/config.py\` |  
| Minimum images after filter | 3 | \`src/config.py\` |

\*Table 8\. CLIP relevance filtering configuration defaults.\*

\#\#\# Explored Diffusion Parameters

The following diffusion-related parameters were explored in experimental scripts but are not used in the main production pipeline:

| Parameter | Value | Source |  
|---|---|---|  
| Guidance scale sweep | 0.0 through 10.0 (step 1.0) | \`text\_to\_image.py\` |  
| Precision | FP16 (\`torch.float16\`) | \`text\_to\_image.py\` |  
| Inference steps (SD API) | 30 | \`stable\_diffusion\_api.py\` |  
| Guidance scale (SD API) | 7.5 | \`stable\_diffusion\_api.py\` |  
| Resolution (SD API) | 512 × 512 | \`stable\_diffusion\_api.py\` |  
| Negative prompt | Defined to suppress common artifacts | \`stable\_diffusion\_api.py\` |

\*Table 9\. Explored diffusion model parameters from experimental scripts.\*


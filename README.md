# 4-Week MVP Project Plan

---

## Week 1: Foundation & The Orchestrator
**Goal:** Set up the backend, user interface, and the LLM prompt parser.

### UI/UX
- Build a simple frontend (React, Streamlit, or standard HTML)
  - Upload form
  - Prompt text box
  - Email input

### API & Queuing
- Set up a FastAPI backend.
- Integrate Celery + Redis so that when a user hits **"Submit,"** the heavy lifting is pushed to a background queue.

### Prompt Parsing
- Write the LLM integration.
- When the user inputs:
  > "Fine-tune this to detect healthy vs. diseased tomato leaves,"

- The LLM should output structured JSON:
  - Identify the classes:
    ```json
    ["healthy tomato leaf", "diseased tomato leaf"]
    ```
  - Generate 5–10 specific search/diffusion prompts for each class.

---

## Week 2: The Data Generation Engine
**Goal:** Build the pipeline that creates the training data.

### Web Scraping Module
- Integrate a search API (e.g., SerpApi or Bing Image Search).
- Pull down raw images based on the LLM's queries.

### Generation Module
- Connect a diffusion model API (e.g., Stability AI or an open-source model on RunPod).
- Generate synthetic images.

### Data Augmentation & Filtering
- Use `torchvision.transforms`:
  - Rotations
  - Color jitter
- Expand the dataset.
- Implement a CLIP model to:
  - Calculate similarity score between gathered images and labels.
  - Discard low-scoring images to ensure dataset quality.

---

## Week 3: The Fine-Tuning Pipeline
**Goal:** Build the PyTorch backend that trains the model.

### Dataset Preparation
- Write a dynamic PyTorch `Dataset` and `DataLoader`.
- Point them to the folder of newly generated images.

### Model Modification
- Load the user's base model.
- Freeze early feature-extraction layers.
- Replace the final classification head (fully connected layer).
- Match the number of classes identified in Week 1.

### Training Loop
- Implement standard PyTorch training loop:
  - Loss function
  - Optimizer
  - Epochs
- Optimize for GPU execution.

---

## Week 4: Delivery, Deployment & Testing
**Goal:** Stitch everything together and deploy.

### Storage & Delivery
- Save the fine-tuned `state_dict`.
- Upload to an S3 bucket.
- Generate a pre-signed URL.
- Trigger email via SendGrid or AWS SES.

### Deployment
- Deploy frontend to Vercel or Netlify.
- Deploy FastAPI backend and Celery workers to a GPU-enabled cloud provider:
  - AWS EC2
  - Lambda Cloud
  - RunPod

### End-to-End Testing
- Run multiple test prompts.
- Ensure:
  - Queue does not crash.
  - Final model suc
# Filters

CLIP-based relevance filter for scraped images. It scores each downloaded
image against a short text probe built from the class name (and optionally
the user's task prompt), then deletes files whose cosine similarity falls
below a threshold.

It runs **after** the scraper and **before** the train/test split +
augmentation, so only relevant images flow into training.

## Layout

```
src/filters/
├── __init__.py            # public API re-exports
├── clip_relevance.py      # CLIPRelevanceVerifier + verify_downloads_for_classes
└── text_probes.py         # make_text_probe(class_name, user_prompt)
```

Public API:

- `CLIPRelevanceVerifier` — loads CLIP once, scores images, can filter a folder
- `verify_downloads_for_classes(root, classes, user_prompt, ...)` — runs the
  filter across every class folder under `root`
- `make_text_probe(class_name, user_prompt)` — builds the CLIP text prompt

## Configuration

All tunables live in `src/config.py` (env-driven). Relevant ones:

| Setting | Env var | Default | Meaning |
|---|---|---|---|
| `CLIP_MODEL_ID` | `CLIP_MODEL_ID` | `openai/clip-vit-base-patch32` | HF model id for CLIP |
| `RELEVANCE_THRESHOLD` | `RELEVANCE_THRESHOLD` | `0.22` | Min cosine similarity to keep an image |
| `MIN_IMAGES_AFTER_FILTER` | `MIN_IMAGES_AFTER_FILTER` | `3` | Abort the run if any class drops below this |
| `ENABLE_RELEVANCE_FILTER` | `ENABLE_RELEVANCE_FILTER` | `true` | Global on/off switch |
| `DOWNLOAD_DIR` | `DOWNLOAD_DIR` | `downloads` | Root folder the scraper writes into |

Threshold tuning: CLIP ViT-B/32 cosine similarities on natural images
typically sit in `[0.15, 0.35]`. Raise the threshold for stricter filtering,
lower it if you're losing too many images.

## Integration with `main.py`

The API gates the filter step on a per-request flag (falling back to the
global setting when omitted):

```python
# src/main.py
run_relevance_filter = (
    req.enable_relevance_filter
    if req.enable_relevance_filter is not None
    else settings.ENABLE_RELEVANCE_FILTER
)
if run_relevance_filter:
    relevance_summary = verify_downloads_for_classes(
        settings.DOWNLOAD_DIR, class_names, user_prompt,
    )
    # ...abort with 422 if any class has < MIN_IMAGES_AFTER_FILTER kept
```

So `POST /run/` accepts:

```json
{
  "user_prompt": "classify pets vs wildlife",
  "model": "resnet50",
  "enable_relevance_filter": true
}
```

- `true`  → run the CLIP cleanup step
- `false` → skip it entirely (straight to split + augment)
- omitted → use `settings.ENABLE_RELEVANCE_FILTER`

## CLI usage (stand-alone)

`clip_relevance.py` is runnable directly for quick experiments on an
existing download folder. Run from the `src/` directory so the `config`
and `scraper` imports resolve:

```bash
cd src

python -m filters.clip_relevance cats dogs \
    --root downloads \
    --user-prompt "classify pets vs wildlife" \
    --min-score 0.25
```

Dry-run mode prints the score + decision for every file, deletes nothing:

```bash
python -m filters.clip_relevance cats \
    --root downloads \
    --user-prompt "classify pets vs wildlife" \
    --dry-run
```

Class folder names follow the scraper's sanitization
(`scraper.storage.LocalStorage._sanitize`), so pass the original class
label — not the folder name.

## Programmatic usage

```python
from filters import CLIPRelevanceVerifier, verify_downloads_for_classes

summary = verify_downloads_for_classes(
    download_root="downloads",
    class_names=["cats", "dogs"],
    user_prompt="classify pets vs wildlife",
)
# summary["cats"] == {"kept": 17, "removed": 3, "skipped": 0, "min_score": 0.22}
```

Reuse one verifier (CLIP loads on first `.similarity(...)` call):

```python
verifier = CLIPRelevanceVerifier()
score = verifier.similarity("downloads/cats/image_0001.jpg", "a photo of cats")
stats = verifier.filter_class_folder("downloads/cats", "a photo of cats", min_score=0.25)
```

For tests, inject a fake similarity function to avoid loading CLIP:

```python
verifier = CLIPRelevanceVerifier(similarity_fn=lambda path, text: 0.9)
```

## What each call returns

`filter_class_folder` and each entry in `verify_downloads_for_classes`
return:

```python
{
  "kept":      int,   # files that passed
  "removed":   int,   # files deleted (score < min_score)
  "skipped":   int,   # unreadable / undeletable
  "min_score": float, # threshold actually used
}
```

If a class ends with fewer than `MIN_IMAGES_AFTER_FILTER` kept images,
`main.py` returns HTTP 422 with `relevance_summary` in the body so the
caller can lower the threshold or disable filtering and retry.

## Troubleshooting

- **Everything gets removed** — threshold too high, or the class label
  doesn't describe the images well. Try `--dry-run` first and look at the
  score distribution.
- **Slow first run** — CLIP weights are downloaded and cached by
  `transformers` on first use. Subsequent runs reuse the cache.
- **CUDA OOM / no GPU** — the verifier auto-picks `cuda` if available,
  otherwise `cpu`. Pass `device="cpu"` to `CLIPRelevanceVerifier(...)` to
  force CPU.

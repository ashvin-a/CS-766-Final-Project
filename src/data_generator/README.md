# Data Generator

Prepares scraped images for training by splitting them into train/test sets and augmenting the training data to expand the dataset.

## What It Does

1. **Train/Test Split** — Takes the flat `downloads/<class>/` directory structure created by the scraper and reorganises it into `downloads/train/<class>/` and `downloads/test/<class>/` (80/20 split by default).

2. **Data Augmentation** — Generates multiple augmented copies of each training image and saves them to disk. Each original image produces N new variants using random combinations of:
   - Horizontal flip (50% probability)
   - Rotation (±20°)
   - Random resized crop (70–100% scale, output 224×224)
   - Color jitter (brightness, contrast, saturation, hue)

Augmented files are prefixed with `aug_` so they're easy to identify and won't be re-augmented on repeated runs.

## Directory Structure

**Before** (scraper output):
```
downloads/
  cats/
    image_0001.jpg
    image_0002.jpg
    ...
  dogs/
    image_0001.jpg
    ...
```

**After** split + augment:
```
downloads/
  train/
    cats/
      image_0001.jpg          ← original
      aug_image_0001_0.jpg    ← augmented copy 1
      aug_image_0001_1.jpg    ← augmented copy 2
      ...
    dogs/
      image_0001.jpg
      aug_image_0001_0.jpg
      ...
  test/
    cats/
      image_0013.jpg          ← held out, no augmentation
    dogs/
      image_0009.jpg
```

## CLI Usage

Run from the `src/` directory:

```bash
# Full pipeline: split then augment (5 copies per image)
python -m data_generator.main --source downloads --copies 5

# Split only, no augmentation
python -m data_generator.main --source downloads --skip-augment

# Augment only (if already split)
python -m data_generator.main --source downloads --skip-split --copies 3

# Custom split ratio (70/30 instead of 80/20)
python -m data_generator.main --source downloads --split-ratio 0.7
```

### CLI Arguments

| Flag | Default | Description |
|------|---------|-------------|
| `--source` | `downloads` | Root directory containing class folders |
| `--split-ratio` | `0.8` | Fraction of images used for training |
| `--copies` | `5` | Number of augmented copies per training image |
| `--skip-split` | off | Skip the train/test split step |
| `--skip-augment` | off | Skip the augmentation step |

## Programmatic Usage

Called automatically by the FastAPI pipeline in `src/main.py` between the scraping and training steps:

```python
from data_generator import DataGenerator

gen = DataGenerator(source_dir="downloads", split_ratio=0.8)
gen.split_dataset()
gen.augment_training_data(copies_per_image=5)
```

## Notes

- The split is **seeded** (`seed=42`) for reproducibility — same images always end up in train vs. test.
- If `train/` and `test/` already exist, `split_dataset()` skips and reports existing counts.
- Augmentation only touches images inside `train/` — the `test/` set stays untouched.
- The trainer (`trainer/train.py`) reads from `downloads/train/` and the evaluator (`trainer/test.py`) reads from `downloads/test/`.

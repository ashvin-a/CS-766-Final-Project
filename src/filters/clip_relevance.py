"""
CLIP-based relevance scoring for scraped images. Discards files whose
image–text similarity to the class probe falls below a threshold.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable

import torch
from PIL import Image

from config import settings
from filters.text_probes import make_text_probe

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}


class CLIPRelevanceVerifier:
    """
    Loads a CLIP model once and scores images against a text probe.
    """

    def __init__(
        self,
        model_id: str | None = None,
        device: str | None = None,
        similarity_fn: Callable[[Path, str], float] | None = None,
    ):
        self.model_id = model_id or settings.CLIP_MODEL_ID
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._similarity_fn_override = similarity_fn
        self._model = None
        self._processor = None

    def _load_model(self) -> None:
        if self._model is not None:
            return
        from transformers import CLIPModel, CLIPProcessor

        logger.info("Loading CLIP model %s on %s …", self.model_id, self.device)
        self._processor = CLIPProcessor.from_pretrained(self.model_id)
        self._model = CLIPModel.from_pretrained(self.model_id).to(self.device)
        self._model.eval()

    def similarity(self, image_path: Path, text: str) -> float:
        """Cosine similarity between CLIP image and text embeddings (approx. [-1, 1])."""
        if self._similarity_fn_override is not None:
            return self._similarity_fn_override(image_path, text)

        self._load_model()
        assert self._model is not None and self._processor is not None

        image_path = Path(image_path)
        try:
            image = Image.open(image_path).convert("RGB")
        except OSError as e:
            logger.warning("Cannot open image %s: %s", image_path, e)
            raise

        inputs = self._processor(
            text=[text],
            images=image,
            return_tensors="pt",
            padding=True,
            truncation=True,
        ).to(self.device)

        with torch.no_grad():
            outputs = self._model(**inputs)
            ie = outputs.image_embeds
            te = outputs.text_embeds
            ie = ie / ie.norm(dim=-1, keepdim=True)
            te = te / te.norm(dim=-1, keepdim=True)
            sim = (ie * te).sum(dim=-1).item()
        return float(sim)

    def filter_class_folder(
        self,
        class_dir: Path,
        text_probe: str,
        min_score: float | None = None,
    ) -> dict:
        """
        Remove image files in ``class_dir`` with similarity strictly below ``min_score``.
        Returns counts: kept, removed, skipped (unreadable), per-file scores optional.
        """
        min_score = (
            min_score if min_score is not None else settings.RELEVANCE_THRESHOLD
        )
        class_dir = Path(class_dir)
        if not class_dir.is_dir():
            logger.warning("CLIP filter: missing directory %s", class_dir)
            return {
                "kept": 0,
                "removed": 0,
                "skipped": 0,
                "error": "not_a_directory",
            }

        kept = removed = skipped = 0
        files = sorted(
            f
            for f in class_dir.iterdir()
            if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
        )

        for img_path in files:
            try:
                score = self.similarity(img_path, text_probe)
            except OSError:
                skipped += 1
                continue

            if score < min_score:
                try:
                    img_path.unlink()
                    removed += 1
                    logger.debug(
                        "Removed low-relevance image %s (score=%.4f < %.4f)",
                        img_path.name,
                        score,
                        min_score,
                    )
                except OSError as e:
                    logger.warning("Failed to delete %s: %s", img_path, e)
                    skipped += 1
            else:
                kept += 1

        return {
            "kept": kept,
            "removed": removed,
            "skipped": skipped,
            "min_score": min_score,
        }


def verify_downloads_for_classes(
    download_root: Path | str,
    class_names: list[str],
    user_prompt: str,
    verifier: CLIPRelevanceVerifier | None = None,
    min_score: float | None = None,
) -> dict[str, dict]:
    """
    Run relevance filtering for each class folder under ``download_root``.
    Uses the same folder naming as ``LocalStorage`` (sanitized class name).
    """
    from scraper.storage import LocalStorage

    download_root = Path(download_root)
    verifier = verifier or CLIPRelevanceVerifier()
    summary: dict[str, dict] = {}

    for class_name in class_names:
        folder_name = LocalStorage._sanitize(class_name)
        class_dir = download_root / folder_name
        probe = make_text_probe(class_name, user_prompt)
        summary[class_name] = verifier.filter_class_folder(
            class_dir, probe, min_score=min_score
        )

    return summary


if __name__ == "__main__":
    import argparse
    import sys

    from scraper.storage import LocalStorage

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description=(
            "CLIP relevance for scraper output: one folder per class under "
            "--root (names match LocalStorage sanitization)."
        )
    )
    parser.add_argument(
        "classes",
        nargs="+",
        metavar="CLASS",
        help='Class label(s), e.g. dog (folder is usually the same unless sanitized).',
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=None,
        help=f"Download root directory (default: {settings.DOWNLOAD_DIR!r})",
    )
    parser.add_argument(
        "--user-prompt",
        default="",
        help="Optional task text; combined with each class in the text probe.",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=None,
        help=(
            "Minimum CLIP cosine similarity to keep an image "
            f"(default: RELEVANCE_THRESHOLD={settings.RELEVANCE_THRESHOLD})."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print score per file; do not delete anything.",
    )
    args = parser.parse_args()
    root = args.root if args.root is not None else Path(settings.DOWNLOAD_DIR)
    min_score = (
        args.min_score
        if args.min_score is not None
        else settings.RELEVANCE_THRESHOLD
    )

    if args.dry_run:
        verifier = CLIPRelevanceVerifier()
        for class_name in args.classes:
            class_dir = root / LocalStorage._sanitize(class_name)
            probe = make_text_probe(class_name, args.user_prompt)
            print(
                f"\n{class_name!r}  dir={class_dir}  "
                f"min_score={min_score}  probe={probe!r}"
            )
            if not class_dir.is_dir():
                print("  (directory missing — nothing to score)")
                continue
            files = sorted(
                f
                for f in class_dir.iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
            )
            for img_path in files:
                try:
                    s = verifier.similarity(img_path, probe)
                except OSError as e:
                    print(f"  skip   {img_path.name}  ({e})")
                    continue
                decision = "keep" if s >= min_score else "remove"
                print(f"  {s:7.4f}  {decision:6}  {img_path.name}")
        sys.exit(0)

    summary = verify_downloads_for_classes(
        root,
        list(args.classes),
        args.user_prompt,
        min_score=args.min_score,
    )
    for class_name, stats in summary.items():
        print(f"{class_name}: {stats}")

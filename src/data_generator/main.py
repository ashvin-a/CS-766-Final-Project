import os
import shutil
import random
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
from torchvision import transforms


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

AUGMENTATION_PIPELINE = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=20),
    transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
])


class DataGenerator:

    def __init__(self, source_dir: str = "downloads", split_ratio: float = 0.8, seed: int = 42):
        self.source_dir = Path(source_dir)
        self.split_ratio = split_ratio
        self.seed = seed

    def split_dataset(self) -> dict:
        """
        Reorganises source_dir/<class>/ into
        source_dir/train/<class>/ and source_dir/test/<class>/
        using an 80/20 random split (configurable via split_ratio).
        """
        random.seed(self.seed)

        train_dir = self.source_dir / "train"
        test_dir = self.source_dir / "test"

        if train_dir.exists() and test_dir.exists():
            print("Dataset already split — skipping.")
            return self._count_existing(train_dir, test_dir)

        class_dirs = [
            d for d in self.source_dir.iterdir()
            if d.is_dir() and d.name not in ("train", "test")
        ]

        if not class_dirs:
            raise FileNotFoundError(f"No class directories found in {self.source_dir}")

        summary = {}

        for class_dir in sorted(class_dirs):
            class_name = class_dir.name
            images = [
                f for f in class_dir.iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
            ]

            if not images:
                print(f"  {class_name}: no images found, skipping")
                continue

            random.shuffle(images)
            split_idx = max(1, int(len(images) * self.split_ratio))
            train_images = images[:split_idx]
            test_images = images[split_idx:]

            # Guarantee at least one test image when possible
            if not test_images and len(images) > 1:
                test_images = [train_images.pop()]

            train_class_dir = train_dir / class_name
            test_class_dir = test_dir / class_name
            train_class_dir.mkdir(parents=True, exist_ok=True)
            test_class_dir.mkdir(parents=True, exist_ok=True)

            for img in train_images:
                shutil.move(str(img), str(train_class_dir / img.name))
            for img in test_images:
                shutil.move(str(img), str(test_class_dir / img.name))

            try:
                class_dir.rmdir()
            except OSError:
                pass

            summary[class_name] = {
                "train": len(train_images),
                "test": len(test_images),
            }
            print(f"  {class_name}: {len(train_images)} train / {len(test_images)} test")

        print(f"\nSplit complete → {train_dir}  |  {test_dir}")
        return {"status": "success", "summary": summary}

    def augment_training_data(self, copies_per_image: int = 5) -> dict:
        """
        Reads every image in source_dir/train/<class>/, generates
        `copies_per_image` augmented variants of each, and saves them
        back into the same class folder as new JPEG files.
        """
        train_dir = self.source_dir / "train"
        if not train_dir.exists():
            raise FileNotFoundError(
                f"{train_dir} does not exist. Run split_dataset() first."
            )

        summary = {}

        for class_dir in sorted(train_dir.iterdir()):
            if not class_dir.is_dir():
                continue

            class_name = class_dir.name
            originals = [
                f for f in class_dir.iterdir()
                if f.is_file()
                and f.suffix.lower() in IMAGE_EXTENSIONS
                and not f.stem.startswith("aug_")
            ]

            generated = 0
            for img_path in originals:
                try:
                    img = Image.open(img_path).convert("RGB")
                except Exception as e:
                    print(f"  Skipping {img_path.name}: {e}")
                    continue

                for i in range(copies_per_image):
                    aug_img = AUGMENTATION_PIPELINE(img)
                    aug_name = f"aug_{img_path.stem}_{i}{img_path.suffix}"
                    aug_img.save(class_dir / aug_name, format="JPEG", quality=92)
                    generated += 1

            total = len(originals) + generated
            summary[class_name] = {
                "originals": len(originals),
                "augmented": generated,
                "total": total,
            }
            print(f"  {class_name}: {len(originals)} originals + {generated} augmented = {total} total")

        print("\nAugmentation complete.")
        return {"status": "success", "summary": summary}

    @staticmethod
    def _count_existing(train_dir: Path, test_dir: Path) -> dict:
        summary = {}
        for class_dir in sorted(train_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            name = class_dir.name
            n_train = sum(1 for f in class_dir.iterdir() if f.is_file())
            test_class = test_dir / name
            n_test = sum(1 for f in test_class.iterdir() if f.is_file()) if test_class.exists() else 0
            summary[name] = {"train": n_train, "test": n_test}
        return {"status": "already_split", "summary": summary}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Split and augment image datasets.")
    parser.add_argument("--source", default="downloads", help="Root image directory (default: downloads)")
    parser.add_argument("--split-ratio", type=float, default=0.8, help="Train fraction (default: 0.8)")
    parser.add_argument("--copies", type=int, default=5, help="Augmented copies per training image (default: 5)")
    parser.add_argument("--skip-split", action="store_true", help="Skip splitting (if already done)")
    parser.add_argument("--skip-augment", action="store_true", help="Skip augmentation")
    args = parser.parse_args()

    gen = DataGenerator(source_dir=args.source, split_ratio=args.split_ratio)

    if not args.skip_split:
        print("=== Splitting dataset ===")
        result = gen.split_dataset()
        print(result, "\n")

    if not args.skip_augment:
        print("=== Augmenting training data ===")
        result = gen.augment_training_data(copies_per_image=args.copies)
        print(result)

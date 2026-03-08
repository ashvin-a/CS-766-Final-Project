"""
Image Scraper — CLI entry point.

Usage:
    python main.py
    python main.py --keyword "mountain landscape" --mode both
"""

import argparse
import logging
import sys
import os
from config import settings

from scraper.scraper import ImageScraper
from scraper.storage import LocalStorage, DatabaseStorage


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main")

STORAGE_MODES = ("local", "database", "both")


def get_config() -> dict:
    return {
        "max_images": settings.MAX_IMAGES,
        "timeout": settings.REQUEST_TIMEOUT,
        "download_dir": settings.DOWNLOAD_DIR,
        "db_path": settings.DB_PATH,
        "user_agent": settings.USER_AGENT,
    }


def prompt_user() -> tuple[str, str]:
    """Interactive prompt when no CLI args are supplied."""
    keyword = input("\nEnter search keyword: ").strip()
    if not keyword:
        print("Keyword cannot be empty.")
        sys.exit(1)

    print("\nStorage options:")
    print("  [A] Save images locally to downloads/<keyword>/")
    print("  [B] Store metadata (URL, timestamp, keyword) in SQLite")
    print("  [C] Both — download images AND store metadata\n")

    choice = input("Choose storage mode (A/B/C): ").strip().upper()
    mode_map = {"A": "local", "B": "database", "C": "both"}
    mode = mode_map.get(choice)
    if mode is None:
        print(f"Invalid choice '{choice}'. Defaulting to 'both'.")
        mode = "both"

    return keyword, mode


def run(keyword: str, mode: str, cfg: dict):
    scraper = ImageScraper(
        max_images=cfg["max_images"],
        timeout=cfg["timeout"],
        user_agent=cfg["user_agent"],
    )

    # print(f"\n🔍  Scraping up to {cfg['max_images']} images for \"{keyword}\" …\n")
    urls = scraper.scrape(keyword)

    if not urls:
        print("No images found. Try a different keyword or check your connection.")
        sys.exit(0)
        return {"status": "Fail", "code": 400}

    print(f"Found {len(urls)} image URL(s).\n")

    local_paths: list[str | None] = [None] * len(urls)

    if mode in ("local", "both"):
        print("Downloading images …")
        local_store = LocalStorage(base_dir=cfg["download_dir"], timeout=cfg["timeout"])
        local_paths = []
        success_count = 0
        for i, url in enumerate(urls, start=1):
            path = local_store.save_image(url, keyword, i)
            local_paths.append(path)
            if path:
                success_count += 1
        print(f"  ✓ Downloaded {success_count} of {len(urls)} images to {cfg['download_dir']}/{keyword}/\n")

    if mode in ("database", "both"):
        db_store = DatabaseStorage(db_path=cfg["db_path"])
        db_store.store_batch(keyword, urls, local_paths)
        count = db_store.count_by_keyword(keyword)
        print(f"  ✓ {count} total record(s) for \"{keyword}\" in {cfg['db_path']}\n")

    print("Done.")
    return {"status": "Success", "code": 200}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrape images by keyword.")
    parser.add_argument("-k", "--keyword", type=str, help="Search keyword")
    parser.add_argument(
        "-m",
        "--mode",
        type=str,
        choices=STORAGE_MODES,
        default=None,
        help="Storage mode: local | database | both",
    )
    return parser


def main(keyword, mode):
    cfg = get_config()
    return run(keyword, mode, cfg)


if __name__ == "__main__":
    main()

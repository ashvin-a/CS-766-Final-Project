"""
Storage module: handles local image downloads and SQLite metadata persistence.

Option A: Save images to downloads/<keyword>/
Option B: Store metadata (URL, timestamp, keyword) in SQLite
Both options can be used simultaneously.
"""

import os
import sqlite3
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)


class LocalStorage:
    """Downloads and saves image files to disk under downloads/<keyword>/."""

    def __init__(self, base_dir: str = "downloads", timeout: int = 30):
        self.base_dir = Path(base_dir)
        self.timeout = timeout

    def _ensure_dir(self, keyword: str) -> Path:
        folder = self.base_dir / self._sanitize(keyword)
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    @staticmethod
    def _sanitize(name: str) -> str:
        return "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in name).strip()

    @staticmethod
    def _filename_from_url(url: str, index: int) -> str:
        parsed = urlparse(url)
        ext = Path(parsed.path).suffix or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"):
            ext = ".jpg"
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        return f"image_{index:04d}_{url_hash}{ext}"

    def save_image(self, url: str, keyword: str, index: int, headers: dict | None = None) -> str | None:
        """Download a single image and return the local file path, or None on failure."""
        folder = self._ensure_dir(keyword)
        filename = self._filename_from_url(url, index)
        filepath = folder / filename

        if filepath.exists():
            logger.info("Already downloaded: %s", filepath)
            return str(filepath)

        try:
            resp = requests.get(url, timeout=self.timeout, headers=headers or {}, stream=True)
            resp.raise_for_status()

            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)

            logger.info("Saved: %s", filepath)
            return str(filepath)

        except requests.exceptions.Timeout:
            logger.warning("Timeout downloading %s", url)
        except requests.exceptions.RequestException as exc:
            logger.warning("Failed to download %s: %s", url, exc)
        return None

    def save_all(self, urls: list[str], keyword: str, headers: dict | None = None) -> list[str]:
        """Download all images, returning list of successfully saved file paths."""
        saved = []
        for i, url in enumerate(urls, start=1):
            path = self.save_image(url, keyword, i, headers)
            if path:
                saved.append(path)
        return saved


class DatabaseStorage:
    """Stores image metadata in a SQLite database."""

    def __init__(self, db_path: str = "image_scraper.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS images (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword     TEXT    NOT NULL,
                    image_url   TEXT    NOT NULL,
                    local_path  TEXT,
                    scraped_at  TEXT    NOT NULL,
                    UNIQUE(keyword, image_url)
                )
            """)

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def store_metadata(self, keyword: str, image_url: str, local_path: str | None = None):
        """Insert a single image record (skip duplicates)."""
        now = datetime.now(timezone.utc).isoformat()
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT OR IGNORE INTO images (keyword, image_url, local_path, scraped_at) VALUES (?, ?, ?, ?)",
                    (keyword, image_url, local_path, now),
                )
        except sqlite3.Error as exc:
            logger.error("DB insert failed for %s: %s", image_url, exc)

    def store_batch(self, keyword: str, urls: list[str], local_paths: list[str | None] | None = None):
        """Insert metadata for a batch of images."""
        now = datetime.now(timezone.utc).isoformat()
        paths = local_paths or [None] * len(urls)
        rows = [(keyword, url, path, now) for url, path in zip(urls, paths)]
        try:
            with self._connect() as conn:
                conn.executemany(
                    "INSERT OR IGNORE INTO images (keyword, image_url, local_path, scraped_at) VALUES (?, ?, ?, ?)",
                    rows,
                )
            logger.info("Stored %d records in database", len(rows))
        except sqlite3.Error as exc:
            logger.error("DB batch insert failed: %s", exc)

    def query_by_keyword(self, keyword: str) -> list[dict]:
        """Retrieve all stored entries for a keyword."""
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM images WHERE keyword = ? ORDER BY scraped_at DESC", (keyword,)
            ).fetchall()
        return [dict(row) for row in rows]

    def count_by_keyword(self, keyword: str) -> int:
        with self._connect() as conn:
            return conn.execute(
                "SELECT COUNT(*) FROM images WHERE keyword = ?", (keyword,)
            ).fetchone()[0]

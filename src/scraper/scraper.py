"""
Scraper module: uses Playwright to search for images and extract URLs.

Targets Bing Images — results render via JavaScript, making Playwright
necessary for full page content.  BeautifulSoup handles HTML parsing.
"""

import json
import logging
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.bing.com/images/search?q={query}"


class ImageScraper:
    """Playwright-driven scraper that extracts image URLs from Bing Images."""

    def __init__(self, max_images: int = 20, timeout: int = 30, user_agent: str | None = None):
        self.max_images = max_images
        self.timeout = timeout * 1000  # Playwright uses milliseconds
        self.user_agent = user_agent

    def scrape(self, keyword: str) -> list[str]:
        """
        Launch a headless browser, search Bing Images for `keyword`,
        and return up to `max_images` direct image URLs.
        """
        url = SEARCH_URL.format(query=quote_plus(keyword))
        logger.info("Searching Bing Images for: %s", keyword)

        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=self.user_agent,
                viewport={"width": 1920, "height": 1080},
            )
            page = context.new_page()

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=self.timeout)
                self._wait_for_images(page)
                self._scroll_for_more(page)
                urls = self._extract_urls(page)
            except PlaywrightTimeout:
                logger.error("Page load timed out for keyword '%s'", keyword)
                urls = []
            except Exception as exc:
                logger.error("Scraping failed: %s", exc)
                urls = []
            finally:
                browser.close()

        unique = list(dict.fromkeys(urls))
        result = unique[: self.max_images]

        if not result:
            logger.warning("No image results found for '%s'", keyword)
        else:
            logger.info("Found %d image URLs for '%s'", len(result), keyword)

        return result

    def _wait_for_images(self, page):
        """Wait for Bing image tile anchors to render."""
        try:
            page.wait_for_selector("a.iusc", timeout=self.timeout)
        except PlaywrightTimeout:
            logger.debug("Tile selector timed out, trying fallback")
            try:
                page.wait_for_selector("img.mimg", timeout=5000)
            except PlaywrightTimeout:
                pass

    def _scroll_for_more(self, page):
        """Scroll to trigger lazy-loading of additional image tiles."""
        for _ in range(3):
            page.keyboard.press("End")
            page.wait_for_timeout(800)

    def _extract_urls(self, page) -> list[str]:
        """
        Parse page HTML with BeautifulSoup.

        Bing wraps each image tile in an <a class="iusc"> tag whose `m`
        attribute is a JSON blob containing "murl" (the full-size image URL).
        """
        html = page.content()
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []

        for anchor in soup.select("a.iusc"):
            raw = anchor.get("m", "")
            if not raw:
                continue
            try:
                data = json.loads(raw)
                murl = data.get("murl", "")
                if murl and murl.startswith("http"):
                    urls.append(murl)
            except (json.JSONDecodeError, TypeError):
                continue

        # Fallback: grab thumbnail src from img.mimg tiles
        if not urls:
            logger.debug("Primary extraction empty; falling back to thumbnails")
            for img in soup.select("img.mimg"):
                src = img.get("src") or img.get("data-src") or ""
                if src.startswith("http"):
                    urls.append(src)

        return urls

from dotenv import load_dotenv
import os, logging

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

class Settings:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_1")
    GROQ_ENDPOINT = os.getenv("GROQ_ENDPOINT", "")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    MAX_IMAGES: int = int(os.getenv("MAX_IMAGES", 20))
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", 30))
    DOWNLOAD_DIR: str = os.getenv("DOWNLOAD_DIR", "downloads")
    DB_PATH: str = os.getenv("DB_PATH", "image_scraper.db")
    USER_AGENT = os.getenv("USER_AGENT")
    HF_TOKEN = os.getenv("HF_TOKEN")

    # CLIP relevance filtering (see filters/clip_relevance.py)
    CLIP_MODEL_ID: str = os.getenv("CLIP_MODEL_ID", "openai/clip-vit-base-patch32")
    RELEVANCE_THRESHOLD: float = float(os.getenv("RELEVANCE_THRESHOLD", "0.22"))
    MIN_IMAGES_AFTER_FILTER: int = int(os.getenv("MIN_IMAGES_AFTER_FILTER", "3"))
    ENABLE_RELEVANCE_FILTER: bool = os.getenv("ENABLE_RELEVANCE_FILTER", "true").lower() in (
        "1",
        "true",
        "yes",
    )


settings = Settings()
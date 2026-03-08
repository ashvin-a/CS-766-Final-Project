from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY_1")
    GROQ_ENDPOINT = os.getenv("GROQ_ENDPOINT")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    MAX_IMAGES: int = int(os.getenv("MAX_IMAGES", 20))
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", 30))
    DOWNLOAD_DIR: str = os.getenv("DOWNLOAD_DIR", "downloads")
    DB_PATH: str = os.getenv("DB_PATH", "image_scraper.db")
    USER_AGENT = os.getenv("USER_AGENT")


settings = Settings()
from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY_1")
    GROQ_ENDPOINT = os.getenv("GROQ_ENDPOINT")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"


settings = Settings()
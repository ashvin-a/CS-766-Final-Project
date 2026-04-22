import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import InferenceClient

# Load repo-root .env (not automatic). Run from any cwd: path is relative to this file.
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")

HF_token = os.environ.get("HF_token")
if not HF_token:
    raise RuntimeError(
        f"Set HF_token in {_ROOT / '.env'} (see .env.example) or export HF_token in your shell."
    )

client = InferenceClient(
    provider="hf-inference",
    api_key=HF_token,
)

# output is a PIL.Image object
image = client.text_to_image(
    "Astronaut riding a horse",
    model="black-forest-labs/FLUX.1-schnell",
)

image.save("astronaut_riding_a_horse.png")
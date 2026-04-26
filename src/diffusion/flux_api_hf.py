from __future__ import annotations

import hashlib
import os
import secrets
from pathlib import Path
import sys
from typing import Optional, Union
from groq import Groq
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from utils import CustomLLM
from config import settings
import json
from json_repair import repair_json

# src/ — so `import config` resolves to src/config.py
_SRC = Path(__file__).resolve().parents[1]
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

# Load repo-root .env once so all functions see env vars.
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")

def prompt_variations(_prompt: str):
    groq_api_key = settings.GROQ_API_KEY
    if not groq_api_key:
        raise RuntimeError(
            f"Set GROQ_API_KEY (or GROQ_API_KEY_1) in {_ROOT / '.env'} or export it in your shell."
        )
    client = Groq(api_key=groq_api_key)
    content = """
    Act as a prompt engineer and make 100 different variations of the prompt for generating 
    a dataset for vision training: 
        {_prompt} 
    return the variations in a list of strings, each string should be a different variation of the prompt.
    make sure that the variations are not too similar to each other yet the context of the image does not change
    optimize for token usage and keep the prompt short and concise and mention to keep the quality of the image 
    medium with 480x480 resolution
    
    Your output should STRICTLY be a json with key as "prompts" and the value should be 
    a list in which each entry should be the prompt.

    # Sample output
    {{
    "prompts" : ["Prompt number 1", "Prompt number 2"]
    }}
    """
    completion = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {
            "role": "user",
            "content": content.format(_prompt=_prompt)
        }
    ]
)
    content = completion.choices[0].message.content or ""
    content = json.loads(repair_json(content))
    return content.get("prompts")
    
    # print(settings.GROQ_API_KEY)
    # print(settings.GROQ_ENDPOINT)
    # print(settings.DEBUG)
    # print(settings.MAX_IMAGES)
    # print(settings.REQUEST_TIMEOUT)
    # print(settings.DOWNLOAD_DIR)
    # print(settings.DB_PATH)
    # print(settings.USER_AGENT)


# Load repo-root .env (not automatic). Run from any cwd: path is relative to this file.

def flux_api_hf(
    prompt: str,
    model_id: str,
    output_path: Optional[Union[str, Path]] = None,
):
    hf_token = settings.HF_TOKEN
    if not hf_token:
        raise RuntimeError(
            f"Set HF_TOKEN in {_ROOT / '.env'} (see .env.example) or export HF_TOKEN in your shell. "
            f"Note: env var names are case-sensitive — `HF_token` (lowercase) will NOT be picked up."
        )

    client = InferenceClient(
        provider="hf-inference",
        api_key=hf_token,
    )

    # output is a PIL.Image object
    image = client.text_to_image(
        prompt,
        model=model_id
    )

    out = Path(output_path) if output_path is not None else Path("sample_output.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return image

def generate_base_prompt(class_name: str) -> str:
    llm = CustomLLM(
        endpoint=settings.GROQ_ENDPOINT,
        model_name="openai/gpt-oss-120b",
    )
    response = llm.invoke(
    system_prompt="""
        You are an expert prompt engineer who knows how to prompt to generate
        realistic life like images using diffusion models. The user will provide
        you the class of the image that needs to be generated. Your output will 
        be a json that will have the key "response" and the value to it will be 
        key to this

        ## Sample Output
        {
        "response" : "<the output prompt>"
        }
    """,
    prompt=class_name)

    prompt = json.loads(response).get("response")

    return prompt

def generate_diffusion_dataset(
    class_name: str,
    image_count: int,
    is_web_scraping_enabled: bool,
    model_id: str = "black-forest-labs/FLUX.1-schnell",
) -> Path:
    _REPO = Path(__file__).resolve().parents[2]
    base_prompt = generate_base_prompt(class_name=class_name)
    prompts_gen = prompt_variations(base_prompt)[:image_count]
    run_hash = hashlib.sha256(
        f"{base_prompt}{secrets.token_hex(8)}".encode()
    ).hexdigest()[:12]
    if not is_web_scraping_enabled:
        out_dir = _REPO / "downloads" / "train" / class_name
    else:
        out_dir = _REPO / "downloads" / class_name
    out_dir.mkdir(parents=True, exist_ok=True)
    for n, prompt in enumerate(prompts_gen, start=1):
        out_path = out_dir / f"diffusion_generation_{run_hash}_{n:04d}.png"
        flux_api_hf(prompt, "black-forest-labs/FLUX.1-schnell", out_path)
    print(f"All images saved under {out_dir}")
    return out_dir




if __name__ == "__main__":
    generate_diffusion_dataset(class_name="cat")



##Run the scrapper and image generation in parallel using multiprocessing

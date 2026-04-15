from pathlib import Path
import sys

# Repo-root/vendor diffusers checkout (editable install target). Ensures `import diffusers` works
# when running with e.g. conda `python` instead of the project `.venv`.
_ROOT = Path(__file__).resolve().parents[2]
_VENDOR_SRC = _ROOT / "vendor" / "diffusers" / "src"
if _VENDOR_SRC.is_dir():
    sys.path.insert(0, str(_VENDOR_SRC))

from diffusers import AutoPipelineForText2Image
import torch

model_ids = ["stable-diffusion-v1-5/stable-diffusion-v1-5"]
prompts =["stained glass of darth vader, backlight, centered composition, masterpiece, photorealistic, half HD",]
guidance_scales = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
def text_to_image(prompt: str, model_id: str,guidanceScale: float ,output_path: str = "darth_vader.png",):
    pipeline = AutoPipelineForText2Image.from_pretrained(
	model_id, torch_dtype=torch.float16, variant="fp16"
)
    pipeline.unet = torch.compile(pipeline.unet, mode="reduce-overhead", fullgraph=True)
    ##generator = torch.Generator(device="cuda").manual_seed(30)
    image = pipeline(
        prompt=prompt,
        guidance_scale=guidanceScale
    ).images[0]
    image.save("darth_vader.png")
    return image

for model_id in model_ids:
    for prompt in prompts:
        for guidance_scale in guidance_scales:
            text_to_image(prompt, model_id, guidance_scale)
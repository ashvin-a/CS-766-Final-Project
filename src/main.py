from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from orchestrator import parse_user_prompt
from scraper import main as scraper_main
from data_generator import DataGenerator
from trainer import Trainer, main as test_run
from time import time
from utils import RunRequest
from config import settings
from filters import verify_downloads_for_classes
from diffusion import generate_diffusion_dataset

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.post("/run/")
def run(req: RunRequest):
    user_prompt = req.prompt
    start_time = time()
    response = parse_user_prompt(user_prompt=user_prompt)
    search_queries: dict = response.get("search_queries")
    class_names: list = response.get("classes")
    for class_name, keywords in search_queries.items():
        for keyword in keywords:
            if req.dataSources.webScraping:
                response = scraper_main.main(
                    class_name=class_name, keyword=keyword, mode="local"
                )
                if response.get("code") == 400:
                    return {"success": False, "code": 400}
        if req.dataSources.syntheticGeneration:
            generate_diffusion_dataset(class_name=class_name)
    # Split scraped images into train / test, then augment training set only
    data_gen = DataGenerator(source_dir=settings.DOWNLOAD_DIR)
    data_gen.split_dataset()
    # Per-request override of the CLIP relevance filter. When the request
    # doesn't specify one, fall back to the global setting.
    run_relevance_filter = req.dataSources.clipFiltering
    if run_relevance_filter:
        relevance_summary = verify_downloads_for_classes(
            settings.DOWNLOAD_DIR,
            class_names,
            user_prompt,
        )
        for cn, stats in relevance_summary.items():
            kept = stats.get("kept", 0)
            if kept < settings.MIN_IMAGES_AFTER_FILTER:
                return {
                    "success": False,
                    "code": 422,
                    "message": (
                        f"After CLIP relevance filtering, class {cn!r} has only {kept} "
                        f"image(s) (minimum {settings.MIN_IMAGES_AFTER_FILTER}). "
                        "Try lowering RELEVANCE_THRESHOLD or disabling ENABLE_RELEVANCE_FILTER."
                    ),
                    "relevance_summary": relevance_summary,
                }
########################
    if req.dataSources.augmentation:
        data_gen.augment_training_data(copies_per_image=5)

    # Finetune the model on training split only
    trainer = Trainer()
    max_confidence = trainer.finetune_model(epochs=req.advanced.epochs, required_class_names=class_names, output_model_path="", model_architecture=req.model)
    end_time = time()
    total_time = end_time - start_time
    # search_query_list = [query for query in search_queries.values()]
    return {"classes": class_names, "code": 200, "confidence": max_confidence, "total_time": total_time}


@app.post("/parse-user-prompt/")
def orchestrator(user_prompt: str) -> dict:
    return parse_user_prompt(user_prompt=user_prompt)


@app.post("/test/")
def accuracy_test():
    response = test_run()
    return {"success": True, 
            "baseline_cm": response.get("baseline_cm"),
            "finetuned_cm": response.get("finetuned_cm"),
            "baseline_accuracy": response.get("baseline_accuracy"),
            "finetune_accuracy": response.get("finetune_accuracy"),
            "message":"Confusion matrix generated", "code": 200}



@app.post("/generate-dataset/")
def generate_data(keyword: str, mode: str = "local") -> dict:
    return scraper_main.main(keyword=keyword, mode=mode)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

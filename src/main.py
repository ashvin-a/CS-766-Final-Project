from fastapi import FastAPI
import uvicorn
from orchestrator import parse_user_prompt
from scraper import main as scraper_main
from trainer import Trainer
from datetime import datetime
from time import time

app = FastAPI()


@app.post("/run/")
def run(user_prompt: str):
    start_time = time()
    response = parse_user_prompt(user_prompt=user_prompt)
    search_queries: dict = response.get("search_queries")
    class_names: list = response.get("classes")
    # for class_name, keywords in search_queries.items():
    #     for keyword in keywords:
    #         response = scraper_main.main(
    #             class_name=class_name, keyword=keyword, mode="local"
    #         )
    #         if response.get("code") == 400:
    #             return {"success": False, "code": 400}

    # Finetune the model
    trainer = Trainer(class_names=class_names)
    trainer.finetune_model(
        output_model_path=f"results/fine_tune_model{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}",
        epochs=1
    )
    end_time = time()
    return {"success": True, "code": 200, "time_taken": end_time - start_time}


@app.post("/parse-user-prompt/")
def orchestrator(user_prompt: str) -> dict:
    return parse_user_prompt(user_prompt=user_prompt)


@app.post("/train-model/")
def train():
    pass


@app.post("/generate-dataset/")
def generate_data(keyword: str, mode: str = "local") -> dict:
    return scraper_main.main(keyword=keyword, mode=mode)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

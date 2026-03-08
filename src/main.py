from fastapi import FastAPI
import uvicorn
from orchestrator import parse_user_prompt
from scraper import main as scraper_main

app = FastAPI()

@app.post("/run/")
def run():
    pass

@app.post("/parse-user-prompt/")
def orchestrator():
    parse_user_prompt()

@app.post("/train-model/")
def train():
    pass

@app.post("/generate-dataset/")
def generate_data(keyword:str, mode:str = "local"):
    return scraper_main.main(keyword=keyword, mode=mode)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
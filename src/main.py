from fastapi import FastAPI
import uvicorn
from orchestrator import parse_user_prompt
from scraper import main as scraper_main

app = FastAPI()

@app.post("/run/")
def run(user_prompt: str):
    response = parse_user_prompt(user_prompt=user_prompt)
    for class_name in response.get("classes"):
        response = scraper_main.main(keyword=class_name, mode="local")
        if response.get("code") == 400:
            return {"success": False, "code": 400}            
    return {"success": True, "code": 200}

@app.post("/parse-user-prompt/")
def orchestrator(user_prompt: str) -> dict:
    return parse_user_prompt(user_prompt=user_prompt)

@app.post("/train-model/")
def train():
    pass

@app.post("/generate-dataset/")
def generate_data(keyword:str, mode:str = "local") -> dict:
    return scraper_main.main(keyword=keyword, mode=mode)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
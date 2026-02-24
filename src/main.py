from fastapi import FastAPI
import uvicorn
from orchestrator import parse_user_prompt

app = FastAPI()

@app.add_api_route("/run/")
def run():
    pass

@app.add_api_route("/parse-user-prompt/")
def orchestrator():
    parse_user_prompt()

@app.add_api_route("/train-model/")
def train():
    pass

@app.add_api_route("/generate-dataset/")
def generate_data():
    pass
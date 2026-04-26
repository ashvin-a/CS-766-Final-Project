import requests
from config import settings


class CustomLLM:

    def __init__(self, endpoint: str, model_name: str = "llama-3.3-70b-versatile"):
        self.model_name: str = model_name
        self.endpoint: str = endpoint

    def invoke(self, prompt: str, system_prompt: str= "", **kwargs) -> str:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        }

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        }

        # Some local environments set HTTPS proxy vars that block API traffic.
        # Use a session with trust_env disabled so direct Groq calls still work.
        session = requests.Session()
        session.trust_env = False
        response = session.post(self.endpoint, headers=headers, json=payload, timeout=60)
        response.raise_for_status()

        output = dict(response.json()).get("choices")[0].get("message").get("content")

        return output


if __name__ == "__main__":
    llm = CustomLLM(
        endpoint=settings.GROQ_ENDPOINT,
        model_name="meta-llama/llama-4-maverick-17b-128e-instruct",
    )
    print(llm.invoke(prompt="Hi"))

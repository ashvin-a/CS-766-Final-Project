from json_repair import repair_json
from utils import CustomLLM
from config import settings
import json

def parse_user_prompt(user_prompt: str) -> dict:
    """
    Takes the user's raw prompt and uses a local LLM to extract 
    the target classes and generate specific search queries.
    """
    
    system_prompt = """
    You are an AI assistant helping to build computer vision datasets.
    The user will provide a description of a vision classifier they want to train.
    You must extract the exact target classes and generate 3 highly specific 
    Google Image search queries for each class.
    
    You MUST respond ONLY with a valid JSON object in this exact format:
    {
      "classes": ["class1", "class2"],
      "search_queries": {
        "class1": ["query 1", "query 2", "query 3"],
        "class2": ["query 1", "query 2", "query 3"]
      }
    }
    The target classes should be made singular while generating the JSON object.
    Make sure that the search queries are highly relevant with the corresponding class.
    """

    print("Sending prompt to local open-source LLM...")
    
    model = CustomLLM(endpoint=settings.GROQ_ENDPOINT,
                    model_name="openai/gpt-oss-120b")

    raw_response = model.invoke(prompt=user_prompt, system_prompt=system_prompt)
    
    try:
        # Strip out any markdown code blocks the LLM might have added
        clean_json = raw_response.replace('```json', '').replace('```', '').strip()
        parsed_data = json.loads(repair_json(clean_json))
        return parsed_data
    except Exception as e:
        print(f"Failed to parse JSON from LLM response: {e}")
        print("Raw response:", raw_response)
        return {"error": "Invalid LLM output"}

# --- Quick Local Test ---
if __name__ == "__main__":
    test_prompt = "I need a model that can tell the difference between a rusty screw and a shiny new screw."
    result = parse_user_prompt(test_prompt)
    print(json.dumps(result, indent=2))
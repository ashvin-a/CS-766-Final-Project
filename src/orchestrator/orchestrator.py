from openai import OpenAI
import json

# Point the client to your local Ollama server
# Make sure you have run: ollama run llama3
client = OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama', # Required field, but ignored by local server
)

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
    """

    print("Sending prompt to local open-source LLM...")
    
    response = client.chat.completions.create(
        model="llama3", # Or "mistral", depending on what you downloaded
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User Request: {user_prompt}"}
        ],
        temperature=0.2, # Low temperature for more deterministic, predictable output
        # Some local servers support response_format={"type": "json_object"}
    )

    # Extract the text and parse the JSON
    raw_response = response.choices[0].message.content
    
    try:
        # Strip out any markdown code blocks the LLM might have added
        clean_json = raw_response.replace('```json', '').replace('```', '').strip()
        parsed_data = json.loads(clean_json)
        return parsed_data
    except json.JSONDecodeError:
        print("Failed to parse JSON from LLM response.")
        print("Raw response:", raw_response)
        return {"error": "Invalid LLM output"}

# --- Quick Local Test ---
if __name__ == "__main__":
    test_prompt = "I need a model that can tell the difference between a rusty screw and a shiny new screw."
    result = parse_user_prompt(test_prompt)
    print(json.dumps(result, indent=2))
"""Text prompts for CLIP image–text similarity (relevance filtering)."""


def make_text_probe(class_name: str, user_prompt: str | None = None) -> str:
    """
    Build a short English caption for CLIP. Optionally fold in the user's task
    description for tighter alignment with the original request.
    """
    class_name = (class_name or "").strip()
    user_prompt = (user_prompt or "").strip()

    if user_prompt:
        return f'{user_prompt}. A clear photo showing: {class_name}.'
    return f"a photo of {class_name}"

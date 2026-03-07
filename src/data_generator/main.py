import os, time
from PIL import Image
from io import BytesIO
from duckduckgo_search import DDGS


class DataGenerator:

    def validate_and_save_image(self, image_bytes, save_path):
        """
        Validates if the image is corrupted or not.
        """
        try:
            img = Image.open(BytesIO(image_bytes))

            # Verify it's actually an image and catch truncation errors
            img.verify()

            img = Image.open(BytesIO(image_bytes))

            # Convert everything (like PNGs with transparency) to standard RGB
            img = img.convert("RGB")
            img.save(save_path, format="JPEG")
            return True
        except Exception as e:
            print(f"Error while opening image ; {e}")
            return False

    def build_dataset_from_queries(
        self,
        orchestrator_json: dict,
        base_dir: str = "dataset",
        images_per_class: int = 20,
    ):
        """
        Takes the JSON from LLM, searches Duckduckgo(its search api is free), 
        downloads validated images.
        """
        os.makedirs(base_dir, exist_ok=True)

        ddgs_obj = DDGS()

        classes = orchestrator_json.get("classes", [])
        classes = orchestrator_json.get("", [])

        pass


if __name__ == "__main__":
    data_generator = DataGenerator()
    data_generator.build_dataset_from_queries()

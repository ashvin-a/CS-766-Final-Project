import enum
from pydantic import BaseModel

class Models(enum.Enum):
    RESNET_50 = "resnet50"
    MOBILENET_V3 = "mobilenetv3"
    EFFICIENTNET = "efficientnet_b0"
    VIT_B16 = "vit_b16"
    CLIP_CLASSIFIER = "clip_classifier"


class RunRequest(BaseModel):
    user_prompt: str
    model: Models


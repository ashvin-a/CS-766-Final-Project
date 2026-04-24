import enum
from typing import Optional
from pydantic import BaseModel

class Models(enum.Enum):
    RESNET_50 = "resnet50"
    MOBILENET_V3 = "mobilenetv3"
    EFFICIENTNET = "efficientnet_b0"
    CONV_NEXT = "ConvNeXt"


class RunRequest(BaseModel):
    user_prompt: str
    model: Models
    # If provided, overrides settings.ENABLE_RELEVANCE_FILTER for this run.
    # True  -> run CLIP-based relevance filtering before split/augmentation
    # False -> skip filtering and go straight to split/augmentation
    enable_relevance_filter: Optional[bool] = None


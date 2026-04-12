import enum
from pydantic import BaseModel

class Models(enum.Enum):
    RESNET_50 = "resnet50"
    MOBILENET_V3 = "mobilenetv3"
    EFFICIENTNET = "efficientnet_b0"
    CONV_NEXT = "ConvNeXt"


class RunRequest(BaseModel):
    user_prompt: str
    model: Models


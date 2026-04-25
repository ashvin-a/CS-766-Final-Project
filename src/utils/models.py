import enum
from typing import Optional
from pydantic import BaseModel

class Models(enum.Enum):
    RESNET_50 = "resnet50"
    MOBILENET_V3 = "mobilenetv3"
    EFFICIENTNET = "efficientnet_b0"
    CONV_NEXT = "ConvNeXt"


class DataSources(BaseModel):
    webScraping: bool = True
    syntheticGeneration: bool = False
    augmentation: bool = False
    clipFiltering: bool = False


class AdvancedSettings(BaseModel):
    datasetSizeTarget: int = 1000
    augmentationStrength: float = 0.5
    clipThreshold: float = 0.7
    freezeBackbone: bool = False
    epochs: int = 12
    batchSize: int = 32
    learningRate: float = 0.0001
    deliveryFormat: str = "pytorch"


class RunRequest(BaseModel):
    user_prompt: str
    model: Models
    # If provided, overrides settings.ENABLE_RELEVANCE_FILTER for this run.
    # True  -> run CLIP-based relevance filtering before split/augmentation
    # False -> skip filtering and go straight to split/augmentation
    enable_relevance_filter: Optional[bool] = None


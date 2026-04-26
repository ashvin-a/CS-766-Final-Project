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
    augmentationStrength: int = 40
    clipThreshold: float = 0.7
    freezeBackbone: bool = False
    epochs: int = 12
    batchSize: int = 32
    learningRate: float = 0.0001
    deliveryFormat: str = "pytorch"


class RunRequest(BaseModel):
    prompt: str
    email: Optional[str] = None
    model: Models
    dataSources: DataSources = DataSources()
    advanced: AdvancedSettings = AdvancedSettings()


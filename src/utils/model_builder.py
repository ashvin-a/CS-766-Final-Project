import torch
import torch.nn as nn
from torchvision import models
from utils.models import Models

class ModelBuilder:

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def build_custom_model(self, num_classes: int, model_architecture: Models) -> nn.Module:
        print("No model path provided;")
        if model_architecture == Models.RESNET_50:
            print("Using ImageNet pretrained ResNet50 architecture as base model.")
            model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        elif model_architecture == Models.MOBILENET_V3:
            print("Using ImageNet pretrained MobileNetV3-Large architecture as base model.")
            model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V1)
        elif model_architecture == Models.EFFICIENTNET:
            print("Using ImageNet pretrained EfficientNet-B0 architecture as base model.")
            model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        elif model_architecture == Models.CONV_NEXT:
            print("Using ImageNet pretrained ConvNeXt-Tiny architecture as base model.")
            model = models.convnext_tiny(weights=models.ConvNeXt_Tiny_Weights.IMAGENET1K_V1)
        else:
            print("No model architecture described. Taking ResNet50 by default")
            model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
            

        for param in model.parameters():
            param.requires_grad = False

        self._replace_classifier_head(model, num_classes)

        return model.to(self.device)

    
    def _replace_classifier_head(self, model: nn.Module, num_classes: int) -> str:
        """Replace the final Linear layer with one sized for num_classes.
        Returns the attribute name of the replaced layer."""
        # all torchvision models used here exposes .fc directly
        if hasattr(model, "fc") and isinstance(model.fc, nn.Linear):
            in_features = model.fc.in_features
            model.fc = nn.Linear(in_features, num_classes)
            return "fc"

        # For ONNX-converted models, find the last Linear layer by name
        last_name = None
        for name, module in model.named_modules():
            if isinstance(module, nn.Linear):
                last_name = name

        if last_name is None:
            raise RuntimeError("No Linear layer found in model to replace.")

        parts = last_name.rsplit(".", 1)
        if len(parts) == 2:
            parent = dict(model.named_modules())[parts[0]]
            in_features = getattr(parent, parts[1]).in_features
            setattr(parent, parts[1], nn.Linear(in_features, num_classes))
        else:
            in_features = getattr(model, last_name).in_features
            setattr(model, last_name, nn.Linear(in_features, num_classes))

        return last_name
        

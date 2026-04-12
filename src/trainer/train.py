import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
import os, PIL
from utils import Models
from config import settings

TRAINER_DIR = os.path.dirname(os.path.abspath(__file__))


class Trainer:

    def __init__(self, class_names: list, model_path: str = ""):
        if torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True  # Speeds up convolutions
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = model_path or os.path.join(TRAINER_DIR, "resnet50-v2-7.onnx")
        self.train_dir = os.path.join(settings.DOWNLOAD_DIR, "train")

    def get_data_loaders(self, required_class_names:list, batch_size=50):
        # Standard ResNet normalization values
        data_transforms = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                ),
            ]
        )

        # ImageFolder automatically reads the directory structure your scraper made
        dataset = datasets.ImageFolder(self.train_dir, data_transforms)

        required_class_names = [cls 
                                for cls in dataset.class_to_idx
                                if any(cls == c or cls == f"{c}s" or cls == f"{c}es"
                                       for c in required_class_names)
                                ]
        class_to_idx = dataset.class_to_idx
        old_indices = {class_to_idx[c] for c in required_class_names}

        # Remap old label indices to contiguous 0-based indices for cross-entropy
        old_to_new = {old_idx: new_idx for new_idx, old_idx in enumerate(sorted(old_indices))}

        filtered_samples = [
            (path, old_to_new[label])
            for path, label in dataset.samples
            if label in old_indices
        ]

        dataset.samples = filtered_samples
        dataset.targets = [label for _, label in filtered_samples]
        dataset.classes = required_class_names
        dataset.class_to_idx = {c: old_to_new[class_to_idx[c]] for c in required_class_names}

        dataloader = DataLoader(
            dataset, batch_size=batch_size, shuffle=True, num_workers=4
        )

        return dataloader, required_class_names

    def _replace_classifier_head(self, model: nn.Module, num_classes: int) -> str:
        """Replace the final Linear layer with one sized for num_classes.
        Returns the attribute name of the replaced layer."""
        # torchvision ResNet exposes .fc directly
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

    def build_custom_resnet(self, num_classes: int) -> nn.Module:
        model_path = self.model_path

        #TODO Remove this condition. ONNX are for inference and including it in our use case might backfire.
        if model_path.endswith(".onnx"):
            import onnx2torch
            import onnx

            print(f"Loading ONNX model from {model_path}...")
            try:
                model = onnx2torch.convert(onnx.load(model_path))
                # Freeze all base layers before swapping the head
                for param in model.parameters():
                    param.requires_grad = False

                self._replace_classifier_head(model, num_classes)
            except Exception as e:
                pass

        if model_path.endswith(".pth"):
            print(f"Loading .pth weights from {model_path}...")
            model = models.resnet50()
            state_dict = torch.load(model_path, map_location=self.device)
            # strict=False ignores mismatched fc weights (e.g. different class count)
            model.load_state_dict(state_dict, strict=False)

            # Freeze all base layers before swapping the head
            for param in model.parameters():
                param.requires_grad = False

            self._replace_classifier_head(model, num_classes)

        else:
            print("No model path provided; using ImageNet pretrained ResNet-50.")
            model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)

            for param in model.parameters():
                param.requires_grad = False

            self._replace_classifier_head(model, num_classes)

        return model.to(self.device)

    def finetune_model(self, required_class_names: list, output_model_path: str = False, epochs: int = 5, model_architecture: Models= Models.RESNET_50) -> str:
        if not output_model_path:
            output_model_path = os.path.join(TRAINER_DIR, "finetuned_model.pth")

        print(f"Loading data from {self.train_dir}...")
        dataloader, class_names = self.get_data_loaders(required_class_names)
        num_classes = len(class_names)

        print(f"Building model for {num_classes} classes: {class_names}")
        if model_architecture == Models.RESNET_50:
            model = self.build_custom_resnet(num_classes)

        criterion = nn.CrossEntropyLoss()

        # Only pass trainable parameters (the new classifier head) to the optimizer
        trainable_params = [p for p in model.parameters() if p.requires_grad]
        optimizer = optim.Adam(trainable_params, lr=0.003)

        print("Starting training on:", self.device)
        model.train()

        max_accuracy = 0
        for epoch in range(epochs):
            running_loss = 0.0
            corrects = 0
            total = 0
            try:
                for inputs, labels in dataloader:
                    inputs, labels = inputs.to(self.device), labels.to(self.device)

                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    _, preds = torch.max(outputs, 1)
                    loss.backward()
                    optimizer.step()

                    running_loss += loss.item() * inputs.size(0)
                    corrects += torch.sum(preds == labels.data)
                    total += inputs.size(0)

                epoch_loss = running_loss / total
                epoch_acc = corrects.double() / total
                print(
                    f"Epoch {epoch+1}/{epochs} | Loss: {epoch_loss:.4f} | Acc: {epoch_acc:.4f}"
                )
                max_accuracy = max(max_accuracy, epoch_acc)
            except PIL.UnidentifiedImageError as e:
                print(f"Skipping Epoch {epoch+1}/{epochs} because of corrupted image")
        torch.save(model.state_dict(), output_model_path)
        print(f"Model saved to {output_model_path}")
        return max_accuracy

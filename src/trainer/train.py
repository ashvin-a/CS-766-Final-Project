import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
import os


class Trainer:

    def __init__(self, class_names: list):
        if torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True  # Speeds up convolutions
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.resnet_path = os.path("src/trainer/resnet50-v2-7.onnx")
        self.data_dirs = [
            os.path(f"downloads/{class_name}") for class_name in class_names
        ]

    def get_data_loaders(self, batch_size):
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
        dataset = datasets.ImageFolder(os.path.join(self.data_dirs), data_transforms)

        # DataLoader handles batching and memory management
        dataloader = DataLoader(
            dataset, batch_size=batch_size, shuffle=True, num_workers=4
        )

        class_names = dataset.classes
        return dataloader, class_names

    def build_custom_resnet(self, num_classes):
        # Load the pre-trained ResNet-50
        model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)

        # Freeze all the base layers (Feature Extractor)
        for param in model.parameters():
            param.requires_grad = False

        # Swap the final layer (Classifier Head)
        num_ftrs = model.fc.in_features

        # Replace it with a new layer that outputs our specific number of classes.
        model.fc = nn.Linear(num_ftrs, num_classes)  # By default requires_grad is True

        return model.to(self.device)

    def finetune_model(self, data_dir, output_model_path, epochs=5):
        print(f"Loading data from {data_dir}...")
        dataloader, class_names = self.get_data_loaders(data_dir)
        num_classes = len(class_names)

        print(f"Building model for {num_classes} classes: {class_names}")
        model = self.build_custom_resnet(num_classes)

        criterion = nn.CrossEntropyLoss()

        # We only pass model.fc.parameters() to the optimizer
        optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

        print("Starting Training on:", self.device)
        model.train()

        for epoch in range(epochs):
            running_loss = 0.0
            corrects = 0
            total = 0

            for inputs, labels in dataloader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)

                # Zero the parameter gradients
                optimizer.zero_grad()

                # Forward pass
                outputs = model(inputs)
                loss = criterion(outputs, labels)

                # Get predictions (the index of the highest probability)
                _, preds = torch.max(outputs, 1)

                # Backward pass and optimize
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

        # Save the fine-tuned weights
        torch.save(model.state_dict(), output_model_path)
        print(f"Model saved to {output_model_path}")

        return output_model_path

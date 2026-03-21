import os
import torch
import torch.nn as nn
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report
import numpy as np
from config import settings

TRAINER_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(TRAINER_DIR, "finetuned_model.pth")
DATA_DIR = os.path.join(settings.DOWNLOAD_DIR, "test")


def get_dataloader(data_dir: str, batch_size: int = 32):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    dataset = datasets.ImageFolder(data_dir, transform=transform)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    return loader, dataset.classes


def load_baseline_model(num_classes: int, device: torch.device) -> nn.Module:
    """ImageNet-pretrained ResNet-50 with only the head replaced — no finetuning."""
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
    for param in model.parameters():
        param.requires_grad = False
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model.to(device)
    model.eval()
    return model


def load_finetuned_model(model_path: str, num_classes: int, device: torch.device) -> nn.Module:
    model = models.resnet50()
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model


def run_inference(model: nn.Module, loader: DataLoader, device: torch.device):
    all_preds = []
    all_labels = []
    with torch.no_grad():
        for inputs, labels in loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
    return np.array(all_labels), np.array(all_preds)


def plot_confusion_matrix(labels, preds, class_names, title: str, output_path: str):
    cm = confusion_matrix(labels, preds)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names)
    fig, ax = plt.subplots(figsize=(max(6, len(class_names)), max(5, len(class_names))))
    disp.plot(ax=ax, colorbar=True, cmap="Blues")
    ax.set_title(title)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    print(f"Confusion matrix saved to {output_path}")


def plot_comparison(class_names, base_labels, base_preds, ft_labels, ft_preds, output_path: str):
    """Bar chart comparing per-class accuracy between baseline and finetuned model."""
    n = len(class_names)

    def per_class_acc(labels, preds):
        accs = []
        for i in range(n):
            mask = labels == i
            if mask.sum() == 0:
                accs.append(0.0)
            else:
                accs.append((preds[mask] == i).mean() * 100)
        return accs

    base_acc = per_class_acc(base_labels, base_preds)
    ft_acc = per_class_acc(ft_labels, ft_preds)

    x = np.arange(n)
    width = 0.35

    fig, ax = plt.subplots(figsize=(max(8, n * 1.2), 5))
    bars_base = ax.bar(x - width / 2, base_acc, width, label="Baseline (ImageNet head)", color="steelblue")
    bars_ft = ax.bar(x + width / 2, ft_acc, width, label="Finetuned", color="darkorange")

    ax.set_xlabel("Class")
    ax.set_ylabel("Accuracy (%)")
    ax.set_title("Per-Class Accuracy: Baseline vs Finetuned ResNet-50")
    ax.set_xticks(x)
    ax.set_xticklabels(class_names, rotation=30, ha="right")
    ax.set_ylim(0, 110)
    ax.legend()

    for bar in bars_base:
        ax.annotate(f"{bar.get_height():.1f}",
                    xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
                    xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8)
    for bar in bars_ft:
        ax.annotate(f"{bar.get_height():.1f}",
                    xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
                    xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    print(f"Comparison chart saved to {output_path}")


def print_report(labels, preds, class_names, model_name: str):
    correct = (labels == preds).sum()
    total = len(labels)
    print(f"\n{'='*60}")
    print(f"  {model_name}")
    print(f"{'='*60}")
    print(f"  Overall accuracy: {correct}/{total} ({100 * correct / total:.2f}%)")
    print(classification_report(labels, preds, target_names=class_names))


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    loader, class_names = get_dataloader(DATA_DIR)
    num_classes = len(class_names)
    print(f"Classes ({num_classes}): {class_names}")

    # Baseline model 
    print("\nEvaluating baseline model (pretrained ResNet-50, untrained head)...")
    baseline_model = load_baseline_model(num_classes, device)
    base_labels, base_preds = run_inference(baseline_model, loader, device)
    print_report(base_labels, base_preds, class_names, "Baseline Model (ImageNet pretrained + random head)")

    base_cm_path = os.path.join(TRAINER_DIR, "confusion_matrix_baseline.png")
    plot_confusion_matrix(
        base_labels, base_preds, class_names,
        title="Confusion Matrix — Baseline ResNet-50 (untrained head)",
        output_path=base_cm_path,
    )

    # Finetuned model 
    print("\nEvaluating finetuned model...")
    ft_model = load_finetuned_model(MODEL_PATH, num_classes, device)
    ft_labels, ft_preds = run_inference(ft_model, loader, device)
    print_report(ft_labels, ft_preds, class_names, "Finetuned Model")

    ft_cm_path = os.path.join(TRAINER_DIR, "confusion_matrix_finetuned.png")
    plot_confusion_matrix(
        ft_labels, ft_preds, class_names,
        title="Confusion Matrix — Finetuned ResNet-50",
        output_path=ft_cm_path,
    )

    # Comparison b/w finetuned and baseline
    compare_path = os.path.join(TRAINER_DIR, "comparison_baseline_vs_finetuned.png")
    plot_comparison(class_names, base_labels, base_preds, ft_labels, ft_preds, compare_path)

    base_overall = 100 * (base_labels == base_preds).sum() / len(base_labels)
    ft_overall = 100 * (ft_labels == ft_preds).sum() / len(ft_labels)
    delta = ft_overall - base_overall
    print(f"\nSummary")
    print(f"  Baseline accuracy : {base_overall:.2f}%")
    print(f"  Finetuned accuracy: {ft_overall:.2f}%")
    print(f"  Delta             : {delta:+.2f}%")


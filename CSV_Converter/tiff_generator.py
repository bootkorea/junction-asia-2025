import os
import glob
import json
import cv2
import numpy as np
from ultralytics import YOLO
import tifffile

# --------------------------
# 설정
# --------------------------
model_path = "/home/azureuser/flow/runs/detect/yolov8n_no_augmentation/weights/best.pt"
img_folder = "/home/azureuser/flow/dataset/images/val/"
json_folder = "/home/azureuser/flow/dataset/labels/val/"
output_folder = "output_tiff"
os.makedirs(output_folder, exist_ok=True)

# YOLO 모델 로드
model = YOLO(model_path)

# 이미지 경로
img_paths = glob.glob(os.path.join(img_folder, "*.jpg"))
img_paths += glob.glob(os.path.join(img_folder, "*.png"))

# --------------------------
# 이미지 루프
# --------------------------
for img_path in img_paths:
    base_name = os.path.splitext(os.path.basename(img_path))[0]

    # 1. 이미지 읽기
    img = cv2.imread(img_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # 2. YOLO 추론
    results = model.predict(img_rgb, imgsz=640, conf=0.25, iou=0.45)

    yolo_bboxes = []
    yolo_classes = []
    yolo_scores = []

    for result in results:
        yolo_bboxes.extend(result.boxes.xyxy.cpu().numpy().tolist())
        yolo_classes.extend(result.boxes.cls.cpu().numpy().tolist())
        yolo_scores.extend(result.boxes.conf.cpu().numpy().tolist())

    # 3. 포맷 데이터(JSON) 읽기
    json_path = os.path.join(json_folder, f"{base_name}.json")
    if not os.path.exists(json_path):
        print(f"[Warning] JSON 파일 없음: {json_path}")
        continue

    with open(json_path, "r") as f:
        format_data = json.load(f)

    # 4. TIFF 메타데이터 구성
    tiff_metadata = {
        "image_info": format_data.get("images", {}),
        "annotations": format_data.get("annotations", {}),
        "info": format_data.get("info", {}),
        "categories": format_data.get("categories", {}),
        "environment": format_data.get("environment", {}),
        "yolo_results": {
            "bboxes": yolo_bboxes,
            "classes": yolo_classes,
            "scores": yolo_scores
        }
    }

    metadata_str = json.dumps(tiff_metadata)

    # 5. TIFF 저장
    save_path = os.path.join(output_folder, f"{base_name}.tiff")
    tifffile.imwrite(
        save_path,
        img_rgb,
        description=metadata_str
    )

    print(f"[Saved] {save_path}")

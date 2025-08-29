import os
from ultralytics import YOLO
import cv2
import glob

model = YOLO("/home/azureuser/flow/runs/detect/yolov8n_no_augmentation/weights/best.pt")

img_folder = "/home/azureuser/flow/dataset/images/val/"
output_folder = "../output"
os.makedirs(output_folder, exist_ok=True)

img_paths = glob.glob(os.path.join(img_folder, "*.jpg"))
img_paths += glob.glob(os.path.join(img_folder, "*.png"))

for img_path in img_paths:
    img = cv2.imread(img_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    results = model.predict(img_rgb, imgsz=640, conf=0.25, iou=0.45)

    for result in results:
        boxes = result.boxes.xyxy.cpu().numpy()
        scores = result.boxes.conf.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy()
        print(f"{img_path} -> Boxes: {boxes}, Scores: {scores}, Classes: {classes}")

    # 시각화 및 저장
    for result in results:
        # 화면 표시
        result.show()

        # 원본 파일명을 사용하여 저장 → 덮어씌움 방지
        base_name = os.path.splitext(os.path.basename(img_path))[0]
        save_path = os.path.join(output_folder, f"{base_name}.png")

        # 안전하게 저장 (cv2.imwrite 사용 권장)
        annotated_img = result.plot()  # 바운딩 박스 그린 이미지
        cv2.imwrite(save_path, annotated_img)
        print(f"Saved: {save_path}")

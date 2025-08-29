from ultralytics import YOLO

model = YOLO("./runs/detect/yolov8n_full_augmentation5/weights/best.pt")
model.export(format="onnx")

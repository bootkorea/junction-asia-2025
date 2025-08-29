import os
import glob
import json
import cv2
import numpy as np
from ultralytics import YOLO
import datetime
import csv
from collections import defaultdict
from pyproj import Transformer



def run_script(script_name: str = "fire_bbox"):
    """
    화재 이미지 데이터셋에 대해 YOLO 추론 후,
    WGS84 좌표 → EPSG:5181 변환 및 bbox 기록/예측 결과를 리스트로 반환
    """

    # --------------------------
    # 설정
    # --------------------------
    model_path = "/home/azureuser/flow/runs/detect/yolov8n_no_augmentation3/weights/best.pt"
    img_folder = "/mnt/external/Samples/images"
    json_folder = "/mnt/external/Samples/labels"

    model = YOLO(model_path)

    # 이미지 경로
    img_paths = glob.glob(os.path.join(img_folder, "*.jpg"))
    img_paths += glob.glob(os.path.join(img_folder, "*.png"))

    # --------------------------
    # 좌표 변환 함수
    # --------------------------
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:5181", always_xy=True)

    def image_to_geo_tm(x, y, img_width, img_height, geo_bbox=None, gps_center=None):
        """
        이미지 픽셀 좌표(x, y)를 위도/경도 좌표로 변환
        - geo_bbox: [lon_min, lat_min, lon_max, lat_max] (이미지 영역 좌표)
        - gps_center: [lon_center, lat_center] (이미지 중심 GPS 좌표)
        """
        if gps_center is not None:
            lon_center, lat_center = gps_center
            # 이미지 크기 기준으로 bbox를 중심 좌표 중심으로 변환
            # 예: x, y 픽셀 -> lon/lat 오프셋 계산
            lon_offset = (x - img_width / 2) / img_width * (geo_bbox[2] - geo_bbox[0] if geo_bbox else 0.001)
            lat_offset = (y - img_height / 2) / img_height * (geo_bbox[3] - geo_bbox[1] if geo_bbox else 0.001)
            lon = lon_center + lon_offset
            lat = lat_center + lat_offset
        else:
            # 기존 geo_bbox 기준 변환
            lon_min, lat_min, lon_max, lat_max = geo_bbox
            lon = lon_min + (x / img_width) * (lon_max - lon_min)
            lat = lat_min + (y / img_height) * (lat_max - lat_min)
        return lon, lat

    def get_fire_id_from_filename(filename):
        parts = filename.split("_")
        if len(parts) >= 3:
            return "_".join(parts[:-2])
        return filename

    # --------------------------
    # 관측 데이터 처리
    # --------------------------
    fire_data = defaultdict(list)
    output_data = []  # 최종적으로 return할 리스트

    for img_path in img_paths:
        base_name = os.path.splitext(os.path.basename(img_path))[0]
        fire_id = get_fire_id_from_filename(base_name)
        print("[INFO] 처리 중 fire_id:", fire_id)

        img = cv2.imread(img_path)
        img_height, img_width = img.shape[:2]
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        results = model.predict(img_rgb, imgsz=640, conf=0.25, iou=0.45)
        bboxes = []
        for result in results:
            bboxes.extend(result.boxes.xyxy.cpu().numpy().tolist())
        if len(bboxes) == 0:
            print("없음")
            continue

        json_path = os.path.join(json_folder, f"{base_name}.json")
        if not os.path.exists(json_path):
            continue
        with open(json_path, "r") as f:
            format_data = json.load(f)

        gps_str = format_data.get("environment", {}).get("gps", None)
        if gps_str is not None:
            # gps 문자열 처리
            lat_str, lon_str = gps_str.split(",")
            lat_center = float(lat_str.strip())
            lon_center = float(lon_str.strip())

            # gps 중심 기준으로 작은 bbox 생성 (±0.0005는 약 50m)
            geo_bbox = [
                lon_center - 0.0005, lat_center - 0.0005,
                lon_center + 0.0005, lat_center + 0.0005
            ]
        else:
            # 기존 geo_bbox 사용 (없으면 fallback)
            geo_bbox = format_data.get("environment", {}).get(
                "geo_bbox",
                [127.0, 37.5, 127.1, 37.6]
            )
            lon_center = (geo_bbox[0] + geo_bbox[2]) / 2
            lat_center = (geo_bbox[1] + geo_bbox[3]) / 2

        # ✅ 여기서 gps_center 정의
        gps_center = (lon_center, lat_center)


        lon_min_list, lat_min_list, lon_max_list, lat_max_list = [], [], [], []
        for bbox in bboxes:
            x1, y1, x2, y2 = bbox
            lon1, lat1 = image_to_geo_tm(x1, y1, img_width, img_height, geo_bbox, gps_center)
            lon2, lat2 = image_to_geo_tm(x2, y2, img_width, img_height, geo_bbox, gps_center)
            lon_min_list.append(lon1)
            lat_min_list.append(lat1)
            lon_max_list.append(lon2)
            lat_max_list.append(lat2)

        lon_min_bbox = min(lon_min_list)
        lat_min_bbox = min(lat_min_list)
        lon_max_bbox = max(lon_max_list)
        lat_max_bbox = max(lat_max_list)

        try:
            img_time = datetime.datetime.strptime(base_name[-12:], "%Y%m%d_%H%M")
        except:
            img_time = datetime.datetime.now()

        fire_data[fire_id].append((img_time, [lon_min_bbox, lat_min_bbox, lon_max_bbox, lat_max_bbox]))

    # --------------------------
    # 관측 + 예측 데이터 생성
    # --------------------------
    for fire_id, data_list in fire_data.items():
        data_list.sort(key=lambda x: x[0])

        # 관측 데이터 기록
        for t, bbox in data_list:
            output_data.append({
                "fire_id": fire_id,
                "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
                "data_type": "observed",
                "latitude_min": bbox[1],
                "latitude_max": bbox[3],
                "longitude_min": bbox[0],
                "longitude_max": bbox[2]
            })

        # 예측 데이터 기록
        if len(data_list) < 2:
            continue
        deltas = [(data_list[i+1][0]-data_list[i][0]).total_seconds()
                  for i in range(len(data_list)-1)]
        v_lon_min = np.mean([(data_list[i+1][1][0]-data_list[i][1][0])/deltas[i]
                             for i in range(len(deltas))])
        v_lon_max = np.mean([(data_list[i+1][1][2]-data_list[i][1][2])/deltas[i]
                             for i in range(len(deltas))])
        v_lat_min = np.mean([(data_list[i+1][1][1]-data_list[i][1][1])/deltas[i]
                             for i in range(len(deltas))])
        v_lat_max = np.mean([(data_list[i+1][1][3]-data_list[i][1][3])/deltas[i]
                             for i in range(len(deltas))])

        last_time = data_list[-1][0]
        last_bbox = data_list[-1][1]
        for minutes in [10, 20, 30, 40, 50, 60]:
            t_future = last_time + datetime.timedelta(minutes=minutes)
            delta_future = (t_future - last_time).total_seconds()
            lon_min_pred = last_bbox[0] + v_lon_min * delta_future
            lon_max_pred = last_bbox[2] + v_lon_max * delta_future
            lat_min_pred = last_bbox[1] + v_lat_min * delta_future
            lat_max_pred = last_bbox[3] + v_lat_max * delta_future
            output_data.append({
                "fire_id": fire_id,
                "timestamp": t_future.strftime("%Y-%m-%d %H:%M:%S"),
                "data_type": "predicted",
                "latitude_min": lat_min_pred,
                "latitude_max": lat_max_pred,
                "longitude_min": lon_min_pred,
                "longitude_max": lon_max_pred
            })

    return output_data

if __name__ == "__main__":
    run_script()

# import os
# import glob
# import shutil
# from collections import defaultdict
# from ultralytics import YOLO
# import cv2

# def run_script():
#     """
#     전체 그룹을 검사해서 조건을 만족하는 첫 '화염' 그룹을
#     img_folder/json_folder로 복사 후 종료
#     """

#     # --------------------------
#     # 설정
#     # --------------------------
#     src_img_folder = "/mnt/external/dataset/images/train"
#     src_json_folder = "/mnt/external/dataset/labels/train"
#     img_folder = "/mnt/external/Samples/images"
#     json_folder = "/mnt/external/Samples/labels"

#     # 대상 폴더 비우기
#     for folder in [img_folder, json_folder]:
#         for f in glob.glob(os.path.join(folder, "*")):
#             if os.path.isfile(f):
#                 os.remove(f)

#     model_path = "/home/azureuser/flow/runs/detect/yolov8n_no_augmentation3/weights/best.pt"
#     model = YOLO(model_path)

#     # 이미지 경로
#     img_paths = glob.glob(os.path.join(src_img_folder, "*.jpg"))
#     img_paths += glob.glob(os.path.join(src_img_folder, "*.png"))

#     # fire_id 추출 (끝에서 2번째까지 기준)
#     def get_fire_id_from_filename(filename):
#         parts = filename.split("_")
#         if len(parts) >= 3:
#             return "_".join(parts[:-2])
#         return filename

#     # fire_id 그룹핑
#     fire_groups = defaultdict(list)
#     for img_path in img_paths:
#         base_name = os.path.splitext(os.path.basename(img_path))[0]
#         fire_id = get_fire_id_from_filename(base_name)
#         if "화염" in base_name:
#             fire_groups[fire_id].append(base_name)

#     # 전체 그룹 검사 후 조건 만족 시 복사
#     for fire_id, base_names in fire_groups.items():
#         print("[INFO] 검사 중 fire_id 그룹:", fire_id)
#         group_has_bbox = False
#         for base_name in base_names:
#             img_src = os.path.join(src_img_folder, f"{base_name}.jpg")
#             if not os.path.exists(img_src):
#                 img_src = os.path.join(src_img_folder, f"{base_name}.png")
#             if not os.path.exists(img_src):
#                 continue

#             # YOLO 추론
#             img = cv2.imread(img_src)
#             img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#             results = model.predict(img_rgb, imgsz=640, conf=0.25, iou=0.45)
#             bboxes = []
#             for result in results:
#                 bboxes.extend(result.boxes.xyxy.cpu().numpy().tolist())

#             if len(bboxes) > 0:
#                 group_has_bbox = True
#                 break  # 그룹 내 bbox 확인 완료

#         if group_has_bbox:
#             print("[INFO] 조건 만족하는 그룹 발견, 복사 시작:", fire_id)
#             for base_name in base_names:
#                 img_src = os.path.join(src_img_folder, f"{base_name}.jpg")
#                 if not os.path.exists(img_src):
#                     img_src = os.path.join(src_img_folder, f"{base_name}.png")
#                 json_src = os.path.join(src_json_folder, f"{base_name}.json")

#                 if os.path.exists(img_src) and os.path.exists(json_src):
#                     shutil.copy(img_src, img_folder)
#                     shutil.copy(json_src, json_folder)
#                     print("[INFO] 복사 완료:", base_name)
#             print("[INFO] 그룹 처리 완료, 스크립트 종료")
#             return

#     print("[INFO] 조건 만족하는 그룹 없음")

# if __name__ == "__main__":
#     run_script()

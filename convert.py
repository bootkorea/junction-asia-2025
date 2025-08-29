import json
import os
from glob import glob


def convert_coco_to_yolo(coco_json_path, save_dir):
    """
    COCO 형식의 JSON 파일을 YOLO 형식의 TXT 파일로 변환합니다.

    Args:
        coco_json_path (str): COCO JSON 파일들이 있는 디렉토리 경로
        save_dir (str): 변환된 TXT 파일을 저장할 디렉토리 경로
    """
    json_files = glob(os.path.join(coco_json_path, '*.json'))

    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        print(f"'{save_dir}' 디렉토리를 생성했습니다.")

    for json_file in json_files:
        with open(json_file, 'r', encoding='utf-8') as f:
            # 수정된 부분: json.load() 함수에 파일 객체 'f'를 전달합니다.
            data = json.load(f)

        image_info = data['images'][0]
        img_width = image_info['width']
        img_height = image_info['height']

        txt_file_name = os.path.splitext(
            os.path.basename(json_file))[0] + '.txt'
        txt_file_path = os.path.join(save_dir, txt_file_name)

        with open(txt_file_path, 'w', encoding='utf-8') as f:
            for ann in data['annotations']:
                # YOLO 클래스 ID는 0부터 시작하므로 1을 빼줍니다.
                category_id = ann['category_id'] - 1

                # 세그멘테이션 좌표에서 바운딩 박스 계산
                seg = ann['segmentation'][0]
                x_coords = [seg[i] for i in range(0, len(seg), 2)]
                y_coords = [seg[i] for i in range(1, len(seg), 2)]

                x_min = min(x_coords)
                y_min = min(y_coords)
                x_max = max(x_coords)
                y_max = max(y_coords)

                # YOLO 형식으로 정규화 (x_center, y_center, width, height)
                x_center = ((x_min + x_max) / 2) / img_width
                y_center = ((y_min + y_max) / 2) / img_height
                width = (x_max - x_min) / img_width
                height = (y_max - y_min) / img_height

                f.write(
                    f"{category_id} {x_center} {y_center} {width} {height}\n")

    print(f"'{coco_json_path}'의 모든 JSON 파일 변환 완료!")


# 실행 코드
if __name__ == '__main__':
    # train 데이터 변환
    convert_coco_to_yolo('./dataset/labels/train', './dataset/labels/train')

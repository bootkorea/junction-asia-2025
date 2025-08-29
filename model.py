import subprocess
import sys
import os
import shutil
from ultralytics import YOLO

from domain_randomization import process_directory as randomize_data
from augment_data import apply_domain_adaptation as adapt_data


def run_script(script_name):
    """단순 실행 스크립트를 위한 헬퍼 함수"""
    try:
        print(f"--- {script_name} 실행 시작 ---")
        subprocess.run([sys.executable, script_name], check=True)
        print(f"--- {script_name} 실행 완료 ---\n")
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print(f"오류: '{script_name}' 실행 중 문제가 발생했습니다. ({e})")
        sys.exit(1)


def copy_validation_files(img_src, lbl_src, img_dest, lbl_dest):
    """원본 검증 파일들을 최종 학습 폴더로 복사"""
    print("--- 원본 검증 파일 복사 시작 ---")
    os.makedirs(img_dest, exist_ok=True)
    os.makedirs(lbl_dest, exist_ok=True)

    for item in os.listdir(img_src):
        shutil.copy(os.path.join(img_src, item), img_dest)
    for item in os.listdir(lbl_src):
        if item.endswith('.txt'):
            shutil.copy(os.path.join(lbl_src, item), lbl_dest)
    print("--- 원본 검증 파일 복사 완료 ---\n")

# --- 파이프라인 시작 ---


# 0단계: 경로 설정
# 원본 데이터 경로
ORIG_IMG_TRAIN = './dataset/images/train'
ORIG_LBL_TRAIN = './dataset/labels/train'
ORIG_IMG_VAL = './dataset/images/val'
ORIG_LBL_VAL = './dataset/labels/val'
# 중간 단계 (Randomization) 데이터 경로
RAND_IMG_TRAIN = './dataset_randomized/images/train'
RAND_LBL_TRAIN = './dataset_randomized/labels/train'
# 최종 (Adaptation) 데이터 경로
AUG_IMG_TRAIN = './dataset_augmented/images/train'
AUG_LBL_TRAIN = './dataset_augmented/labels/train'
AUG_IMG_VAL = './dataset_augmented/images/val'
AUG_LBL_VAL = './dataset_augmented/labels/val'
# 배경 이미지 경로
BG_IMG_DIR = './background_images'


# 1단계: COCO(.json) -> YOLO(.txt) 라벨 변환
run_script('convert.py')

# 2단계: Domain Randomization (학습 데이터만)
randomize_data(ORIG_IMG_TRAIN, ORIG_LBL_TRAIN, RAND_IMG_TRAIN, RAND_LBL_TRAIN)

# 3단계: Domain Adaptation (배경 교체, 학습 데이터만)
adapt_data(RAND_IMG_TRAIN, RAND_LBL_TRAIN,
           BG_IMG_DIR, AUG_IMG_TRAIN, AUG_LBL_TRAIN)

# 4단계: 원본 검증 데이터 복사
copy_validation_files(ORIG_IMG_VAL, ORIG_LBL_VAL, AUG_IMG_VAL, AUG_LBL_VAL)

# 5단계: YOLOv8 모델 로드 및 학습
model = YOLO('yolov8n.pt')

print("--- 모델 학습 시작 ---")
results = model.train(
    data='./data_augmented.yaml',
    epochs=5,
    imgsz=640,
    batch=16,
    name='yolov8n_full_augmentation'
)
print("--- 모델 학습 완료 ---\n")

# 6단계: 최종 결과 확인
print("모든 파이프라인이 성공적으로 완료되었습니다!")
print(f"학습 결과는 '{results.save_dir}'에 저장되었습니다.")

import cv2
import os
import glob
import albumentations as A


def apply_domain_randomization(image, bboxes, class_labels):
    """
    Albumentations를 사용하여 이미지와 Bbox에 Domain Randomization을 적용합니다.
    """
    transform = A.Compose([
        A.ShiftScaleRotate(shift_limit=0.1, scale_limit=0.2, rotate_limit=30, p=0.8,
                           border_mode=cv2.BORDER_CONSTANT, value=0),
        A.RandomBrightnessContrast(
            brightness_limit=0.2, contrast_limit=0.2, p=0.7),
        A.ColorJitter(brightness=0.2, contrast=0.2,
                      saturation=0.2, hue=0.1, p=0.7),
        A.GaussNoise(var_limit=(10.0, 50.0), p=0.5),
        A.RandomSizedBBoxSafeCrop(
            width=image.shape[1], height=image.shape[0], erosion_rate=0.2, p=0.3)
    ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'], min_visibility=0.1))

    randomized = transform(image=image, bboxes=bboxes,
                           class_labels=class_labels)
    return randomized['image'], randomized['bboxes'], randomized['class_labels']


def process_directory(image_dir, label_dir, output_image_dir, output_label_dir):
    """지정된 디렉토리의 모든 이미지에 Domain Randomization을 적용합니다."""
    print(f"'{image_dir}'에 대한 Domain Randomization을 시작합니다.")

    os.makedirs(output_image_dir, exist_ok=True)
    os.makedirs(output_label_dir, exist_ok=True)

    label_files = glob.glob(os.path.join(label_dir, '*.txt'))

    for label_path in label_files:
        base_filename = os.path.splitext(os.path.basename(label_path))[0]
        image_path = os.path.join(image_dir, base_filename + '.jpg')

        if not os.path.exists(image_path):
            continue

        image = cv2.imread(image_path)

        bboxes = []
        class_labels = []
        with open(label_path, 'r') as f:
            for line in f:
                parts = list(map(float, line.strip().split()))
                class_labels.append(int(parts[0]))
                bboxes.append(parts[1:])

        # Domain Randomization 적용
        randomized_image, randomized_bboxes, randomized_labels = apply_domain_randomization(
            image, bboxes, class_labels)

        # 결과 저장
        output_img_path = os.path.join(
            output_image_dir, base_filename + '_rand.jpg')
        output_lbl_path = os.path.join(
            output_label_dir, base_filename + '_rand.txt')

        cv2.imwrite(output_img_path, randomized_image)
        with open(output_lbl_path, 'w') as f:
            for i, bbox in enumerate(randomized_bboxes):
                class_id = randomized_labels[i]
                f.write(f"{class_id} {' '.join(map(str, bbox))}\n")

    print(f"'{output_image_dir}'에 Randomized 데이터 저장을 완료했습니다.")

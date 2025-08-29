import cv2
import numpy as np
import os
import glob
import random


def apply_domain_adaptation(image_dir, label_dir, bg_dir, output_image_dir, output_label_dir):
    """
    Randomized된 이미지의 객체를 추출하여 새로운 배경에 합성
    """
    print(f"'{image_dir}'에 대한 Domain Adaptation(배경 교체)을 시작합니다.")

    os.makedirs(output_image_dir, exist_ok=True)
    os.makedirs(output_label_dir, exist_ok=True)

    bg_images = glob.glob(os.path.join(bg_dir, '*.*'))
    if not bg_images:
        print(f"경고: '{bg_dir}'에 배경 이미지가 없습니다. 이 단계를 건너뜁니다.")
        return

    label_files = glob.glob(os.path.join(label_dir, '*.txt'))

    for label_path in label_files:
        base_filename = os.path.splitext(os.path.basename(label_path))[0]
        image_path = os.path.join(image_dir, base_filename + '.jpg')

        if not os.path.exists(image_path):
            continue

        randomized_image = cv2.imread(image_path)
        rand_h, rand_w = randomized_image.shape[:2]

        background_image = cv2.imread(random.choice(bg_images))
        bg_h, bg_w = background_image.shape[:2]

        final_label_content = []

        with open(label_path, 'r') as f:
            lines = f.readlines()

        for line in lines:
            class_id, x_center, y_center, width, height = map(
                float, line.strip().split())

            w_abs = int(width * rand_w)
            h_abs = int(height * rand_h)
            x_min_abs = max(0, int((x_center * rand_w) - w_abs / 2))
            y_min_abs = max(0, int((y_center * rand_h) - h_abs / 2))

            obj_image = randomized_image[y_min_abs:y_min_abs +
                                         h_abs, x_min_abs:x_min_abs+w_abs]

            if obj_image.size == 0:
                continue

            max_x = bg_w - w_abs
            max_y = bg_h - h_abs
            if max_x <= 0 or max_y <= 0:
                continue

            paste_x = random.randint(0, max_x)
            paste_y = random.randint(0, max_y)

            background_image[paste_y:paste_y+h_abs,
                             paste_x:paste_x+w_abs] = obj_image

            new_x_center = (paste_x + w_abs / 2) / bg_w
            new_y_center = (paste_y + h_abs / 2) / bg_h
            new_width = w_abs / bg_w
            new_height = h_abs / bg_h

            final_label_content.append(
                f"{int(class_id)} {new_x_center} {new_y_center} {new_width} {new_height}")

        if final_label_content:
            output_img_path = os.path.join(
                output_image_dir, base_filename + '_final.jpg')
            output_lbl_path = os.path.join(
                output_label_dir, base_filename + '_final.txt')

            cv2.imwrite(output_img_path, background_image)
            with open(output_lbl_path, 'w') as f:
                f.write("\n".join(final_label_content))

    print(f"'{output_image_dir}'에 최종 증강 데이터 저장을 완료했습니다.")

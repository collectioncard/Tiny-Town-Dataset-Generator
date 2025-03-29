from datasets import Dataset, Features, Image, Value
import os
import pandas as pd
import json

"""
Creates a parquet file from data located in the INPUT directory. This script requires the following files:
- map_name.txt: A text file containing the World Facts Database.
- map_name.png: A screenshot of the map.
- map_name.csv: A CSV file with the questions, answers, and distractors.
- map_name_simp.txt (hand made): A text file containing the Points of Interest. (names + coordinates)
- map_name.json (hand made / use decomp script): A JSON file with the tile arrays.
"""

INPUT_DIR = "INPUT"
OUTPUT_FILE = "QA_Data.parquet"

def read_map_data(map_name):
    txt_path = os.path.join(INPUT_DIR, f"{map_name}.txt")
    img_path = os.path.join(INPUT_DIR, f"{map_name}.png")
    csv_path = os.path.join(INPUT_DIR, f"{map_name}.csv")
    simp_path = os.path.join(INPUT_DIR, f"{map_name}_simp.txt")
    json_path = os.path.join(INPUT_DIR, f"{map_name}.json")

    with open(txt_path, "r", encoding="utf-8") as f:
        world_description = f.read().strip()

    if os.path.exists(simp_path):
        with open(simp_path, "r", encoding="utf-8") as f:
            poi = f.read().strip()
    else:
        poi = ""

    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            tiles_data = json.load(f)
            tiles = json.dumps(tiles_data)
    else:
        tiles = "{}"

    with open(img_path, "rb") as img_file:
        img_bytes = img_file.read()

    questions_df = pd.read_csv(csv_path)
    questions_df = questions_df.fillna("")

    data = []
    for _, row in questions_df.iterrows():
        distractors = row["Distractors"].split(";")
        distractors += [""] * (3 - len(distractors))

        data.append({
            "image": img_bytes,
            "worldFacts": world_description,
            "poi": poi,
            "tileData": tiles,
            "question": row["Question"],
            "answer": row["Answer"],
            "distractor1": distractors[0].strip(),
            "distractor2": distractors[1].strip(),
            "distractor3": distractors[2].strip(),
        })

    return data


def create_dataset():
    all_data = []

    for file in os.listdir(INPUT_DIR):
        if file.endswith(".txt") and not file.endswith("_simp.txt"):
            map_name = file.replace(".txt", "")
            try:
                map_data = read_map_data(map_name)
                all_data.extend(map_data)
            except Exception as e:
                print(f"Error processing {map_name}: {e}")

    if not all_data:
        print("Cant find input data")
        return

    dataset_dict = {key: [entry[key] for entry in all_data] for key in all_data[0]}

    dataset = Dataset.from_dict(
        dataset_dict,
        features=Features({
            "image": Image(),
            "worldFacts": Value("string"),
            "poi": Value("string"),
            "tileData": Value("string"),
            "question": Value("string"),
            "answer": Value("string"),
            "distractor1": Value("string"),
            "distractor2": Value("string"),
            "distractor3": Value("string"),
        })
    )

    dataset.flatten_indices().to_parquet(OUTPUT_FILE)
    print(f"✅ Dataset created successfully: {OUTPUT_FILE}")


if __name__ == "__main__":
    create_dataset()

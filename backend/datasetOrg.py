# following the examples in 
# https://huggingface.co/docs/datasets/en/image_dataset

# to publish in
# https://huggingface.co/datasets/SentientDragon5/TinyTown20x20

from csvMetaMaker import txt_to_csv

import os
import shutil

def split_images(source_folder, data_folder="data", train_to_test_ratio = 10):
  """
  Copies images from a source folder into 'train' and 'test' subfolders within a 'data' folder.
  Every 10th image is copied to the 'test' folder, the rest to 'train'.

  Args:
    source_folder: The path to the folder containing the images.
    data_folder: The name of the folder to create for train and test sets. Defaults to 'data'.
  """

  # Create the data folder (overwrites if it exists)
  if os.path.exists(data_folder):
    shutil.rmtree(data_folder)  # Remove existing data folder
  os.makedirs(data_folder)

  # Create train and test folders inside the data folder
  train_folder = os.path.join(data_folder, "train")
  test_folder = os.path.join(data_folder, "test")
  os.makedirs(train_folder)
  os.makedirs(test_folder)

  image_count = 0
  for filename in os.listdir(source_folder):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
      source_path = os.path.join(source_folder, filename)
      image_count += 1
      if image_count % train_to_test_ratio == 0:
        destination_path = os.path.join(test_folder, filename)
      else:
        destination_path = os.path.join(train_folder, filename)

      #print(destination_path, image_count)
      shutil.copy(source_path, destination_path)
      shutil.copy(source_path.replace('.png','.txt'), destination_path.replace('.png','.txt'))

def delete_all_txt_files(folder_path, verbose = False):
  """
  Recursively deletes all .txt files within a given folder.

  Args:
    folder_path: The path to the folder to search and delete .txt files from.
  """
  for filename in os.listdir(folder_path):
    file_path = os.path.join(folder_path, filename)
    if filename.endswith(".txt"):
      os.remove(file_path)
      if verbose: print(f"Deleted: {file_path}")
    elif os.path.isdir(file_path):
      delete_all_txt_files(file_path)

if __name__ == "__main__":
  source_folder ="./mapOutput/1737682480303"
  dest_folder = "./mapOutput/dataset"
  split_images(source_folder, dest_folder, 8)
  txt_to_csv(dest_folder+"/test", dest_folder+"/test"+"/metadata.csv")
  txt_to_csv(dest_folder+"/train", dest_folder+"/train"+"/metadata.csv")
  delete_all_txt_files(dest_folder)
  print("Dataset created at ", dest_folder)
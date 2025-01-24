# following the examples in 
# https://huggingface.co/docs/datasets/en/image_dataset

# to publish in
# https://huggingface.co/datasets/SentientDragon5/TinyTown20x20count100

# pip install alive_progress


from csvMetaMaker import txt_to_csv
from csvMetaMaker import count_files_folders

import os
import shutil
from alive_progress import alive_bar

def split_images(source_folder, data_folder="data", sub_name="/images", train_to_test_ratio = 10):
  """
  Copies images from a source folder into 'train' and 'test' subfolders within a 'data' folder.
  Every 10th image is copied to the 'test' folder, the rest to 'train'.

  Args:
    source_folder: The path to the folder containing the images.
    data_folder: The name of the folder to create for train and test sets. Defaults to 'data'.
  """
  print(f"Copying images from {source_folder} to {data_folder} with a ratio of {train_to_test_ratio}")
  count = count_files_folders(source_folder)//2+2
  with alive_bar(count) as bar:
    # Create the data folder (overwrites if it exists)
    if os.path.exists(data_folder):
        shutil.rmtree(data_folder)  # Remove existing data folder
    os.makedirs(data_folder)
    bar()

    # Create train and test folders inside the data folder
    train_folder = os.path.join(data_folder, "train"+sub_name)
    test_folder = os.path.join(data_folder, "test"+sub_name)
    os.makedirs(train_folder)
    os.makedirs(test_folder)
    bar()
    image_count = 0
    for filename in os.listdir(source_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            source_path = os.path.join(source_folder, filename)
            if is_file_size_below_thresh(source_path):
                continue
            image_count += 1
            if image_count % train_to_test_ratio == 0:
                destination_path = os.path.join(test_folder, filename)
            else:
                destination_path = os.path.join(train_folder, filename)

            #print(destination_path, image_count)
            shutil.copy(source_path, destination_path)
            shutil.copy(source_path.replace('.png','.txt'), destination_path.replace('.png','.txt'))
            bar()
    print(f"Created dataset folder with {image_count} files, {image_count//train_to_test_ratio} test and {image_count-image_count//train_to_test_ratio} train")


def is_file_size_below_thresh(file_path, min_size = 5*1024):
  """
  Checks if a file is smaller than threshold in bytes

  Args:
    file_path: The path to the file.
    min_size: the minimum size in bytes

  Returns:
    True if the file is smaller than the threshold, False otherwise.
  """
  try:
    file_size = os.path.getsize(file_path)
    if file_size < min_size: print(f"file below min size {file_path} with size of {file_size}")
    return file_size < min_size
  except FileNotFoundError:
    print(f"File not found: {file_path}")
    return False

def move_files_to_folders(source_folder, items_per_folder=200):
    """
    Moves files from a source folder into numbered folders, each containing a 
    specified number of items.

    Args:
      source_folder: The path to the folder containing the files to move.
      items_per_folder: The maximum number of items to place in each folder.
    """

    file_list = os.listdir(source_folder)
    file_count = len(file_list)
    folder_count = 1
    current_index = 0

    with alive_bar(file_count) as bar:
        while current_index < file_count:
            # Create a new folder
            new_folder_name = os.path.join(source_folder, str(folder_count))
            os.makedirs(new_folder_name, exist_ok=True)

            # Move files to the new folder
            for i in range(items_per_folder):
                if current_index < file_count:
                    source_file = os.path.join(source_folder, file_list[current_index])
                    destination_file = os.path.join(new_folder_name, file_list[current_index])
                    shutil.move(source_file, destination_file)
                    current_index += 1
                    bar()
                else:
                    break

            folder_count += 1

def count_files(folder_path, extention = ".txt"):
  """
  Counts the number of .txt files in a folder, including subfolders.

  Args:
    folder_path: The path to the folder to search.

  Returns:
    The total number of .txt files found.
  """

  count = 0
  for item in os.listdir(folder_path):
    item_path = os.path.join(folder_path, item)
    if os.path.isfile(item_path) and item.lower().endswith(extention):
      count += 1
    elif os.path.isdir(item_path):
      count += count_files(item_path, extention)  # Recursively count in subfolders
  return count

def delete_all_txt_files(folder_path, verbose = False):
  """
  Recursively deletes all .txt files within a given folder.

  Args:
    folder_path: The path to the folder to search and delete .txt files from.
  """
  #count = count_files(folder_path)
  #with alive_bar(count) as bar:
  for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if filename.endswith(".txt"):
            os.remove(file_path)
            if verbose: print(f"Deleted: {file_path}")
            #bar()
        elif os.path.isdir(file_path):
            delete_all_txt_files(file_path)

if __name__ == "__main__":
  # this has a failed generation and was my test
  # source_folder ="./mapOutput/1737682480303"
  # large data 1000 is 1737686210274
  # 100 data is 1737686107279
  chunking = False
  # Hugging face only allows uploads in size of 200 files per upload. this packages the files into folders of 200, so you
  # can manually upload. not ideal, but it gets the job done. use chunking to turn this on.
  source_folder ="./mapOutput/1737686210274"
  dest_folder = "./mapOutput/dataset"
  sub_name = ""
  sub_dir = ""+sub_name # put a / in the '' if using sub name
  split_images(source_folder, dest_folder, ""+sub_dir, 8)
  print("Images copied and split")
  txt_to_csv(dest_folder+"/test"+sub_dir, dest_folder+"/test"+"/metadata.csv", sub_name)
  print("Test metadata complete")
  txt_to_csv(dest_folder+"/train"+sub_dir, dest_folder+"/train"+"/metadata.csv", sub_name)
  print("Train metadata complete")
  #txt_to_csv(dest_folder, dest_folder+"/metadata.csv",dest_folder)
  delete_all_txt_files(dest_folder)
  print("Dataset created at ", dest_folder)
  
  if chunking:
    move_files_to_folders(dest_folder+"/test"+sub_dir)
    move_files_to_folders(dest_folder+"/train"+sub_dir)
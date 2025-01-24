import os
import csv
from alive_progress import alive_bar

# pip install alive_progress

def count_files_folders(folder_path):
  """
  Counts the number of files in a folder recursively.

  Args:
    folder_path: The path to the folder.

  Returns:
    The number of files in the folder.
  """
  count = 1
  for item in os.listdir(folder_path):
    item_path = os.path.join(folder_path, item)
    if os.path.isfile(item_path):
      count += 1
    elif os.path.isdir(item_path):
      count += count_files_folders(item_path)+1
  return count

def txt_to_csv(folder_path, csv_path, origin_folder):
  """
  Finds all .txt files in a folder and creates a CSV file with the format:
  txt file name,txt file contents

  Args:
    folder_path: The path to the folder containing the .txt files.
    csv_path: The name of the CSV file to be created.
  """
  count = count_files_folders(folder_path)
  with alive_bar(count) as bar:
    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
      writer = csv.writer(csvfile)
      writer.writerow(["file_name", "file_description"])  # Write header row

      for filename in os.listdir(folder_path):
        full_path = os.path.join(origin_folder, filename)
        if filename.endswith(".txt"):
          file_path = os.path.join(folder_path, filename)
          with open(file_path, 'r', encoding='utf-8') as txtfile:
            content = txtfile.read()
            content = content.replace('\n', ' ')  
            writer.writerow([full_path.replace('.txt','.png'), content])
        elif os.path.isdir(filename):
          txt_to_csv(os.path.join(folder_path, filename), csv_path, full_path)
        bar()

if __name__ == "__main__":
  # tested in 1737682480303
  folder_path = "./mapOutput/1737686210274"
  csv_path = "./mapOutput/dataset/metadata.csv"  # You can customize the CSV file name
  txt_to_csv(folder_path, csv_path, folder_path)
  print(f"CSV file '{csv_path}' created successfully.")
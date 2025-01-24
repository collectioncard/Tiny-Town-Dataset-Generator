import os
import csv

def txt_to_csv(folder_path, csv_path, origin_folder):
  """
  Finds all .txt files in a folder and creates a CSV file with the format:
  txt file name,txt file contents

  Args:
    folder_path: The path to the folder containing the .txt files.
    csv_path: The name of the CSV file to be created.
  """

  with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    #writer.writerow(["file name", "file description"])  # Write header row

    for filename in os.listdir(folder_path):
      full_path = os.path.join(origin_folder, filename)
      if filename.endswith(".txt"):
        file_path = os.path.join(folder_path, filename)
        with open(file_path, 'r', encoding='utf-8') as txtfile:
          content = txtfile.read()
          content = content.replace('\n', ' ')  
          writer.writerow([full_path, content])
      elif os.path.isdir(filename):
          txt_to_csv(os.path.join(folder_path, filename), csv_path, full_path)

if __name__ == "__main__":
  # tested in 1737682480303
  folder_path = "./mapOutput/1737686210274"
  csv_path = "./mapOutput/dataset/metadata.csv"  # You can customize the CSV file name
  txt_to_csv(folder_path, csv_path, folder_path)
  print(f"CSV file '{csv_path}' created successfully.")
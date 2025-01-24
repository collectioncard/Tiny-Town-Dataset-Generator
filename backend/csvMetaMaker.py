import os
import csv

def txt_to_csv(folder_path, csv_file_name):
  """
  Finds all .txt files in a folder and creates a CSV file with the format:
  txt file name,txt file contents

  Args:
    folder_path: The path to the folder containing the .txt files.
    csv_file_name: The name of the CSV file to be created.
  """

  with open(csv_file_name, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    #writer.writerow(["file name", "file description"])  # Write header row

    for filename in os.listdir(folder_path):
      if filename.endswith(".txt"):
        file_path = os.path.join(folder_path, filename)
        with open(file_path, 'r', encoding='utf-8') as txtfile:
          content = txtfile.read()
          content = content.replace('\n', '\\n')  
          writer.writerow([filename, content])

if __name__ == "__main__":
  folder_name = "1737682480303"
  folder_path = "./mapOutput/"+folder_name
  csv_file_name = "./mapOutput/metadata.csv"  # You can customize the CSV file name
  txt_to_csv(folder_path, csv_file_name)
  print(f"CSV file '{csv_file_name}' created successfully.")
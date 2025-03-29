import os
import csv
from alive_progress import alive_bar

import pandas as pd
import glob
import re
import shutil


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

# manually ctrl f and replace
# Distractor1,Distractor2,Distractor3
# '; ' with ','
# line 396 had an extra nothing on it at the end

def add_row_index_to_csv(input_file, output_file, header_name="id"):  # Added header_name parameter
    """Adds a row index as the first column to a CSV file with a specified header.

    Args:
        input_file: Path to the input CSV file.
        output_file: Path to the output CSV file.
        header_name: The name of the header for the index column (default: "id").
    """

    try:
        with open(input_file, 'r', newline='', encoding='utf-8') as infile, \
                open(output_file, 'w', newline='', encoding='utf-8') as outfile:

            reader = csv.reader(infile)
            writer = csv.writer(outfile)

            # Write the header row
            writer.writerow([header_name] + next(reader))  # Add header and original header

            row_index = 1  # Start index from 1

            for row in reader:
                new_row = [row_index] + row  # Prepend row index
                writer.writerow(new_row)
                row_index += 1

    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.")
    except StopIteration: # Handle empty input file
        print(f"Error: Input file '{input_file}' is empty.")
    except Exception as e:
        print(f"An error occurred: {e}")


def create_qa_csv(directory, out_name):
    """
    Creates a qa.csv file with 'id' (from the CSV) and 'filename' 
    as the first columns.

    Args:
        directory: The path to the directory containing the map files.
    """

    qa_data = []

    image_files = sorted(glob.glob(os.path.join(directory, "map*.png")))
    csv_files = sorted(glob.glob(os.path.join(directory, "map*.csv")))

    file_mapping = {}
    for image_file in image_files:
        base_name = os.path.splitext(os.path.basename(image_file))[0]
        file_mapping[base_name] = {"image": image_file}

    for csv_file in csv_files:
        base_name = os.path.splitext(os.path.basename(csv_file))[0]
        if base_name in file_mapping:
            file_mapping[base_name]["csv"] = csv_file

    for base_name, files in file_mapping.items():
        if "csv" in files:
            csv_file = files["csv"]
            try:
                df = pd.read_csv(csv_file)
                filename = os.path.basename(files['image'])

                df.insert(0, 'file_name', filename)
                qa_data.append(df)

            except FileNotFoundError:
                print(f"Warning: CSV file not found for {base_name}")
            except pd.errors.EmptyDataError:
                print(f"Warning: CSV file is empty: {csv_file}")
            except Exception as e:
                print(f"Error processing {csv_file}: {e}")
        else:
            print(f"Warning: No CSV file found for {base_name}")

    if qa_data:
        qa_df = pd.concat(qa_data, ignore_index=True)
        output_file = os.path.join(directory, out_name)
        qa_df.to_csv(output_file, index=False)
        print(f"qa.csv created successfully in {directory}")
    else:
        print("No matching map PNG and CSV files found to create qa.csv")

def fix_columns_distractors(directory):
    """
    Processes all CSV files in a directory, replacing semicolons with commas,
    setting the last column name, and adding two new headers.

    Args:
        directory: The path to the directory containing the CSV files.
        new_headers: A list of two strings representing the new header names.
    """

    csv_files = glob.glob(os.path.join(directory, "*.csv"))  # Find all CSV files

    for csv_file in csv_files:
        try:
            # Read the CSV, handling potential encoding issues and using ; as a separator
            df = pd.read_csv(csv_file, sep=';', encoding='utf-8', engine='python')  # engine='python' for better sep handling

            # Replace semicolons with commas in the entire DataFrame (if needed)
            df = df.apply(lambda x: x.astype(str).str.replace(';', ',', regex=False) if x.dtype == 'object' else x)


            # Set the last column name (replace 'old_last_name' with the actual old name if known)
            last_column_name = df.columns[-1] # Get current name
            df = df.rename(columns={last_column_name: "Distractor1"}) # Rename

            # Add the new headers at the beginning
            df = pd.concat([pd.DataFrame([["Distractor2","Distractor3"]], columns=df.columns), df], ignore_index=True)

            # Save the modified DataFrame back to the same CSV file (overwriting it)
            df.to_csv(csv_file, index=False)  # Save changes

            print(f"Processed: {csv_file}")

        except FileNotFoundError:
            print(f"File not found: {csv_file}")
        except pd.errors.ParserError:
            print(f"Error parsing CSV: {csv_file}. Check the delimiter and encoding.")
        except Exception as e:
            print(f"An error occurred processing {csv_file}: {e}")

def duplicate_images_and_update_csv(csv_filepath, image_directory):
    """
    Duplicates images based on filename occurrences and updates the CSV file.

    Args:
        csv_filepath: Path to the CSV file.
        image_directory: Path to the directory containing the images.
    """

    try:
        df = pd.read_csv(csv_filepath)
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_filepath}")
        return

    image_counts = {}  # Keep track of image occurrences
    updated_rows = []

    for index, row in df.iterrows():
        original_filename = row['file_name']
        base_filename, ext = os.path.splitext(original_filename)  # Split filename and extension

        if base_filename not in image_counts:
            image_counts[base_filename] = 0

        count = image_counts[base_filename]
        new_filename = f"{base_filename}_{count}{ext}"
        image_counts[base_filename] += 1

        original_filepath = os.path.join(image_directory, original_filename)
        new_filepath = os.path.join(image_directory, new_filename)

        try:
            # Check if the original file exists before copying.
            if os.path.exists(original_filepath):
                shutil.copy2(original_filepath, new_filepath) #Copy metadata as well
            else:
                print(f"Warning: Image file not found: {original_filepath}")

        except FileNotFoundError:
            print(f"Error: Image file not found at {original_filepath}")
            return
        except Exception as e:
            print(f"An error occurred during file copy: {e}")
            return

        #Update the file_name in the dataframe row
        row['file_name'] = new_filename
        updated_rows.append(row)


    # Remove the original files after processing
    for base_filename in image_counts:
        original_filepath = os.path.join(image_directory, base_filename + os.path.splitext(df['file_name'][0])[1]) #Assumes all files have the same extension
        try:
            if os.path.exists(original_filepath):
              os.remove(original_filepath)
        except FileNotFoundError:
            print(f"Warning: Original Image file not found: {original_filepath}")
        except Exception as e:
            print(f"An error occurred during original file removal: {e}")


    updated_df = pd.DataFrame(updated_rows)
    try:
        updated_df.to_csv(csv_filepath, index=False)  # Overwrite the original CSV
        print(f"CSV file updated successfully at {csv_filepath}")
    except Exception as e:
        print(f"Error writing to CSV: {e}")
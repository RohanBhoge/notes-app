import pandas as pd
import os

file_path = 'questions data.xlsx'

try:
    xls = pd.ExcelFile(file_path)
    print(f"Sheet names: {xls.sheet_names}")

    for sheet_name in xls.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---")
        df = pd.read_excel(xls, sheet_name=sheet_name, nrows=5)
        print(df.to_string())
        print("-" * 30)

except ImportError as e:
    print(f"Error: {e}. Please install pandas and openpyxl.")
except Exception as e:
    print(f"An error occurred: {e}")

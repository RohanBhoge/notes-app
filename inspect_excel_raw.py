import pandas as pd

file_path = 'questions data.xlsx'

try:
    xls = pd.ExcelFile(file_path)
    for sheet_name in xls.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---")
        # Read without header to see raw rows
        df = pd.read_excel(xls, sheet_name=sheet_name, header=None, nrows=10)
        print(df.to_string())
        print("-" * 30)

except Exception as e:
    print(f"Error: {e}")

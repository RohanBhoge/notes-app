import pandas as pd

file_path = 'questions data.xlsx'

def main():
    try:
        xls = pd.ExcelFile(file_path)
        for sheet_name in xls.sheet_names:
            print(f"\n--- Sheet: {sheet_name} ---")
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None, nrows=5)
            # Replace NaN with empty string for cleaner output
            print(df.fillna('').to_string())
            print("-" * 30)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

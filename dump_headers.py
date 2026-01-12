import pandas as pd

file_path = 'questions data.xlsx'

def main():
    try:
        xls = pd.ExcelFile(file_path)
        with open('headers_dump.txt', 'w', encoding='utf-8') as f:
            for sheet_name in xls.sheet_names:
                f.write(f"\n--- Sheet: {sheet_name} ---\n")
                df = pd.read_excel(xls, sheet_name=sheet_name, header=None, nrows=5)
                # content
                for idx, row in df.iterrows():
                    row_list = [str(x).replace('\n', ' ') for x in row.tolist()]
                    f.write(f"Row {idx}: {row_list}\n")
            
        print("Dumped headers to headers_dump.txt")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

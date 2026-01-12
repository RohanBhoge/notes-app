import pandas as pd
import json
import re

file_path = 'questions data.xlsx'
output_file = 'chapters_data.json'

def normalize_text(text):
    if not isinstance(text, str):
        return str(text) if not pd.isna(text) else ""
    return text.strip()

def get_class_map(row0):
    class_map = {}
    current_class = None
    for idx, val in row0.items():
        val_str = normalize_text(val).upper()
        if "11TH" in val_str or "11" in val_str:
             current_class = "11th"
        elif "12TH" in val_str or "12" in val_str:
             current_class = "12th"
        if current_class:
            class_map[idx] = current_class
    return class_map

def get_subject_from_header(val):
    val = normalize_text(val).upper()
    if "CHEM" in val: return "Chemistry"
    if "PHY" in val: return "Physics"
    if "MATH" in val: return "Maths"
    if "BIO" in val: return "Biology"
    if "BOT" in val: return "Botany"
    if "ZOO" in val: return "Zoology"
    return None

def is_noise(item):
    u = item.upper()
    noise_keywords = [
        "CHEM", "PHY", "MATH", "BIO", "BOTANY", "ZOOLOGY", "BIOLOGY", "PHYSICS", "CHEMISTRY", "MATHS",
        "CHAPTERS", "QUESTIONS", "TOTAL", "EXTRACTED", 
        "11TH", "12TH", "XI", "XII"
    ]
    # Check for exact matches or strong inclusions
    if u in noise_keywords: return True
    if "QUESTIONS EXTRACTED" in u: return True
    return False

def split_chapters_by_class(raw_list, initial_class="11th", subject_name=""):
    cleaned_data = {
        "11th": [],
        "12th": []
    }
    
    current_class = initial_class
    subj_upper = subject_name.upper() if subject_name else ""
    
    for item in raw_list:
        u = item.upper()
        
        # Detect Class Switch Triggers
        triggers = ["12TH", "XII", "CLASS 12"]
        if subj_upper:
            triggers.append(subj_upper)
        
        # Specific overrides for known subjects to catch abbreviations often used as headers
        if subj_upper == "CHEMISTRY": triggers.append("CHEM")
        if subj_upper == "PHYSICS": triggers.append("PHY")
        if subj_upper == "MATHS": triggers.append("MATH")
        if subj_upper == "BIOLOGY": triggers.append("BIO")
        if subj_upper == "BOTANY": triggers.append("BOT")
        if subj_upper == "ZOOLOGY": triggers.append("ZOO")
            
        is_trigger = False
        for t in triggers:
            if t == u or (t in u and len(u) < len(t) + 3): # Fuzzy strict match
                is_trigger = True
                break
        
        if is_trigger:
            # If we see the trigger, assume it starts the *next* section (12th)
            # unless we were already in 12th (unlikely to switch back)
            if current_class == "11th":
                current_class = "12th"
                continue
            
        if "11TH" in u and len(u) < 10:
            current_class = "11th"
            continue
            
        # Detect Noise
        if is_noise(item):
            continue
            
        cleaned_data[current_class].append(item)
        
    return cleaned_data

def main():
    try:
        xls = pd.ExcelFile(file_path)
        all_data = {}

        exam_map = {
            'MHTCET': 'CET',
            'JEE': 'JEE',
            'NEET': 'NEET'
        }

        for sheet_name in xls.sheet_names:
            mapped_exam = exam_map.get(sheet_name, sheet_name)
            print(f"Processing {sheet_name} as {mapped_exam}...")
            
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
            class_map = get_class_map(df.iloc[0])
            
            sheet_extract = {} 
            
            num_cols = df.shape[1]
            for col_idx in range(num_cols):
                start_row = -1
                for r in range(2, 5): 
                    if r < len(df):
                        val = normalize_text(df.iloc[r, col_idx]).lower()
                        if "chapters" in val:
                            start_row = r + 1
                            break
                            
                if start_row != -1:
                    row1_val = normalize_text(df.iloc[1, col_idx])
                    row2_val = normalize_text(df.iloc[2, col_idx])
                    subj1 = get_subject_from_header(row1_val)
                    subj2 = get_subject_from_header(row2_val)
                    
                    final_subject = subj1 # Default
                    if mapped_exam == "NEET":
                        if subj2 in ["Botany", "Zoology"]:
                            final_subject = subj2
                        elif subj1 == "Biology" and not subj2:
                            final_subject = "Biology"
                    
                    if final_subject:
                        raw_chapters = df.iloc[start_row:, col_idx].dropna().apply(normalize_text).tolist()
                        raw_chapters = [c for c in raw_chapters if c and c.lower() != 'nan']
                        
                        initial_class = class_map.get(col_idx, "11th")
                        
                        # Pass subject name for trigger detection
                        split_data = split_chapters_by_class(raw_chapters, initial_class, final_subject)
                        
                        if final_subject not in sheet_extract:
                            sheet_extract[final_subject] = { "11th": [], "12th": [] }
                        
                        sheet_extract[final_subject]["11th"].extend(split_data["11th"])
                        sheet_extract[final_subject]["12th"].extend(split_data["12th"])
                        
                        print(f"  Extracted {final_subject}: {len(split_data['11th'])} (11th), {len(split_data['12th'])} (12th)")

            if mapped_exam == "NEET":
                if "Botany" in sheet_extract or "Zoology" in sheet_extract:
                    sheet_extract["Biology"] = {}
                    if "Botany" in sheet_extract:
                        sheet_extract["Biology"]["Botany"] = sheet_extract.pop("Botany")
                    if "Zoology" in sheet_extract:
                        sheet_extract["Biology"]["Zoology"] = sheet_extract.pop("Zoology")
            
            all_data[mapped_exam] = sheet_extract

        for exam in all_data:
            if 'Math' in all_data[exam]:
                 all_data[exam]['Maths'] = all_data[exam].pop('Math')

        with open(output_file, 'w') as f:
            json.dump(all_data, f, indent=2)
            print(f"\nSaved to {output_file}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

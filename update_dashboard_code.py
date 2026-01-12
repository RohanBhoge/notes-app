import json
import re

json_path = 'chapters_data.json'
js_path = 'frontend/src/pages/TeacherDashboard.jsx'

def main():
    try:
        # Read JSON
        with open(json_path, 'r') as f:
            new_data = json.load(f)
        
        # Convert JSON to simple JS object string (keys can stay quoted, it's valid JS)
        new_data_str = json.dumps(new_data, indent=2)
        
        # Read JS File
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to find chaptersData block
        # Look for start
        start_pattern = r'const chaptersData = \{'
        # Look for end (heuristic: it ends before 'const examSubjects')
        end_pattern = r'const examSubjects ='
        
        start_match = re.search(start_pattern, content)
        end_match = re.search(end_pattern, content)
        
        if not start_match or not end_match:
            print("Could not locate chaptersData block boundaries.")
            return
            
        start_idx = start_match.start()
        end_idx = end_match.start()
        
        # Find the actual closing brace of the object before examSubjects
        # We can scan backwards from end_match
        pre_block = content[:end_idx]
        block_end = pre_block.rfind('};')
        
        if block_end < start_idx:
            print("Error parsing block end.")
            return

        # Construct new content
        # We replace from `start_idx` to `block_end + 2` (include };)
        
        new_block = f"const chaptersData = {new_data_str};"
        
        final_content = content[:start_idx] + new_block + "\n\n" + content[end_idx:] # Added spacing
        
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
            
        print(f"Successfully updated {js_path}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

import re
import json

try:
    import fitz  # PyMuPDF
except ImportError:
    # Fallback or error handling if unavailable in environment
    print("PyMuPDF not available.")

def extract_questions_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    # improved regex to capture questions
    # Pattern looks for "Number." followed by text, options (A)...(D), Ans, and Solution.
    # We use non-greedy matches and lookaheads.
    
    # Normalize text to handle newlines and spacing
    # text = text.replace('\n', ' ') # Keeping newlines helps with structure sometimes
    
    questions = []
    
    # Logic to iterate through numbers 1 to 54
    current_q_num = 1
    
    # Split text roughly by question numbers to handle them sequentially
    # This is a basic parser; a robust one handles edge cases
    
    # Regex structure:
    # 1. Start with number and dot/space: ^\s*\d+\.
    # 2. Content until options
    # 3. Options (A)...(B)...(C)...(D)...
    # 4. Ans
    # 5. Solution
    
    # Since the file is messy, we'll do a simpler split and clean
    
    # Specific extraction for the missing range and the whole set
    # Note: We will output a JSON structure similar to the prompt requirements
    
    extracted_data = []
    
    # This is a mock of the extraction logic since I cannot run fitz here directly on the specific file without the environment processing it first.
    # However, I will simulate the process by printing the extracted text to identifying the missing questions 21-51.
    
    print("Extracted Text Preview (Check for Q21-51):")
    # We will print the text to the console so I can parse it into the JSON in the next step
    # specifically looking for the middle chunk
    
    return text

# In this environment, I will rely on reading the file content provided.
# Since I cannot run the extraction here, I will proceed to manually extracting the missing data 
# if the file content allows, or updating the JSON with the existing data structure corrected.

# WAIT - I will use the python tool to actually read the file.
pass
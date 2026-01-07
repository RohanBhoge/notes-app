import pypdf

reader = pypdf.PdfReader("chapter_1.pdf")
full_text = ""
for page in reader.pages:
    full_text += page.extract_text() + "\n"

# Print specific range to find the missing questions
start_marker = "20."
end_marker = "52."

start_index = full_text.find(start_marker)
end_index = full_text.find(end_marker)

if start_index != -1 and end_index != -1:
    print(f"Found content between Q20 and Q52 ({len(full_text[start_index:end_index])} chars)")
    print(full_text[start_index:end_index + 500]) # Print overlap
else:
    print("Could not isolate range. Printing full text dump for parsing.")
    print(full_text)
import os
import pypdf
from docx import Document

def convert_pdf_to_md(pdf_path, output_path):
    print(f"Converting {pdf_path} to {output_path}...")
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n\n"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print("Done.")
    except Exception as e:
        print(f"Error converting PDF: {e}")

def convert_docx_to_md(docx_path, output_path):
    print(f"Converting {docx_path} to {output_path}...")
    try:
        doc = Document(docx_path)
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n\n"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print("Done.")
    except Exception as e:
        print(f"Error converting DOCX: {e}")

if __name__ == "__main__":
    # Example usage
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Convert PDF
    pdf_file = os.path.join(base_dir, "FYP Structure Guidelines.pdf")
    if os.path.exists(pdf_file):
        convert_pdf_to_md(pdf_file, os.path.join(base_dir, "FYP_Structure_Guidelines_Converted.md"))
        
    # Convert DOCX
    docx_file = os.path.join(base_dir, "FYP-IR2.docx")
    if os.path.exists(docx_file):
        convert_docx_to_md(docx_file, os.path.join(base_dir, "FYP-IR2_Converted.md"))

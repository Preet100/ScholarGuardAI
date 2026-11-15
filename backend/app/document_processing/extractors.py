import os
import re
import hashlib
from typing import Dict, Any, List, Tuple
import pymupdf  # PyMuPDF 2.0
import docx

class DocumentExtractionError(Exception):
    pass

class UnsupportedFormatError(DocumentExtractionError):
    pass

class ScannedDocumentWarning(DocumentExtractionError):
    pass

class BaseExtractor:
    def extract(self, file_path: str) -> Dict[str, Any]:
        raise NotImplementedError

class PDFExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        doc = pymupdf.open(file_path)
        pages_content = []
        raw_text_parts = []
        total_pages = len(doc)
        
        for page_num in range(total_pages):
            page = doc[page_num]
            text = page.get_text("text")
            cleaned_page_text = text.strip()
            pages_content.append({
                "page_number": page_num + 1,
                "text": cleaned_page_text
            })
            if cleaned_page_text:
                raw_text_parts.append(cleaned_page_text)
                
        doc.close()
        
        full_text = "\n\n".join(raw_text_parts)
        is_scanned = False
        warnings = []
        
        # Scanned document detection heuristic:
        # If document has multiple pages but virtually no extractable text, or average text per page < 40 chars
        if total_pages > 0 and len(full_text) / total_pages < 40:
            is_scanned = True
            warnings.append(
                "Document appears to be a scanned image or contains non-extractable rasterized text. "
                "Text extraction was minimal. An OCR processing step is recommended."
            )
            
        return {
            "format": "PDF",
            "total_pages": total_pages,
            "pages": pages_content,
            "raw_text": full_text,
            "is_scanned": is_scanned,
            "warnings": warnings
        }

class DOCXExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        doc = docx.Document(file_path)
        paragraphs_data = []
        raw_text_parts = []
        
        for idx, p in enumerate(doc.paragraphs):
            text = p.text.strip()
            if text:
                style_name = p.style.name if p.style else "Normal"
                is_heading = "Heading" in style_name or p.style.name.startswith("Title")
                paragraphs_data.append({
                    "paragraph_index": idx,
                    "text": text,
                    "style": style_name,
                    "is_heading": is_heading
                })
                raw_text_parts.append(text)
                
        full_text = "\n\n".join(raw_text_parts)
        warnings = []
        if not full_text:
            warnings.append("DOCX document contained no extractable textual paragraphs.")
            
        return {
            "format": "DOCX",
            "total_pages": None,
            "paragraphs": paragraphs_data,
            "raw_text": full_text,
            "is_scanned": False,
            "warnings": warnings
        }

class TXTExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        # Support utf-8 with fallback to latin-1
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                full_text = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                full_text = f.read()
                
        paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
        paragraphs_data = [
            {"paragraph_index": i, "text": p, "is_heading": False}
            for i, p in enumerate(paragraphs)
        ]
        
        warnings = []
        if not full_text.strip():
            warnings.append("Text file is empty.")
            
        return {
            "format": "TXT",
            "total_pages": 1,
            "paragraphs": paragraphs_data,
            "raw_text": full_text,
            "is_scanned": False,
            "warnings": warnings
        }

class DocumentParser:
    """
    High-level document parser orchestrator that segments sections,
    extracts bibliography candidates, and produces the structured extraction shape.
    """
    
    # Common academic section header patterns
    SECTION_HEADER_REGEX = re.compile(
        r"^(?:(?:[0-9IVXLCDM]+\.?\s+)?(?:Abstract|Introduction|Related\s+Work|Background|"
        r"Methodology|Methods|System\s+Architecture|Proposed\s+Method|Implementation|"
        r"Experiments|Experimental\s+Results|Results\s+and\s+Discussion|Discussion|"
        r"Conclusion|Conclusions|Future\s+Work|Acknowledgements|References|Bibliography))",
        re.IGNORECASE | re.MULTILINE
    )

    BIBLIOGRAPHY_HEADER_REGEX = re.compile(
        r"^(?:[0-9IVXLCDM]+\.?\s+)?(?:References|Bibliography|Works\s+Cited|Literature\s+Cited)\b",
        re.IGNORECASE | re.MULTILINE
    )

    def __init__(self):
        self.extractors = {
            ".pdf": PDFExtractor(),
            ".docx": DOCXExtractor(),
            ".txt": TXTExtractor()
        }

    def compute_file_hash(self, file_path: str) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()

    def parse_document(self, file_path: str, document_id: str = None) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in self.extractors:
            raise UnsupportedFormatError(f"Unsupported file format: '{ext}'. Allowed: .pdf, .docx, .txt")

        extractor = self.extractors[ext]
        extraction = extractor.extract(file_path)
        raw_text = extraction["raw_text"]
        warnings = list(extraction.get("warnings", []))
        
        file_hash = self.compute_file_hash(file_path)
        file_size = os.path.getsize(file_path)

        # Split into main body vs bibliography if a reference header exists
        body_text, reference_text, bib_detected = self._split_body_and_references(raw_text)
        if not bib_detected:
            warnings.append(
                "Could not find an explicit 'References' or 'Bibliography' section header. "
                "The entire text was analyzed as document body."
            )

        # Segment body text into structured paragraphs
        paragraphs = self._segment_paragraphs(body_text)
        sections = self._identify_sections(paragraphs)

        return {
            "document_id": document_id,
            "filename": os.path.basename(file_path),
            "file_hash": file_hash,
            "file_size_bytes": file_size,
            "format": extraction["format"],
            "total_pages": extraction.get("total_pages"),
            "raw_text": raw_text,
            "body_text": body_text,
            "reference_text": reference_text,
            "has_references_section": bib_detected,
            "sections": sections,
            "paragraphs": paragraphs,
            "is_scanned": extraction.get("is_scanned", False),
            "warnings": warnings
        }

    def _split_body_and_references(self, text: str) -> Tuple[str, str, bool]:
        """
        Splits raw text into body text and bibliography section based on header heuristics.
        """
        matches = list(self.BIBLIOGRAPHY_HEADER_REGEX.finditer(text))
        if not matches:
            return text, "", False

        # Pick the last occurrence of References/Bibliography (usually at the end of paper)
        last_match = matches[-1]
        split_pos = last_match.start()
        
        body = text[:split_pos].strip()
        ref_section = text[split_pos:].strip()
        return body, ref_section, True

    def _segment_paragraphs(self, text: str) -> List[Dict[str, Any]]:
        raw_paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        result = []
        for idx, p in enumerate(raw_paras):
            # Clean excessive intra-line whitespace from PDF column wraps
            cleaned = re.sub(r"[ \t]+", " ", p)
            cleaned = re.sub(r"\n(?=[a-z0-9])", " ", cleaned) # merge wrapped lines
            result.append({
                "paragraph_index": idx,
                "text": cleaned,
                "char_length": len(cleaned)
            })
        return result

    def _identify_sections(self, paragraphs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        sections = []
        current_section = {"title": "Preamble / Header", "paragraphs": []}

        for p in paragraphs:
            text = p["text"]
            lines = text.split("\n")
            first_line = lines[0].strip() if lines else text

            if len(first_line) < 80 and self.SECTION_HEADER_REGEX.match(first_line):
                if current_section["paragraphs"]:
                    sections.append(current_section)
                current_section = {"title": first_line, "paragraphs": [p["text"]]}
            else:
                current_section["paragraphs"].append(p["text"])

        if current_section["paragraphs"]:
            sections.append(current_section)

        return sections

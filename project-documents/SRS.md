# Software Requirements Specification (SRS)
## ScholarGuard AI: Research Paper Plagiarism and Citation Verification Tool

**Project ID:** CSEAI ML2026-P41  
**Version:** 1.0.0  
**Status:** Approved Specification  

---

### 1. Introduction
#### 1.1 Purpose
This document specifies the software requirements for **ScholarGuard AI**, an evidence-driven NLP application designed to assist researchers, faculty guides, and university research publication cells in reviewing research manuscripts before submission.

#### 1.2 Product Principle
The system provides **evidence and explanation**, not merely a black-box percentage. Every flagged item enables the user to inspect the submitted passage, the matched source passage, the detection method, the similarity score, and the reason for the flag.

---

### 2. Functional Requirements

#### 2.1 Module 1: Document Upload and Extraction
- **FR-1.1:** Accept manuscript files in PDF, DOCX, and TXT formats up to 25MB.
- **FR-1.2:** Validate file extension and MIME type prior to processing.
- **FR-1.3:** Extract body text, paragraphs, headings, and identify the bibliography boundary.
- **FR-1.4:** Detect scanned or rasterized documents where text extraction is minimal (<40 chars/page) and issue clear user-facing warnings.

#### 2.2 Module 2: NLP Preprocessing
- **FR-2.1:** Maintain both original text (for evidence presentation and transformers) and normalized text (for lexical matching).
- **FR-2.2:** Protect academic abbreviations (`et al.`, `i.e.`, `e.g.`, `vol.`, `no.`) from triggering false sentence breaks.
- **FR-2.3:** Tokenize words, handle stopwords, and compute word n-grams.

#### 2.3 Module 3: Similarity Detection
- **FR-3.1:** Implement Exact Text Matching using 5-gram sliding window comparisons and normalized substring searches.
- **FR-3.2:** Implement Lexical Similarity using TF-IDF term weighting and Cosine Similarity.
- **FR-3.3:** Implement Semantic Textual Similarity using Sentence Transformers (`all-MiniLM-L6-v2`) and Cosine Distance.
- **FR-3.4:** Aggregate similarity using the documented hybrid formulation:  
  $$S = 0.30E + 0.25L + 0.45M$$
- **FR-3.5:** Accompany all similarity results with an explicit human-review disclaimer.

#### 2.4 Module 4: Citation Verification
- **FR-4.1:** Extract in-text citations in both author-year format `(Smith, 2022)` and bracketed numeric format `[1]`.
- **FR-4.2:** Parse bibliography entries into authors, year, title, and DOI.
- **FR-4.3:** Detect missing bibliography entries (in-text citation with no reference entry).
- **FR-4.4:** Detect unused bibliography entries (reference entry never cited in body).
- **FR-4.5:** Query Crossref and OpenAlex APIs to verify publication metadata and categorize outcomes: `VERIFIED`, `METADATA_MISMATCH`, `NOT_FOUND`, `NO_DOI_SUPPLIED`, or `SERVICE_UNAVAILABLE`.

#### 2.5 Module 5: Missing Attribution Detection
- **FR-5.1:** Flag passages exhibiting high semantic similarity ($\ge 0.70$) to a reference work that lack an in-text citation within the immediate surrounding sentences.

#### 2.6 Module 6: Citation Formatting Checker
- **FR-6.1:** Rule-based validation against APA 7th Edition (author inverted order, parenthetical year notation, active DOI hyperlinks).
- **FR-6.2:** Rule-based validation against IEEE (bracketed numeric index, article title in quotation marks, initial before surname).
- **FR-6.3:** Rule-based validation against MLA 9th Edition.

#### 2.7 Module 7: Master Report Generation
- **FR-7.1:** Synthesize a master report covering all 11 required sections.
- **FR-7.2:** Export structured JSON and printable reports.

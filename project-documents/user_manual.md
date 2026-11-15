# ScholarGuard AI: User Manual & Viva Demonstration Guide

**Project ID:** CSEAI ML2026-P41  
**Target Audience:** Research Scholars, Faculty Guides, University Research Cells, Viva Examiners  

---

## 1. Quickstart: Launching the Application

### 1.1 Start the FastAPI Backend
```bash
# From workspace root:
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- API Health Status: [http://127.0.0.1:8000/api/status](http://127.0.0.1:8000/api/status)
- Interactive Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 1.2 Start the React Frontend
```bash
# In a separate terminal:
cd frontend
npm run dev
```
- Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 2. Walkthrough: The 5 Core Pages

### Page 1: Dashboard
- **Overview:** Displays metrics backed by the database: total manuscripts uploaded, completed pre-audits, indexed reference papers, and active registry connections.
- **Recent Activity:** Click on any previously completed manuscript to immediately inspect its similarity and citation reports.

### Page 2: Upload Manuscript
1. Click **Upload New Manuscript** or drag and drop a file (`.pdf`, `.docx`, or `.txt`).
2. Select your target citation style (`APA 7th Edition`, `IEEE`, or `MLA`).
3. Toggle live Crossref/OpenAlex verification.
4. Click **Extract Text & Sections**, then click **Execute Multi-Tier Integrity Audit**.
5. *Tip for Demonstration:* Use the provided test manuscript located at `datasets/test_documents/sample_manuscript.pdf`.

### Page 3: Similarity Evidence Review
- **Split Workspace:**
  - **Left Pane:** Click any flagged submitted sentence.
  - **Right Pane:** Immediately inspect the matched source passage, source paper title, authors, year, and active DOI link.
- **Filter Tabs:** Toggle between *Exact Matches*, *Semantic Paraphrases*, and *Lexical TF-IDF*.
- **Disclaimer:** Prominent warning reminding examiners and scholars that similarity scores are indicators for human review, not verdicts.

### Page 4: Citation & Reference Verification
- **Cross-Verification:** Instantly see if in-text citations are missing from the bibliography (e.g. `[3]` cited in body but omitted in references).
- **Unused References:** Flags references listed in the bibliography that were never cited.
- **Live Metadata Status:**
  - `VERIFIED`: Crossref/OpenAlex confirmed publication exists and metadata aligns.
  - `METADATA_MISMATCH`: Flagged when author or year in citation differs from official registry.
  - `NOT_FOUND`: Highlighted for review without falsely claiming the paper is fraudulent.

### Page 5: Final Report
- **11 Structured Sections:** Reviews document metadata, overall similarity, exact matches, lexical overlap, semantic matches, matched source details, citation verification, missing attributions, formatting issues, recommended corrections, and methodology & limitations.
- **Exporting:** Click **Export JSON Report** or **Print Report** for formal institutional record-keeping.

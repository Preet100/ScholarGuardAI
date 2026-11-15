# System Architecture and Technical Design
## ScholarGuard AI

```
                                SYSTEM ARCHITECTURE OVERVIEW

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              REACT FRONTEND (Vite / React 19)                           │
│  • Dashboard  • Manuscript Upload  • Similarity Evidence Split  • Citation Audit  • Report│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / JSON REST APIs
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FASTAPI BACKEND APPLICATION                              │
│                                                                                        │
│  [API Endpoints]                                                                       │
│  • /api/upload       • /api/analyze/{id}     • /api/status       • /api/dashboard      │
│  • /api/documents    • /api/analysis/{id}    • /api/reports      • /api/corpus         │
│                                                                                        │
│  [Document Processing]                 [NLP & Similarity Core]                         │
│  • PyMuPDF (PDF Parser)                • NLTK Abbreviation-Aware Segmentation          │
│  • python-docx (Word Parser)           • Dual Representation (Original & Normalized)   │
│  • Section & Bibliography Splitter     • Exact Match N-Gram Engine                     │
│                                        • Scikit-learn TF-IDF Cosine Similarity         │
│                                        • Sentence-Transformers (all-MiniLM-L6-v2)      │
│                                        • Hybrid Scorer (S = 0.30E + 0.25L + 0.45M)     │
│                                                                                        │
│  [Citation & Attribution Engine]       [Formatting & Reporting]                        │
│  • In-Text Citation Regex Parser       • APA 7th & IEEE Deterministic Rule Checkers    │
│  • Bibliography Entry Parser           • Consolidated 11-Section Master Report Builder │
│  • Cross-Verification Matrix           • JSON & Print Document Exporters               │
│  • Live Crossref & OpenAlex Clients                                                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        ┌─────────────────────────┐                   ┌─────────────────────────┐
        │   SQLite / PostgreSQL   │                   │ External Scholarly APIs │
        │  • Documents            │                   │ • Crossref REST API     │
        │  • Research Papers      │                   │ • OpenAlex Works API    │
        │  • Similarity Matches   │                   └─────────────────────────┘
        │  • Analyses & Reports   │
        └─────────────────────────┘
```

### Architectural Pipeline Flow
1. **Document Ingestion:** File upload is validated for type (`.pdf`, `.docx`, `.txt`) and size ($\le 25\text{ MB}$). Extracted text is segmented into paragraphs, sections, and the bibliography boundary is isolated.
2. **Text Preprocessing:** Sentences are tokenized while shielding academic abbreviations (`et al.`, `i.e.`, `e.g.`). Both original and normalized forms are retained.
3. **Similarity Scanning:** Sentences are checked against indexed reference papers using Exact N-grams, TF-IDF lexical cosine similarity, and Sentence Transformer semantic vectors.
4. **Citation Auditing:** In-text citations and reference list items are cross-referenced to find missing or unused references. DOIs are resolved against Crossref and OpenAlex.
5. **Attribution Analysis:** Unattributed passages with high semantic similarity ($\ge 0.70$) without nearby citations are flagged.
6. **Formatting Audit:** Rule-based evaluation against APA 7th Edition and IEEE.
7. **Master Report:** Consolidated output synthesizes all 11 required sections.

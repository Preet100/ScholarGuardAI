# Research Methodology & Algorithmic Formulation
## ScholarGuard AI

### 1. Hybrid Similarity Formulation
To balance verbatim string capture, specialized terminology preservation, and conceptual paraphrase sensitivity, ScholarGuard AI deploys a hybrid multi-layer scoring model:

$$S_{\text{hybrid}} = w_e \cdot E + w_l \cdot L + w_m \cdot M$$

Where:
- $E \in [0, 1]$ represents the fraction of submitted sentences flagged by **Exact 5-Gram Matching** ($\text{threshold} \ge 0.85$).
- $L \in [0, 1]$ represents the fraction of submitted sentences flagged by **TF-IDF Lexical Similarity** ($\text{threshold} \ge 0.40$).
- $M \in [0, 1]$ represents the fraction of submitted sentences flagged by **Sentence Transformer Embeddings** ($\text{threshold} \ge 0.65$).
- Current initial calibrated weights per Master Blueprint Section 6.3:
  $$w_e = 0.30, \quad w_l = 0.25, \quad w_m = 0.45$$

### 2. Dual Text Representation Architecture
```
                                 RAW EXTRACTED TEXT
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         [ORIGINAL REPRESENTATION]                [NORMALIZED REPRESENTATION]
         • Preserves capitalization               • Lowercased text
         • Preserves punctuation & brackets       • Punctuation stripped
         • Used for:                              • Whitespace collapsed
           - Sentence Transformers embeddings     • Used for:
           - In-text citation regex extraction      - 5-gram exact matching
           - Evidence highlighting & display        - TF-IDF vocabulary matrix
```

### 3. Missing Attribution Detection Heuristic
An algorithm flags a passage as potentially missing attribution when:
1. Sentence exhibits high semantic similarity to a reference work:
   $$\text{Sim}_{\text{SBERT}}(\text{Sentence}_i, \text{Corpus}_j) \ge 0.70$$
2. Contextual Citation Check:
   No in-text citation pattern (`AUTHOR_YEAR` or `NUMERIC`) is present in the 3-sentence sliding window:
   $$W_i = \{\text{Sentence}_{i-1}, \text{Sentence}_i, \text{Sentence}_{i+1}\}$$
If both conditions are met, the passage is queued for human review with an explanation and suggested action.

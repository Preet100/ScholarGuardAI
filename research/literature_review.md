# Literature Review: Textual Plagiarism Detection and Citation Verification
## ScholarGuard AI Research Documentation

### 1. Evolution of Plagiarism Detection Techniques
Traditional academic plagiarism detection systems (e.g. Turnitin, CopyLeaks, WCopyFind) have historically depended on string-matching heuristics:
- **Fingerprinting & Rabin-Karp Hashing:** Fast rolling hashes over character substrings.
- **N-gram Shingling:** Jaccard similarity over word k-shingles.

While highly effective at detecting verbatim copy-pasting, these surface-level lexical techniques fail when authors employ synonym substitution, sentence restructuring, or automated paraphrasing (e.g., QuillBot or LLM regeneration).

### 2. Lexical Vector Space Models (TF-IDF)
Salton and Buckley's Term Frequency-Inverse Document Frequency (TF-IDF) models document terms based on specificity:
$$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \log\left(\frac{|D|}{|\{d \in D : t \in d\}|}\right)$$
Cosine similarity over TF-IDF vectors reliably detects shared distinctive terminology, specialized nomenclature, and topic-specific vocabulary without being deceived by minor stopword substitutions. However, it cannot comprehend synonymy or semantic parity when different vocabularies describe identical concepts.

### 3. Dense Semantic Embeddings (Sentence-BERT)
Reimers and Gurevych (2019) introduced Sentence-BERT (SBERT), fine-tuning Siamese and Triplet Transformer networks on Semantic Textual Similarity (STS) benchmarks. By mapping sentences into 384-dimensional dense vector spaces where cosine distance correlates with conceptual similarity, SBERT detects conceptual appropriation even when zero exact words overlap:
$$\text{Sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$
In ScholarGuard AI, `all-MiniLM-L6-v2` provides real-time semantic retrieval with sub-50ms inference per passage.

### 4. Bibliometric Graph Resolution (Crossref & OpenAlex)
With the proliferation of generative large language models, citation hallucination has emerged as a distinct threat to academic integrity. LLMs routinely generate plausible-looking but non-existent citations ("ghost references"). ScholarGuard AI addresses this by interfacing with Crossref and OpenAlex REST APIs to confirm the real-world existence and metadata fidelity of cited works.

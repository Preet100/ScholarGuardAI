import re
import hashlib
from typing import List, Dict, Any, Tuple
from app.nlp.preprocessing import TextPreprocessor

class ExactMatchDetector:
    """
    Identifies identical or near-identical text segments between submitted text
    and reference corpus using N-gram hashing and normalized string matching.
    """

    def __init__(self, n_gram_size: int = 5, min_char_length: int = 25):
        self.n_gram_size = n_gram_size
        self.min_char_length = min_char_length
        self.preprocessor = TextPreprocessor()

    def detect_exact_matches(
        self,
        submitted_sentences: List[Dict[str, Any]],
        corpus_passages: List[Dict[str, Any]],
        threshold: float = 0.85
    ) -> List[Dict[str, Any]]:
        """
        Scans submitted sentences against corpus passages for exact or near-verbatim overlaps.
        Returns a list of match evidence records.
        """
        matches = []
        
        # Pre-build normalized lookup table for corpus passages
        processed_corpus = []
        for cp in corpus_passages:
            norm_content = self.preprocessor.normalize_text(cp["content"])
            tokens = self.preprocessor.tokenize_words(norm_content)
            ngrams = set(self.preprocessor.generate_ngrams(tokens, self.n_gram_size))
            processed_corpus.append({
                "source": cp,
                "normalized": norm_content,
                "tokens": tokens,
                "ngrams": ngrams
            })

        for sent in submitted_sentences:
            s_orig = sent["original_text"]
            s_norm = sent["normalized_text"]
            s_tokens = sent["tokens"]

            if len(s_orig) < self.min_char_length or not s_tokens:
                continue

            s_ngrams = set(self.preprocessor.generate_ngrams(s_tokens, self.n_gram_size))
            
            best_match = None
            highest_score = 0.0

            for cp in processed_corpus:
                c_norm = cp["normalized"]
                c_tokens = cp["tokens"]
                c_ngrams = cp["ngrams"]

                # 1. Direct identical substring check
                if s_norm in c_norm or c_norm in s_norm:
                    score = 1.0
                # 2. Jaccard N-gram overlap for near-identical matches
                elif s_ngrams and c_ngrams:
                    intersection = len(s_ngrams & c_ngrams)
                    union = len(s_ngrams | c_ngrams)
                    score = intersection / union if union > 0 else 0.0
                else:
                    score = 0.0

                if score > highest_score and score >= threshold:
                    highest_score = score
                    best_match = cp["source"]

            if best_match and highest_score >= threshold:
                matches.append({
                    "method": "EXACT",
                    "submitted_sentence_index": sent["sentence_index"],
                    "submitted_passage": s_orig,
                    "matched_source_passage": best_match["content"],
                    "similarity_score": round(highest_score, 4),
                    "source_paper_id": best_match.get("paper_id"),
                    "source_title": best_match.get("title"),
                    "source_authors": best_match.get("authors"),
                    "source_year": best_match.get("year"),
                    "source_doi": best_match.get("doi"),
                    "char_start": sent["char_start"],
                    "char_end": sent["char_end"]
                })

        return matches

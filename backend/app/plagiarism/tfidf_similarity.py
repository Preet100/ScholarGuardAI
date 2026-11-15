import numpy as np
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.nlp.preprocessing import TextPreprocessor

class TFIDFSimilarityDetector:
    """
    Computes lexical similarity using TF-IDF term weighting and cosine similarity.
    Captures shared vocabulary and distinctive technical terminology.
    """

    def __init__(self, min_df: int = 1, ngram_range: tuple = (1, 2)):
        self.preprocessor = TextPreprocessor()
        self.ngram_range = ngram_range
        self.min_df = min_df

    def detect_lexical_matches(
        self,
        submitted_sentences: List[Dict[str, Any]],
        corpus_passages: List[Dict[str, Any]],
        threshold: float = 0.40
    ) -> List[Dict[str, Any]]:
        """
        Computes cosine similarity between submitted sentences and reference passages using TF-IDF.
        """
        if not submitted_sentences or not corpus_passages:
            return []

        # Build corpus texts (using normalized text with stopwords handled)
        corpus_texts = []
        for cp in corpus_passages:
            norm = self.preprocessor.normalize_text(cp["content"])
            corpus_texts.append(norm)

        sub_texts = []
        valid_indices = []
        for idx, s in enumerate(submitted_sentences):
            norm = s["normalized_text"]
            if len(norm.split()) >= 4:  # require at least 4 words
                sub_texts.append(norm)
                valid_indices.append(idx)

        if not sub_texts:
            return []

        all_documents = corpus_texts + sub_texts
        vectorizer = TfidfVectorizer(
            ngram_range=self.ngram_range,
            min_df=self.min_df,
            stop_words="english"
        )
        
        try:
            tfidf_matrix = vectorizer.fit_transform(all_documents)
        except ValueError:
            # Vocabulary empty (all stopwords or empty)
            return []

        num_corpus = len(corpus_texts)
        corpus_vectors = tfidf_matrix[:num_corpus]
        sub_vectors = tfidf_matrix[num_corpus:]

        sim_matrix = cosine_similarity(sub_vectors, corpus_vectors)

        matches = []
        for i, sub_idx in enumerate(valid_indices):
            scores_row = sim_matrix[i]
            best_corpus_idx = int(np.argmax(scores_row))
            best_score = float(scores_row[best_corpus_idx])

            if best_score >= threshold:
                matched_source = corpus_passages[best_corpus_idx]
                sent = submitted_sentences[sub_idx]
                matches.append({
                    "method": "LEXICAL_TFIDF",
                    "submitted_sentence_index": sent["sentence_index"],
                    "submitted_passage": sent["original_text"],
                    "matched_source_passage": matched_source["content"],
                    "similarity_score": round(best_score, 4),
                    "source_paper_id": matched_source.get("paper_id"),
                    "source_title": matched_source.get("title"),
                    "source_authors": matched_source.get("authors"),
                    "source_year": matched_source.get("year"),
                    "source_doi": matched_source.get("doi"),
                    "char_start": sent["char_start"],
                    "char_end": sent["char_end"]
                })

        return matches

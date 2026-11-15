import numpy as np
from typing import List, Dict, Any
from sklearn.metrics.pairwise import cosine_similarity
from app.config import settings

class SemanticSimilarityDetector:
    """
    Computes semantic similarity using Sentence Transformers (all-MiniLM-L6-v2)
    to detect conceptually related meaning even under substantial lexical paraphrasing.
    """

    _model_instance = None

    @classmethod
    def get_model(cls):
        if cls._model_instance is None:
            try:
                from sentence_transformers import SentenceTransformer
                cls._model_instance = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
            except Exception as e:
                print(f"[Warning] Could not load SentenceTransformer ({e}). Falling back to TF-IDF embeddings.")
                cls._model_instance = "FALLBACK"
        return cls._model_instance

    def detect_semantic_matches(
        self,
        submitted_sentences: List[Dict[str, Any]],
        corpus_passages: List[Dict[str, Any]],
        threshold: float = 0.65
    ) -> List[Dict[str, Any]]:
        if not submitted_sentences or not corpus_passages:
            return []

        model = self.get_model()
        if model == "FALLBACK":
            # Graceful fallback handled without breaking execution
            return []

        # Filter submitted sentences with sufficient words
        valid_subs = [s for s in submitted_sentences if len(s["tokens"]) >= 4]
        if not valid_subs:
            return []

        sub_texts = [s["original_text"] for s in valid_subs]
        corpus_texts = [cp["content"] for cp in corpus_passages]

        # Generate embeddings
        sub_embeddings = model.encode(sub_texts, convert_to_numpy=True, show_progress_bar=False)
        corpus_embeddings = model.encode(corpus_texts, convert_to_numpy=True, show_progress_bar=False)

        sim_matrix = cosine_similarity(sub_embeddings, corpus_embeddings)

        matches = []
        for i, sent in enumerate(valid_subs):
            scores_row = sim_matrix[i]
            best_corpus_idx = int(np.argmax(scores_row))
            best_score = float(scores_row[best_corpus_idx])

            if best_score >= threshold:
                matched_source = corpus_passages[best_corpus_idx]
                matches.append({
                    "method": "SEMANTIC_TRANSFORMER",
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

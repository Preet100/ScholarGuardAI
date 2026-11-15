from typing import List, Dict, Any
from app.config import settings
from app.plagiarism.exact_match import ExactMatchDetector
from app.plagiarism.tfidf_similarity import TFIDFSimilarityDetector
from app.plagiarism.semantic_similarity import SemanticSimilarityDetector

class SimilarityEngine:
    """
    Orchestrates exact, lexical, and semantic similarity detection modules.
    Computes documented hybrid score and produces traceable evidence records.
    """

    def __init__(self):
        self.exact_detector = ExactMatchDetector(n_gram_size=5)
        self.tfidf_detector = TFIDFSimilarityDetector()
        self.semantic_detector = SemanticSimilarityDetector()

    def run_full_similarity_scan(
        self,
        submitted_sentences: List[Dict[str, Any]],
        corpus_passages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes the three similarity methods against the reference corpus.
        Returns aggregated indicators and structured match evidence.
        """
        if not submitted_sentences or not corpus_passages:
            return {
                "overall_similarity_score": 0.0,
                "exact_similarity_score": 0.0,
                "lexical_similarity_score": 0.0,
                "semantic_similarity_score": 0.0,
                "exact_matches": [],
                "lexical_matches": [],
                "semantic_matches": [],
                "all_matches": [],
                "total_submitted_sentences": len(submitted_sentences),
                "review_disclaimer": (
                    "A similarity score is an indicator for human review, not a plagiarism verdict. "
                    "Correctly cited quotes, common technical expressions, and independently derived phrasing "
                    "can also produce similarity matches."
                )
            }

        total_sentences = len(submitted_sentences)

        # 1. Exact Match Detection
        exact_matches = self.exact_detector.detect_exact_matches(
            submitted_sentences=submitted_sentences,
            corpus_passages=corpus_passages,
            threshold=settings.EXACT_MATCH_THRESHOLD
        )

        # 2. Lexical TF-IDF Detection
        lexical_matches = self.tfidf_detector.detect_lexical_matches(
            submitted_sentences=submitted_sentences,
            corpus_passages=corpus_passages,
            threshold=settings.LEXICAL_SIMILARITY_THRESHOLD
        )

        # 3. Semantic Embedding Detection
        semantic_matches = self.semantic_detector.detect_semantic_matches(
            submitted_sentences=submitted_sentences,
            corpus_passages=corpus_passages,
            threshold=settings.SEMANTIC_SIMILARITY_THRESHOLD
        )

        # Compute component coverage indicators:
        # Number of unique submitted sentences flagged by each method divided by total sentences
        exact_sent_indices = set(m["submitted_sentence_index"] for m in exact_matches)
        lexical_sent_indices = set(m["submitted_sentence_index"] for m in lexical_matches)
        semantic_sent_indices = set(m["submitted_sentence_index"] for m in semantic_matches)

        exact_score = len(exact_sent_indices) / total_sentences if total_sentences else 0.0
        lexical_score = len(lexical_sent_indices) / total_sentences if total_sentences else 0.0
        semantic_score = len(semantic_sent_indices) / total_sentences if total_sentences else 0.0

        # Hybrid formula per Blueprint Section 6.3: S = 0.30E + 0.25L + 0.45M
        w_e = settings.WEIGHT_EXACT
        w_l = settings.WEIGHT_LEXICAL
        w_m = settings.WEIGHT_SEMANTIC
        
        hybrid_score = (w_e * exact_score) + (w_l * lexical_score) + (w_m * semantic_score)
        hybrid_score = min(round(hybrid_score, 4), 1.0)

        # Union of all unique matches for the consolidated review panel
        all_matches = []
        seen_pairs = set()

        # Prioritize Exact > Semantic > Lexical when the same sentence is flagged
        for m in exact_matches + semantic_matches + lexical_matches:
            pair_key = (m["submitted_sentence_index"], m.get("source_paper_id"))
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                all_matches.append(m)

        return {
            "overall_similarity_score": hybrid_score,
            "exact_similarity_score": round(exact_score, 4),
            "lexical_similarity_score": round(lexical_score, 4),
            "semantic_similarity_score": round(semantic_score, 4),
            "exact_matches": exact_matches,
            "lexical_matches": lexical_matches,
            "semantic_matches": semantic_matches,
            "all_matches": all_matches,
            "total_submitted_sentences": total_sentences,
            "flagged_sentences_count": len(exact_sent_indices | lexical_sent_indices | semantic_sent_indices),
            "review_disclaimer": (
                "A similarity score is an indicator for human review, not a plagiarism verdict. "
                "Categories can overlap; exact, lexical, and semantic measurements represent complementary perspectives. "
                "Correctly quoted material and standard academic idioms may be flagged for review."
            )
        }

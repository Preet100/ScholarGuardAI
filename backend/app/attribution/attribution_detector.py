import re
from typing import List, Dict, Any
from app.config import settings

class AttributionDetector:
    """
    Identifies passages that share substantial semantic overlap with the reference corpus
    but lack an evident in-text citation within the immediate surrounding context.
    """

    CITATION_PATTERNS = [
        re.compile(r'\([A-Z][a-zA-Z\s\.\-]+,\s+(?:19|20)\d{2}\)'),
        re.compile(r'\b[A-Z][a-zA-Z\-]+\s+et\s+al\.\s*\((?:19|20)\d{2}\)'),
        re.compile(r'\[\d+(?:\s*[,-–—]\s*\d+)*\]')
    ]

    def __init__(self, suspicion_threshold: float = None):
        self.suspicion_threshold = suspicion_threshold or settings.ATTRIBUTION_SUSPICION_THRESHOLD

    def detect_missing_attributions(
        self,
        submitted_sentences: List[Dict[str, Any]],
        similarity_matches: List[Dict[str, Any]],
        body_text: str
    ) -> List[Dict[str, Any]]:
        """
        Flags passages that exhibit high similarity to a corpus source but have no citation in proximity.
        """
        flags = []
        
        # Build index of matches by submitted sentence index
        matches_by_sent = {}
        for m in similarity_matches:
            s_idx = m["submitted_sentence_index"]
            # Keep the highest scoring match for each sentence
            if s_idx not in matches_by_sent or m["similarity_score"] > matches_by_sent[s_idx]["similarity_score"]:
                matches_by_sent[s_idx] = m

        for sent in submitted_sentences:
            s_idx = sent["sentence_index"]
            match = matches_by_sent.get(s_idx)

            if not match:
                continue

            score = match["similarity_score"]
            # Only consider sentences with noticeable similarity
            if score < self.suspicion_threshold:
                continue

            # Check if this sentence or adjacent text (window of +/- 1 sentence) has an explicit citation
            has_citation = self._has_nearby_citation(
                submitted_sentences=submitted_sentences,
                current_idx=s_idx
            )

            if not has_citation:
                flags.append({
                    "status": "Potential attribution issue — needs review",
                    "sentence_index": s_idx,
                    "submitted_passage": sent["original_text"],
                    "matched_source_passage": match["matched_source_passage"],
                    "semantic_similarity_score": score,
                    "detection_method": match["method"],
                    "source_title": match.get("source_title"),
                    "source_authors": match.get("source_authors"),
                    "source_year": match.get("source_year"),
                    "source_doi": match.get("source_doi"),
                    "char_start": sent["char_start"],
                    "char_end": sent["char_end"],
                    "suggested_action": (
                        "Review this passage against the identified source work. "
                        "If the concept, empirical finding, or phrasing was drawn from this source, "
                        "add an explicit in-text attribution and corresponding bibliography entry."
                    ),
                    "caution": (
                        "Semantic similarity alone does not prove copying. Common scientific background "
                        "and independently composed text can produce elevated similarity. Human editorial judgment is required."
                    )
                })

        return flags

    def _has_nearby_citation(self, submitted_sentences: List[Dict[str, Any]], current_idx: int) -> bool:
        start_idx = max(0, current_idx - 1)
        end_idx = min(len(submitted_sentences), current_idx + 2)

        surrounding_text = " ".join(
            submitted_sentences[i]["original_text"] for i in range(start_idx, end_idx)
        )

        for pattern in self.CITATION_PATTERNS:
            if pattern.search(surrounding_text):
                return True
        return False

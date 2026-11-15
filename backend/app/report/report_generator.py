import os
import json
import datetime
from typing import Dict, Any
from app.config import settings

class ReportGenerator:
    """
    Consolidates analysis findings into a comprehensive, academic-standard report.
    Produces structured JSON and an exportable document with full methodology and limitations.
    """

    def generate_full_report(
        self,
        document_info: Dict[str, Any],
        similarity_data: Dict[str, Any],
        citation_data: Dict[str, Any],
        attribution_data: list,
        formatting_issues: list,
        citation_style: str = "APA"
    ) -> Dict[str, Any]:
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # Compile recommended corrections
        recommendations = self._synthesize_recommendations(
            similarity_data=similarity_data,
            citation_data=citation_data,
            attribution_data=attribution_data,
            formatting_issues=formatting_issues
        )

        report = {
            "report_metadata": {
                "generated_at": timestamp,
                "engine_version": settings.VERSION,
                "evaluated_citation_style": citation_style
            },
            "1_document_information": {
                "filename": document_info.get("filename"),
                "file_size_bytes": document_info.get("file_size_bytes"),
                "file_hash_sha256": document_info.get("file_hash"),
                "format": document_info.get("format"),
                "total_pages": document_info.get("total_pages"),
                "total_sentences_extracted": len(document_info.get("sentences", [])),
                "has_references_section": document_info.get("has_references_section", False),
                "extraction_warnings": document_info.get("warnings", [])
            },
            "2_overall_similarity_indicator": {
                "overall_hybrid_score": similarity_data.get("overall_similarity_score", 0.0),
                "exact_similarity_score": similarity_data.get("exact_similarity_score", 0.0),
                "lexical_similarity_score": similarity_data.get("lexical_similarity_score", 0.0),
                "semantic_similarity_score": similarity_data.get("semantic_similarity_score", 0.0),
                "flagged_sentences_count": similarity_data.get("flagged_sentences_count", 0),
                "total_sentences": similarity_data.get("total_submitted_sentences", 0),
                "review_warning": similarity_data.get("review_disclaimer")
            },
            "3_exact_matching_results": {
                "matches_count": len(similarity_data.get("exact_matches", [])),
                "matches": similarity_data.get("exact_matches", [])
            },
            "4_lexical_similarity_results": {
                "matches_count": len(similarity_data.get("lexical_matches", [])),
                "matches": similarity_data.get("lexical_matches", [])
            },
            "5_semantic_similarity_results": {
                "matches_count": len(similarity_data.get("semantic_matches", [])),
                "matches": similarity_data.get("semantic_matches", [])
            },
            "6_matched_source_details": self._aggregate_source_details(similarity_data.get("all_matches", [])),
            "7_citation_verification_results": {
                "total_in_text_citations": citation_data.get("total_in_text_citations", 0),
                "total_references_listed": citation_data.get("total_references", 0),
                "missing_references": citation_data.get("missing_references", []),
                "unused_references": citation_data.get("unused_references", []),
                "duplicate_references": citation_data.get("duplicate_references", []),
                "metadata_mismatches": citation_data.get("metadata_mismatches", []),
                "not_found_references": citation_data.get("not_found_references", []),
                "verified_references": [r for r in citation_data.get("references", []) if r.get("verification_status") == "VERIFIED"]
            },
            "8_missing_attribution_warnings": {
                "flags_count": len(attribution_data),
                "flags": attribution_data
            },
            "9_citation_formatting_issues": {
                "issues_count": len(formatting_issues),
                "issues": formatting_issues
            },
            "10_recommended_corrections": recommendations,
            "11_methodology_and_limitations": {
                "hybrid_weights": {
                    "exact_matching_weight": settings.WEIGHT_EXACT,
                    "lexical_tfidf_weight": settings.WEIGHT_LEXICAL,
                    "semantic_transformer_weight": settings.WEIGHT_SEMANTIC,
                    "formula": "S = 0.30E + 0.25L + 0.45M"
                },
                "models_employed": {
                    "semantic_transformer": settings.SENTENCE_TRANSFORMER_MODEL,
                    "lexical_vectorizer": "TF-IDF (1-2 ngrams, English stopword regularization)",
                    "exact_matcher": "5-gram sliding window & normalized hash comparison"
                },
                "limitations_statement": (
                    "ScholarGuard AI is designed as an evidence-based academic research tool. "
                    "1. Similarity scores are indicators for human review, not proof of plagiarism. "
                    "2. A missing DOI result does not prove that a publication is fake; legitimate publications can lack DOIs. "
                    "3. Semantic similarity does not prove copying; shared scientific ideas and standard definitions can share meaning. "
                    "4. The system operates against an indexed corpus and public registries (Crossref, OpenAlex); "
                    "unindexed works may not be retrieved. All findings require scholarly judgment."
                )
            }
        }

        # Save report JSON
        doc_id = document_info.get("document_id", "doc")
        report_filename = f"report_{doc_id}.json"
        report_path = os.path.join(settings.REPORTS_DIR, report_filename)
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        report["report_file_path"] = report_path
        return report

    def _aggregate_source_details(self, all_matches: list) -> list:
        sources_map = {}
        for m in all_matches:
            src_id = m.get("source_paper_id") or m.get("source_title")
            if src_id not in sources_map:
                sources_map[src_id] = {
                    "source_title": m.get("source_title"),
                    "source_authors": m.get("source_authors"),
                    "source_year": m.get("source_year"),
                    "source_doi": m.get("source_doi"),
                    "total_matched_passages": 0,
                    "max_similarity_score": 0.0
                }
            sources_map[src_id]["total_matched_passages"] += 1
            sources_map[src_id]["max_similarity_score"] = max(
                sources_map[src_id]["max_similarity_score"],
                m["similarity_score"]
            )
        return list(sources_map.values())

    def _synthesize_recommendations(
        self,
        similarity_data: dict,
        citation_data: dict,
        attribution_data: list,
        formatting_issues: list
    ) -> list:
        recs = []

        # 1. Similarity review
        if similarity_data.get("overall_similarity_score", 0) > 0.20:
            recs.append({
                "category": "Similarity & Paraphrasing",
                "priority": "HIGH",
                "message": f"Document has an overall similarity indicator of {round(similarity_data['overall_similarity_score'] * 100, 1)}%. Inspect flagged passages to ensure all referenced ideas are quoted or properly attributed in your own words."
            })

        # 2. Missing bibliography references
        missing = citation_data.get("missing_references", [])
        if missing:
            recs.append({
                "category": "Citations & References",
                "priority": "HIGH",
                "message": f"Found {len(missing)} in-text citation(s) without corresponding entries in the bibliography section. Add the missing reference details."
            })

        # 3. Unused references
        unused = citation_data.get("unused_references", [])
        if unused:
            recs.append({
                "category": "Citations & References",
                "priority": "MEDIUM",
                "message": f"Found {len(unused)} reference(s) listed in the bibliography that are never cited in the manuscript body. Either cite them or remove them."
            })

        # 4. Attribution flags
        if attribution_data:
            recs.append({
                "category": "Attribution",
                "priority": "HIGH",
                "message": f"Identified {len(attribution_data)} passage(s) with strong semantic overlap to published papers without an in-text citation nearby. Review these passages and cite the source if ideas were derived from them."
            })

        # 5. Formatting issues
        if formatting_issues:
            recs.append({
                "category": "Formatting",
                "priority": "MEDIUM",
                "message": f"Found {len(formatting_issues)} reference formatting deviation(s) against the selected style guide. Correct author order, parenthetical year notation, and DOI links."
            })

        if not recs:
            recs.append({
                "category": "General",
                "priority": "LOW",
                "message": "No critical similarity, citation consistency, or formatting discrepancies were identified. Proceed with general peer review."
            })

        return recs

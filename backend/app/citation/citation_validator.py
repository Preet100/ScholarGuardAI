from typing import List, Dict, Any
from app.citation.citation_parser import InTextCitationParser
from app.citation.reference_parser import BibliographyReferenceParser
from app.citation.doi_verification import MetadataVerifier

class CitationValidator:
    """
    Coordinates in-text citation extraction, reference parsing,
    internal cross-verification, and external metadata verification.
    """

    def __init__(self):
        self.in_text_parser = InTextCitationParser()
        self.ref_parser = BibliographyReferenceParser()
        self.metadata_verifier = MetadataVerifier()

    def validate_document_citations(
        self,
        body_text: str,
        reference_text: str,
        verify_external: bool = True
    ) -> Dict[str, Any]:
        """
        Runs the end-to-end citation analysis:
        1. Extract in-text citations from document body.
        2. Parse bibliography entries.
        3. Cross-check in-text vs reference list.
        4. Query Crossref/OpenAlex for DOIs and titles.
        """
        # 1. In-text citations
        in_text_citations = self.in_text_parser.extract_in_text_citations(body_text)
        
        # 2. Bibliography entries
        references = self.ref_parser.parse_references(reference_text)

        # 3. Cross-verification
        consistency_issues = []
        
        # Collect cited numeric indices and cited author surnames
        cited_numbers = set()
        cited_authors = set()
        for cit in in_text_citations:
            if cit["type"] == "NUMERIC" and "number" in cit:
                cited_numbers.add(cit["number"])
            elif "author" in cit:
                # Store primary surname lowercased
                primary = cit["author"].split()[0].replace(",", "").lower()
                cited_authors.add(primary)

        # Map bibliography entries by numeric label and by author surname
        ref_by_number = {}
        ref_by_author = {}
        for r in references:
            if r.get("numeric_label"):
                ref_by_number[r["numeric_label"]] = r
            if r.get("authors"):
                # First author surname
                primary = r["authors"].split(",")[0].split()[0].replace(",", "").lower()
                ref_by_author.setdefault(primary, []).append(r)

        # A. Detect In-Text Citations that lack a corresponding Bibliography Entry
        missing_refs = []
        for cit in in_text_citations:
            if cit["type"] == "NUMERIC":
                num = cit.get("number")
                if num and num not in ref_by_number and references:
                    missing_refs.append({
                        "issue_type": "MISSING_REFERENCE",
                        "citation_raw": cit["raw_text"],
                        "detail": f"Numeric citation [{num}] appears in the manuscript text but no entry [{num}] was found in the references section."
                    })
            elif "author" in cit:
                surname = cit["author"].split()[0].replace(",", "").lower()
                if surname and surname not in ref_by_author and references:
                    missing_refs.append({
                        "issue_type": "MISSING_REFERENCE",
                        "citation_raw": cit["raw_text"],
                        "detail": f"In-text citation '{cit['raw_text']}' has no corresponding author entry in the bibliography list."
                    })

        # Deduplicate missing ref alerts by citation text
        unique_missing = []
        seen_cit = set()
        for m in missing_refs:
            if m["citation_raw"] not in seen_cit:
                seen_cit.add(m["citation_raw"])
                unique_missing.append(m)

        # B. Detect Unused References (Listed in bibliography but never cited)
        unused_refs = []
        for r in references:
            num = r.get("numeric_label")
            authors = r.get("authors", "")
            primary_surname = authors.split(",")[0].split()[0].replace(",", "").lower() if authors else ""

            is_cited = False
            if num and num in cited_numbers:
                is_cited = True
            elif primary_surname and primary_surname in cited_authors:
                is_cited = True

            if not is_cited and in_text_citations:
                unused_refs.append({
                    "issue_type": "UNUSED_REFERENCE",
                    "reference_entry": r["raw_text"],
                    "entry_index": r["entry_index"],
                    "detail": f"Reference #{r['entry_index']} is listed in the bibliography but appears uncited in the manuscript body."
                })

        # C. Detect Potential Duplicate References
        duplicate_refs = []
        seen_dois = {}
        for r in references:
            doi = r.get("doi")
            if doi:
                clean_doi = doi.lower()
                if clean_doi in seen_dois:
                    duplicate_refs.append({
                        "issue_type": "DUPLICATE_REFERENCE",
                        "doi": doi,
                        "entry_indices": [seen_dois[clean_doi], r["entry_index"]],
                        "detail": f"Duplicate DOI '{doi}' found in reference #{seen_dois[clean_doi]} and #{r['entry_index']}."
                    })
                else:
                    seen_dois[clean_doi] = r["entry_index"]

        # 4. External Metadata Verification via Crossref/OpenAlex
        verified_references = []
        for r in references:
            if verify_external:
                ver_result = self.metadata_verifier.verify_doi(
                    doi=r.get("doi"),
                    declared_title=r.get("title"),
                    declared_year=r.get("year"),
                    declared_author=r.get("authors")
                )
            else:
                ver_result = {
                    "status": "UNCHECKED",
                    "service": "None",
                    "message": "External verification skipped.",
                    "verified": False,
                    "external_metadata": None
                }

            verified_references.append({
                **r,
                "verification_status": ver_result["status"],
                "service_queried": ver_result["service"],
                "verification_message": ver_result["message"],
                "external_metadata": ver_result.get("external_metadata")
            })

        total_issues = len(unique_missing) + len(unused_refs) + len(duplicate_refs)
        
        # Count external issues
        metadata_mismatches = [r for r in verified_references if r["verification_status"] == "METADATA_MISMATCH"]
        not_found_count = [r for r in verified_references if r["verification_status"] == "NOT_FOUND"]

        return {
            "total_in_text_citations": len(in_text_citations),
            "total_references": len(references),
            "in_text_citations": in_text_citations,
            "references": verified_references,
            "missing_references": unique_missing,
            "unused_references": unused_refs,
            "duplicate_references": duplicate_refs,
            "metadata_mismatches": metadata_mismatches,
            "not_found_references": not_found_count,
            "total_citation_issues": total_issues + len(metadata_mismatches)
        }

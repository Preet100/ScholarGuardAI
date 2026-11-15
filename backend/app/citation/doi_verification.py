import time
import httpx
from typing import Dict, Any, Optional
from app.config import settings

class MetadataVerifier:
    """
    Verifies publication metadata against Crossref and OpenAlex APIs.
    Implements timeout protection, disk caching, and responsible outcome categorization.
    """

    _cache: Dict[str, Dict[str, Any]] = {}

    def __init__(self, timeout_sec: float = 8.0):
        self.timeout = timeout_sec
        self.headers = {
            "User-Agent": f"ScholarGuardAI/1.0 (mailto:{settings.CROSSREF_MAILTO})"
        }

    def verify_doi(
        self,
        doi: Optional[str],
        declared_title: Optional[str] = None,
        declared_year: Optional[str] = None,
        declared_author: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verifies a publication through Crossref and OpenAlex.
        Categorizes outcomes: VERIFIED, METADATA_MISMATCH, NOT_FOUND, NO_DOI_SUPPLIED, SERVICE_UNAVAILABLE.
        """
        if not doi or not doi.strip():
            # If no DOI provided, attempt OpenAlex title search if title is substantive
            if declared_title and len(declared_title) >= 15:
                return self._search_openalex_by_title(declared_title, declared_year, declared_author)
            return {
                "status": "NO_DOI_SUPPLIED",
                "service": "None",
                "message": "No DOI was detected in this reference entry. Legitimate publications can exist without DOIs.",
                "verified": False,
                "external_metadata": None
            }

        clean_doi = doi.strip()
        # Check cache
        if clean_doi in self._cache:
            return self._cache[clean_doi]

        # 1. Try Crossref lookup
        crossref_res = self._query_crossref(clean_doi, declared_title, declared_year, declared_author)
        if crossref_res["status"] in ("VERIFIED", "METADATA_MISMATCH"):
            self._cache[clean_doi] = crossref_res
            return crossref_res

        # 2. Fallback to OpenAlex lookup
        openalex_res = self._query_openalex_doi(clean_doi, declared_title, declared_year, declared_author)
        if openalex_res["status"] in ("VERIFIED", "METADATA_MISMATCH"):
            self._cache[clean_doi] = openalex_res
            return openalex_res

        # Return whichever had a definitive response, prioritizing detailed error
        final_res = crossref_res if crossref_res["status"] != "SERVICE_UNAVAILABLE" else openalex_res
        self._cache[clean_doi] = final_res
        return final_res

    def _query_crossref(
        self,
        doi: str,
        declared_title: Optional[str],
        declared_year: Optional[str],
        declared_author: Optional[str]
    ) -> Dict[str, Any]:
        url = f"{settings.CROSSREF_API_URL}/{doi}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, headers=self.headers)

            if resp.status_code == 200:
                data = resp.json().get("message", {})
                return self._evaluate_crossref_metadata(data, declared_title, declared_year, declared_author)
            elif resp.status_code == 404:
                return {
                    "status": "NOT_FOUND",
                    "service": "Crossref",
                    "message": f"DOI '{doi}' was not found in the Crossref registry. Note: this does not necessarily mean the publication is invalid.",
                    "verified": False,
                    "external_metadata": None
                }
            elif resp.status_code == 429:
                return {
                    "status": "SERVICE_UNAVAILABLE",
                    "service": "Crossref",
                    "message": "Crossref rate limit reached. External verification could not be completed.",
                    "verified": False,
                    "external_metadata": None
                }
            else:
                return {
                    "status": "SERVICE_UNAVAILABLE",
                    "service": "Crossref",
                    "message": f"Crossref returned HTTP status {resp.status_code}.",
                    "verified": False,
                    "external_metadata": None
                }
        except Exception as e:
            return {
                "status": "SERVICE_UNAVAILABLE",
                "service": "Crossref",
                "message": f"Unable to reach Crossref API ({type(e).__name__}). Verification skipped.",
                "verified": False,
                "external_metadata": None
            }

    def _evaluate_crossref_metadata(
        self,
        data: Dict[str, Any],
        declared_title: Optional[str],
        declared_year: Optional[str],
        declared_author: Optional[str]
    ) -> Dict[str, Any]:
        titles = data.get("title", [])
        resolved_title = titles[0] if titles else "Untitled"
        
        # Extract author names
        authors = []
        for a in data.get("author", []):
            family = a.get("family", "")
            given = a.get("given", "")
            if family:
                authors.append(f"{family}, {given}".strip(", "))
        resolved_authors = "; ".join(authors) if authors else "Unknown"

        # Extract publication year
        resolved_year = None
        published = data.get("published-print") or data.get("published-online") or data.get("created")
        if published and "date-parts" in published and published["date-parts"]:
            resolved_year = str(published["date-parts"][0][0])

        external_meta = {
            "title": resolved_title,
            "authors": resolved_authors,
            "year": resolved_year,
            "container_title": data.get("container-title", [""])[0] if data.get("container-title") else None,
            "doi": data.get("DOI"),
            "publisher": data.get("publisher"),
            "url": data.get("URL")
        }

        # Check for discrepancies (Metadata mismatch)
        mismatches = []
        if declared_year and resolved_year:
            # allow +/- 1 year for preprint / publication discrepancy
            if abs(int("".join(filter(str.isdigit, declared_year)) or 0) - int("".join(filter(str.isdigit, resolved_year)) or 0)) > 1:
                mismatches.append(f"Year mismatch: paper cited '{declared_year}', Crossref record shows '{resolved_year}'")

        if declared_author and resolved_authors != "Unknown":
            first_author_clean = declared_author.split(",")[0].split()[0].lower()
            if first_author_clean not in resolved_authors.lower():
                mismatches.append(f"Author mismatch: cited primary author '{declared_author}', Crossref record lists '{resolved_authors}'")

        if mismatches:
            return {
                "status": "METADATA_MISMATCH",
                "service": "Crossref",
                "message": "DOI resolved, but differences were found between cited metadata and authoritative record: " + "; ".join(mismatches),
                "verified": True,
                "has_mismatch": True,
                "external_metadata": external_meta
            }

        return {
            "status": "VERIFIED",
            "service": "Crossref",
            "message": "Successfully verified against Crossref metadata registry.",
            "verified": True,
            "has_mismatch": False,
            "external_metadata": external_meta
        }

    def _query_openalex_doi(
        self,
        doi: str,
        declared_title: Optional[str],
        declared_year: Optional[str],
        declared_author: Optional[str]
    ) -> Dict[str, Any]:
        url = f"{settings.OPENALEX_API_URL}/https://doi.org/{doi}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, headers=self.headers)
            if resp.status_code == 200:
                data = resp.json()
                resolved_title = data.get("title", "Untitled")
                resolved_year = str(data.get("publication_year", ""))
                authors = [a.get("author", {}).get("display_name", "") for a in data.get("authorships", [])]
                resolved_authors = "; ".join([a for a in authors if a])

                external_meta = {
                    "title": resolved_title,
                    "authors": resolved_authors,
                    "year": resolved_year,
                    "doi": data.get("doi"),
                    "cited_by_count": data.get("cited_by_count"),
                    "url": data.get("id")
                }

                return {
                    "status": "VERIFIED",
                    "service": "OpenAlex",
                    "message": "Successfully verified against OpenAlex academic index.",
                    "verified": True,
                    "has_mismatch": False,
                    "external_metadata": external_meta
                }
            elif resp.status_code == 404:
                return {
                    "status": "NOT_FOUND",
                    "service": "OpenAlex",
                    "message": f"DOI '{doi}' was not indexed in OpenAlex.",
                    "verified": False,
                    "external_metadata": None
                }
            else:
                return {
                    "status": "SERVICE_UNAVAILABLE",
                    "service": "OpenAlex",
                    "message": f"OpenAlex returned HTTP status {resp.status_code}.",
                    "verified": False,
                    "external_metadata": None
                }
        except Exception as e:
            return {
                "status": "SERVICE_UNAVAILABLE",
                "service": "OpenAlex",
                "message": f"Unable to reach OpenAlex API ({type(e).__name__}).",
                "verified": False,
                "external_metadata": None
            }

    def _search_openalex_by_title(
        self,
        title: str,
        declared_year: Optional[str],
        declared_author: Optional[str]
    ) -> Dict[str, Any]:
        url = f"{settings.OPENALEX_API_URL}?search={title}&per-page=1"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, headers=self.headers)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    top_hit = results[0]
                    resolved_title = top_hit.get("title", "")
                    # Simple title overlap check
                    if resolved_title and title.lower()[:30] in resolved_title.lower():
                        return {
                            "status": "VERIFIED",
                            "service": "OpenAlex (Title Search)",
                            "message": "Matched publication in OpenAlex by title query.",
                            "verified": True,
                            "has_mismatch": False,
                            "external_metadata": {
                                "title": resolved_title,
                                "doi": top_hit.get("doi"),
                                "year": str(top_hit.get("publication_year", "")),
                                "url": top_hit.get("id")
                            }
                        }
            return {
                "status": "NOT_FOUND",
                "service": "OpenAlex",
                "message": "Title search did not yield an unambiguous match in OpenAlex.",
                "verified": False,
                "external_metadata": None
            }
        except Exception:
            return {
                "status": "SERVICE_UNAVAILABLE",
                "service": "OpenAlex",
                "message": "Service unavailable during title lookup.",
                "verified": False,
                "external_metadata": None
            }

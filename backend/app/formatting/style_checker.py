import re
from typing import List, Dict, Any

class CitationStyleChecker:
    """
    Validates bibliography entries against academic citation style requirements:
    - APA 7th Edition
    - IEEE
    - MLA 9th Edition
    Uses deterministic, rule-based field and syntax parsing.
    """

    def check_formatting(
        self,
        references: List[Dict[str, Any]],
        style: str = "APA"
    ) -> List[Dict[str, Any]]:
        style_upper = style.upper()
        issues = []

        for ref in references:
            raw = ref.get("raw_text", "").strip()
            idx = ref.get("entry_index", 0)

            if style_upper == "APA":
                ref_issues = self._check_apa_7th(raw, ref)
            elif style_upper == "IEEE":
                ref_issues = self._check_ieee(raw, ref)
            elif style_upper == "MLA":
                ref_issues = self._check_mla(raw, ref)
            else:
                ref_issues = self._check_apa_7th(raw, ref)

            for issue in ref_issues:
                issues.append({
                    "entry_index": idx,
                    "reference_text": raw,
                    "style_evaluated": style_upper,
                    "issue_type": issue["type"],
                    "description": issue["description"],
                    "recommendation": issue["recommendation"]
                })

        return issues

    def _check_apa_7th(self, raw_text: str, ref: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        APA 7th guidelines:
        - Author format: Surname, Initial(s). e.g., 'Smith, J. A., & Davis, R.'
        - Year in parentheses followed by period: '(2022).'
        - Title in sentence case (only first word, proper nouns, and word after colon capitalized).
        - Journal title in italics / capitalized.
        - DOI in format: 'https://doi.org/10.xxxx/...'
        """
        issues = []

        # 1. Check Year enclosed in parentheses followed by dot
        if not re.search(r'\(((?:19|20)\d{2}[a-z]?)\)\.', raw_text):
            if re.search(r'\b(?:19|20)\d{2}\b', raw_text):
                issues.append({
                    "type": "YEAR_FORMAT_ERROR",
                    "description": "Publication year is not enclosed in parentheses followed by a period, e.g. '(2022).'",
                    "recommendation": "Format year as '(Year).' immediately after author names in APA 7th edition."
                })
            else:
                issues.append({
                    "type": "MISSING_YEAR",
                    "description": "Publication year could not be detected in the reference entry.",
                    "recommendation": "Provide publication year in '(YYYY).' format."
                })

        # 2. Check Author format
        # APA requires: Surname, Initial(s).
        # Flag if begins with initials first like "J. Smith"
        if re.match(r'^[A-Z]\.\s*[A-Z][a-zA-Z\-]+', raw_text):
            issues.append({
                "type": "AUTHOR_ORDER_ERROR",
                "description": "Authors appear to be listed as 'Initial. Surname' rather than 'Surname, Initial.'",
                "recommendation": "APA 7th requires inverted author names: 'Surname, A. B.'"
            })

        # 3. Check for DOI format
        # APA 7th recommends full https://doi.org/... URL over bare 'doi:10.xxx'
        if "doi:10." in raw_text.lower() and "https://doi.org/" not in raw_text:
            issues.append({
                "type": "LEGACY_DOI_FORMAT",
                "description": "Uses legacy 'doi:10.xxx' notation instead of full active DOI URL.",
                "recommendation": "Format DOIs as active hyperlinks: 'https://doi.org/10.xxxx/...'"
            })

        # 4. Check for missing title
        if not ref.get("title") or len(ref["title"]) < 5:
            issues.append({
                "type": "MISSING_TITLE",
                "description": "Work title appears absent or could not be isolated.",
                "recommendation": "Ensure article/book title is included in sentence case."
            })

        return issues

    def _check_ieee(self, raw_text: str, ref: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        IEEE guidelines:
        - Must start with bracketed number: '[1]'
        - Authors: Initials precede surname: 'J. K. Author'
        - Article title in double quotes: '"Title of paper,"'
        - Journal title in italics / abbreviated, e.g. 'IEEE Trans. ...'
        - Year at the end: 'vol. 12, no. 3, pp. 45-49, 2020.'
        """
        issues = []

        # 1. Must start with [X]
        if not re.match(r'^\[\d+\]', raw_text):
            issues.append({
                "type": "MISSING_NUMERIC_LABEL",
                "description": "IEEE references must begin with a bracketed numeric label, e.g. '[1]'.",
                "recommendation": "Prepend the reference entry with its citation index: '[1] Author, ...'"
            })

        # 2. Article title should be enclosed in quotation marks
        if not re.search(r'["“][^"”]+["”]', raw_text):
            issues.append({
                "type": "MISSING_QUOTED_TITLE",
                "description": "IEEE style requires article or conference paper titles to be enclosed in quotation marks.",
                "recommendation": 'Enclose the title in quotation marks, e.g. "Title of Paper," followed by a comma.'
            })

        # 3. Check author format: IEEE uses "A. B. Surname", not "Surname, A. B."
        clean_prefix = re.sub(r'^\[\d+\]\s*', '', raw_text)
        if re.match(r'^[A-Z][a-zA-Z\-]+,\s+[A-Z]\.', clean_prefix):
            issues.append({
                "type": "AUTHOR_ORDER_ERROR",
                "description": "Authors appear formatted as 'Surname, Initial.' instead of IEEE standard 'Initial. Surname'.",
                "recommendation": "IEEE style uses initial followed by surname: 'J. K. Author and R. H. Co-author'."
            })

        return issues

    def _check_mla(self, raw_text: str, ref: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        MLA 9th Edition guidelines:
        - Author: Surname, First name.
        - Title in quotes for articles, italics for books.
        - Container title, publisher, date, location (pages / URL / DOI).
        """
        issues = []
        if not re.search(r'\b(?:19|20)\d{2}\b', raw_text):
            issues.append({
                "type": "MISSING_YEAR",
                "description": "Publication year was not detected.",
                "recommendation": "Include publication year towards the end of the citation."
            })
        return issues

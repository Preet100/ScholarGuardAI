import re
from typing import List, Dict, Any, Optional

class BibliographyReferenceParser:
    """
    Parses bibliography sections into structured reference entries,
    extracting authors, publication year, title, journal/venue, and DOI.
    """

    DOI_REGEX = re.compile(
        r'(?:https?://(?:dx\.)?doi\.org/|doi:\s*|DOI:\s*)?(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)',
        re.IGNORECASE
    )

    YEAR_REGEX = re.compile(
        r'\b((?:19|20)\d{2}[a-z]?)\b'
    )

    NUMERIC_PREFIX_REGEX = re.compile(
        r'^(?:\[(\d+)\]|(\d+)\.)\s+'
    )

    def parse_references(self, reference_text: str) -> List[Dict[str, Any]]:
        if not reference_text or not reference_text.strip():
            return []

        # Split references into distinct candidate blocks
        raw_entries = self._split_reference_entries(reference_text)
        parsed_entries = []

        for idx, entry_text in enumerate(raw_entries):
            entry_text = entry_text.strip()
            if len(entry_text) < 15:  # skip negligible header fragments
                continue

            parsed = self._parse_single_entry(entry_text, index=idx + 1)
            parsed_entries.append(parsed)

        return parsed_entries

    def _split_reference_entries(self, text: str) -> List[str]:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        # Remove top "References" or "Bibliography" header if present on line 1
        if lines and re.match(r'^(?:references|bibliography|works cited)', lines[0], re.IGNORECASE):
            lines = lines[1:]

        entries = []
        current = []

        for line in lines:
            # If line starts with [1], 1., or author format, consider it a new reference entry
            starts_numeric = self.NUMERIC_PREFIX_REGEX.match(line)
            # APA style: Author surname followed by comma and initials
            starts_apa_author = re.match(r'^[A-Z][a-zA-Z\-]+,\s+[A-Z]\.', line)

            if (starts_numeric or starts_apa_author) and current:
                entries.append(" ".join(current))
                current = [line]
            else:
                current.append(line)

        if current:
            entries.append(" ".join(current))

        # Fallback to double newline split if heuristics didn't separate items well
        if len(entries) <= 1 and "\n\n" in text:
            entries = [e.strip() for e in text.split("\n\n") if len(e.strip()) > 15]

        return entries

    def _parse_single_entry(self, entry_text: str, index: int) -> Dict[str, Any]:
        # 1. Check numeric label [1]
        num_label = None
        clean_text = entry_text
        match_num = self.NUMERIC_PREFIX_REGEX.match(entry_text)
        if match_num:
            num_label = int(match_num.group(1) or match_num.group(2))
            clean_text = entry_text[match_num.end():].strip()

        # 2. Extract DOI
        doi = None
        match_doi = self.DOI_REGEX.search(entry_text)
        if match_doi:
            doi = match_doi.group(1).rstrip(".")

        # 3. Extract Year
        year = None
        # Priority: (2017)
        match_paren_year = re.search(r'\(((?:19|20)\d{2}[a-z]?)\)', clean_text)
        if match_paren_year:
            year = match_paren_year.group(1)
        else:
            all_years = self.YEAR_REGEX.findall(clean_text)
            if all_years:
                year = all_years[0]

        # 4. Extract Primary Author / Author List
        authors = self._extract_authors(clean_text, year)

        # 5. Extract Title Candidate
        title = self._extract_title(clean_text, authors, year)

        return {
            "entry_index": index,
            "numeric_label": num_label,
            "raw_text": entry_text,
            "authors": authors,
            "year": year,
            "doi": doi,
            "title": title
        }

    def _extract_authors(self, text: str, year: Optional[str]) -> str:
        # If year in parens: authors usually precede "(20xx)"
        if year and f"({year})" in text:
            before_year = text.split(f"({year})")[0].strip().rstrip(".")
            if before_year:
                return before_year

        # IEEE style: "J. Smith and B. Jones, ..." or "A. Vaswani et al., ..."
        match_ieee = re.match(r'^((?:[A-Z]\.\s*)+[A-Z][a-zA-Z\-]+(?:\s*(?:,|and|&|\bet al\b)[^,]+)*?),', text)
        if match_ieee:
            return match_ieee.group(1).strip()

        # APA style: "Smith, J., & Jones, B."
        match_apa = re.match(r'^([A-Z][a-zA-Z\-]+,\s+[A-Z]\.(?:[^.]+\.)*)', text)
        if match_apa:
            return match_apa.group(1).strip().rstrip(".")

        # Default fallback to first 4 words
        words = text.split()
        return " ".join(words[:4]) if words else "Unknown Author"

    def _extract_title(self, text: str, authors: str, year: Optional[str]) -> str:
        rem = text
        if authors and authors in rem:
            rem = rem.replace(authors, "", 1).strip()
        if year and f"({year})" in rem:
            rem = rem.replace(f"({year})", "", 1).strip()
        elif year and year in rem:
            rem = rem.replace(year, "", 1).strip()

        # Often title is in quotes e.g. "Attention is all you need."
        quote_match = re.search(r'["“]([^"”]+)["”]', text)
        if quote_match:
            return quote_match.group(1).strip()

        # Else take first sentence/clause of remaining text
        parts = [p.strip() for p in re.split(r'[\.\?\!]', rem) if p.strip()]
        if parts:
            candidate = parts[0]
            # Strip trailing DOI or URL if attached
            candidate = self.DOI_REGEX.sub("", candidate).strip()
            return candidate if len(candidate) > 10 else rem[:100]

        return rem[:100]

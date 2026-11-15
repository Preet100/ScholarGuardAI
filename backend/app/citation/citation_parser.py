import re
from typing import List, Dict, Any

class InTextCitationParser:
    """
    Extracts in-text citations supporting both author-year and numeric bracket notations.
    """

    # Author-year patterns e.g.:
    # (Smith, 2020)
    # (Smith & Brown, 2019)
    # (Smith et al., 2021)
    # (Vaswani et al., 2017; Devlin et al., 2018)
    AUTHOR_YEAR_PAREN = re.compile(
        r'\(([A-Z][a-zA-Z\s\.\-]+(?:et\s+al\.?|&|and)?(?:,\s+[A-Z][a-zA-Z\s\.\-]+)?,\s+(?:19|20)\d{2}[a-z]?'
        r'(?:;\s+[A-Z][a-zA-Z\s\.\-]+(?:et\s+al\.?|&|and)?(?:,\s+[A-Z][a-zA-Z\s\.\-]+)?,\s+(?:19|20)\d{2}[a-z]?)*)\)'
    )

    # Narrative citations e.g. "Vaswani et al. (2017)" or "Smith and Jones (2020)"
    AUTHOR_YEAR_NARRATIVE = re.compile(
        r'\b([A-Z][a-zA-Z\-]+(?:\s+(?:et\s+al\.?|and|&)\s+[A-Z][a-zA-Z\-]+|\s+et\s+al\.?)?)\s*\(((?:19|20)\d{2}[a-z]?)\)'
    )

    # Numbered citations e.g. [1], [2, 3], [4-7], [12–15]
    NUMERIC_CITATION = re.compile(
        r'\[(\d+(?:\s*[,-–—]\s*\d+)*)\]'
    )

    def extract_in_text_citations(self, text: str) -> List[Dict[str, Any]]:
        citations = []
        seen = set()

        # 1. Author-Year parenthetical
        for match in self.AUTHOR_YEAR_PAREN.finditer(text):
            raw = match.group(0)
            inner = match.group(1)
            # Handle multiple semicolon-separated citations within one parenthesis
            parts = inner.split(";")
            for part in parts:
                part = part.strip()
                submatch = re.search(r'([A-Z][a-zA-Z\s\.\-]+(?:et\s+al\.?|&|and)?),\s+((?:19|20)\d{2}[a-z]?)', part)
                if submatch:
                    author = submatch.group(1).strip()
                    year = submatch.group(2).strip()
                    key = (author.lower(), year, match.start())
                    if key not in seen:
                        seen.add(key)
                        citations.append({
                            "type": "AUTHOR_YEAR_PARENTHETICAL",
                            "raw_text": raw,
                            "author": author,
                            "year": year,
                            "char_start": match.start(),
                            "char_end": match.end()
                        })

        # 2. Author-Year narrative
        for match in self.AUTHOR_YEAR_NARRATIVE.finditer(text):
            raw = match.group(0)
            author = match.group(1).strip()
            year = match.group(2).strip()
            key = (author.lower(), year, match.start())
            if key not in seen:
                seen.add(key)
                citations.append({
                    "type": "AUTHOR_YEAR_NARRATIVE",
                    "raw_text": raw,
                    "author": author,
                    "year": year,
                    "char_start": match.start(),
                    "char_end": match.end()
                })

        # 3. Numeric citations
        for match in self.NUMERIC_CITATION.finditer(text):
            raw = match.group(0)
            num_str = match.group(1)
            # Expand ranges like 4-7 into [4, 5, 6, 7]
            numbers = self._expand_numeric_ranges(num_str)
            for n in numbers:
                citations.append({
                    "type": "NUMERIC",
                    "raw_text": raw,
                    "number": n,
                    "char_start": match.start(),
                    "char_end": match.end()
                })

        return citations

    def _expand_numeric_ranges(self, num_str: str) -> List[int]:
        numbers = []
        tokens = re.split(r'[,;]', num_str)
        for t in tokens:
            t = t.strip()
            range_match = re.match(r'(\d+)\s*[-–—]\s*(\d+)', t)
            if range_match:
                start_n = int(range_match.group(1))
                end_n = int(range_match.group(2))
                if 0 < end_n - start_n <= 30: # safety limit against absurd bounds
                    numbers.extend(range(start_n, end_n + 1))
                else:
                    numbers.append(start_n)
                    numbers.append(end_n)
            elif t.isdigit():
                numbers.append(int(t))
        return numbers

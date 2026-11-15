import re
import string
from typing import List, Dict, Any, Tuple
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

# Ensure required NLTK resources are available locally
try:
    nltk.data.find("tokenizers/punkt")
except (LookupError, Exception):
    try:
        nltk.download("punkt", quiet=True)
        nltk.download("punkt_tab", quiet=True)
    except Exception:
        pass

try:
    nltk.data.find("corpora/stopwords")
except (LookupError, Exception):
    try:
        nltk.download("stopwords", quiet=True)
    except Exception:
        pass

try:
    nltk.data.find("corpora/wordnet")
except (LookupError, Exception):
    try:
        nltk.download("wordnet", quiet=True)
    except Exception:
        pass

class TextPreprocessor:
    """
    NLP Preprocessing Engine that strictly maintains dual text representations:
    1. Original representation for evidence display, citation preservation, and sentence transformers.
    2. Normalized representation for lexical matching (TF-IDF, exact N-grams, hash indexing).
    """

    # Protected academic abbreviations that must not trigger false sentence breaks
    ABBREVIATIONS = (
        r"\b(?:et\s+al|i\.e|e\.g|vs|cf|fig|eq|vol|no|pp|p|dr|prof|dept|univ|al)\."
    )

    def __init__(self):
        try:
            self.stop_words = set(stopwords.words("english"))
        except Exception:
            self.stop_words = {
                "a", "an", "the", "and", "or", "but", "if", "because", "as", "what",
                "which", "this", "that", "these", "those", "then", "just", "so", "than",
                "such", "both", "through", "about", "for", "is", "of", "while", "during",
                "to", "from", "in", "out", "on", "off", "again", "further", "then", "once",
                "here", "there", "when", "where", "why", "how", "all", "any", "both",
                "each", "few", "more", "most", "other", "some", "such", "no", "nor",
                "not", "only", "own", "same", "so", "than", "too", "very", "s", "t",
                "can", "will", "don", "should", "now"
            }
        self.lemmatizer = WordNetLemmatizer()

    def segment_sentences(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits text into sentences while guarding academic abbreviations,
        retaining start and end character offsets.
        """
        if not text or not text.strip():
            return []

        # Temporarily mask period in academic abbreviations with an unlikely token
        def mask_abbrev(match):
            return match.group(0).replace(".", "<!DOT!>")

        masked_text = re.sub(self.ABBREVIATIONS, mask_abbrev, text, flags=re.IGNORECASE)

        # Use NLTK sent_tokenize on masked text, with regex fallback
        try:
            raw_sentences = nltk.sent_tokenize(masked_text)
        except Exception:
            raw_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z])', masked_text) if s.strip()]

        raw_spans = []
        last_end = 0
        for s_text in raw_sentences:
            unmasked = s_text.replace("<!DOT!>", ".").strip()
            if len(unmasked) >= 8:
                start = text.find(unmasked, last_end)
                if start == -1:
                    start = last_end
                end = start + len(unmasked)
                last_end = end
                raw_spans.append({
                    "original": unmasked,
                    "start": start,
                    "end": end
                })

        # Fallback if regex yielded no sentences
        if not raw_spans:
            raw_spans = [{"original": text.strip(), "start": 0, "end": len(text.strip())}]

        processed_sentences = []
        for idx, span in enumerate(raw_spans):
            orig = span["original"]
            norm = self.normalize_text(orig)
            tokens = self.tokenize_words(norm)
            processed_sentences.append({
                "sentence_index": idx,
                "original_text": orig,
                "normalized_text": norm,
                "tokens": tokens,
                "token_count": len(tokens),
                "char_start": span["start"],
                "char_end": span["end"]
            })

        return processed_sentences

    def normalize_text(self, text: str) -> str:
        """
        Transforms text for lexical matching:
        - Lowercasing
        - Normalizing whitespace and ligatures
        - Removing punctuation and special characters
        """
        if not text:
            return ""
        # Lowercase
        t = text.lower()
        # Replace common ligatures and dashes
        t = t.replace("—", " ").replace("–", " ").replace("…", " ")
        # Remove punctuation
        t = t.translate(str.maketrans("", "", string.punctuation))
        # Collapse multiple spaces
        t = re.sub(r"\s+", " ", t).strip()
        return t

    def tokenize_words(self, normalized_text: str) -> List[str]:
        if not normalized_text:
            return []
        return [w for w in normalized_text.split() if w]

    def remove_stopwords_and_lemmatize(self, tokens: List[str]) -> List[str]:
        """
        Filters stopwords and applies lemmatization for lexical representations.
        """
        filtered = []
        for word in tokens:
            if word not in self.stop_words and len(word) > 1:
                try:
                    lemma = self.lemmatizer.lemmatize(word)
                except Exception:
                    lemma = word
                filtered.append(lemma)
        return filtered

    def generate_ngrams(self, tokens: List[str], n: int = 5) -> List[str]:
        """
        Generates word n-grams for exact and sliding-window matching.
        """
        if len(tokens) < n:
            return [" ".join(tokens)] if tokens else []
        return [" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]

# Global singleton
preprocessor = TextPreprocessor()

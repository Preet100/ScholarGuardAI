import os
import sys
import pytest

# Ensure backend is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.document_processing.extractors import DocumentParser, PDFExtractor, DOCXExtractor, TXTExtractor
from app.nlp.preprocessing import TextPreprocessor
from app.plagiarism.exact_match import ExactMatchDetector
from app.plagiarism.tfidf_similarity import TFIDFSimilarityDetector
from app.citation.citation_parser import InTextCitationParser
from app.citation.reference_parser import BibliographyReferenceParser
from app.citation.doi_verification import MetadataVerifier
from app.citation.citation_validator import CitationValidator
from app.attribution.attribution_detector import AttributionDetector
from app.formatting.style_checker import CitationStyleChecker
from app.report.report_generator import ReportGenerator
from app.datasets.corpus_manager import CorpusManager, SEED_PAPERS
from app.database.connection import init_db, SessionLocal
from app.database.models import Document, Analysis

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    db = SessionLocal()
    mgr = CorpusManager(db)
    mgr.seed_initial_corpus_if_empty()
    db.close()

def test_document_extractors():
    parser = DocumentParser()
    txt_path = os.path.join("datasets", "test_documents", "sample_manuscript.txt")
    pdf_path = os.path.join("datasets", "test_documents", "sample_manuscript.pdf")
    docx_path = os.path.join("datasets", "test_documents", "sample_manuscript.docx")

    # 1. TXT Extraction
    res_txt = parser.parse_document(txt_path)
    assert res_txt["format"] == "TXT"
    assert len(res_txt["body_text"]) > 100
    assert res_txt["has_references_section"] is True
    assert len(res_txt["paragraphs"]) >= 3

    # 2. PDF Extraction
    res_pdf = parser.parse_document(pdf_path)
    assert res_pdf["format"] == "PDF"
    assert len(res_pdf["body_text"]) > 100

    # 3. DOCX Extraction
    res_docx = parser.parse_document(docx_path)
    assert res_docx["format"] == "DOCX"
    assert len(res_docx["body_text"]) > 100

def test_nlp_preprocessing():
    prep = TextPreprocessor()
    sample = (
        "As stated by Vaswani et al. (2017), transformers excel in parallelization. "
        "However, training very deep models remains non-trivial (He et al., 2016). "
        "In contrast, e.g., standard RNNs suffer from sequential bottlenecks."
    )
    sentences = prep.segment_sentences(sample)
    assert len(sentences) == 3
    # Check that 'et al.' didn't break the first sentence
    assert "transformers excel" in sentences[0]["original_text"]
    # Check normalized representation
    assert sentences[0]["normalized_text"].islower()
    assert "." not in sentences[0]["normalized_text"]

def test_exact_and_lexical_similarity():
    db = SessionLocal()
    mgr = CorpusManager(db)
    passages = mgr.get_all_corpus_passages()
    db.close()

    prep = TextPreprocessor()
    # Sentence copied verbatim from Vaswani et al. (2017)
    copied_sentence = "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration."
    sent_dict = prep.segment_sentences(copied_sentence)

    # Exact Match
    exact_detector = ExactMatchDetector(n_gram_size=4)
    exact_matches = exact_detector.detect_exact_matches(sent_dict, passages, threshold=0.80)
    assert len(exact_matches) >= 1
    assert exact_matches[0]["source_title"] == "Attention Is All You Need"
    assert exact_matches[0]["similarity_score"] >= 0.95

    # Lexical TF-IDF Match
    tfidf_detector = TFIDFSimilarityDetector()
    lex_matches = tfidf_detector.detect_lexical_matches(sent_dict, passages, threshold=0.50)
    assert len(lex_matches) >= 1

def test_citation_parser():
    in_parser = InTextCitationParser()
    sample = (
        "Previous studies (Devlin et al., 2018) highlighted this property. "
        "Furthermore, recent advances [1] and [3, 4] showed improved generalization."
    )
    cits = in_parser.extract_in_text_citations(sample)
    author_cits = [c for c in cits if c.get("author") is not None]
    numeric_cits = [c for c in cits if c.get("number") is not None]

    assert len(author_cits) >= 1
    assert "Devlin" in author_cits[0]["author"]
    assert any(c["number"] == 1 for c in numeric_cits)
    assert any(c["number"] == 3 for c in numeric_cits)
    assert any(c["number"] == 4 for c in numeric_cits)

def test_reference_parser():
    ref_parser = BibliographyReferenceParser()
    ref_text = (
        "[1] Vaswani, A., Shazeer, N., et al. (2017). Attention is all you need. NeurIPS. https://doi.org/10.48550/arXiv.1706.03762\n"
        "[2] Smith, J. (2022). Deep Learning Systems. Nature Machine Intelligence, 4, 12-18.\n"
        "[3] Fake Author. 2024. doi:10.9999/fabricated.nlp.2024.001"
    )
    parsed = ref_parser.parse_references(ref_text)
    assert len(parsed) == 3
    assert parsed[0]["numeric_label"] == 1
    assert parsed[0]["doi"] == "10.48550/arXiv.1706.03762"
    assert parsed[0]["year"] == "2017"

def test_citation_validator_cross_check():
    validator = CitationValidator()
    body = "As shown in [1], attention is powerful. Another study [3] attempted this."
    ref_text = (
        "[1] Vaswani, A. (2017). Attention is all you need. https://doi.org/10.48550/arXiv.1706.03762\n"
        "[2] Unused Author. (2020). Unused paper."
    )
    # verify_external=False for fast deterministic offline test
    res = validator.validate_document_citations(body, ref_text, verify_external=False)
    
    # Missing reference check: in-text cited [3], but bibliography only has [1] and [2]
    missing_nums = [m["citation_raw"] for m in res["missing_references"]]
    assert "[3]" in missing_nums

    # Unused reference check: [2] is in bibliography but never cited in body
    unused_entries = [u["entry_index"] for u in res["unused_references"]]
    assert 2 in unused_entries

def test_citation_style_checker():
    checker = CitationStyleChecker()
    # APA: Incomplete year format (missing parentheses around year)
    apa_bad = [{"entry_index": 1, "raw_text": "Smith, J. 2022. Machine Learning Overview. Nature.", "title": "Machine Learning Overview"}]
    apa_issues = checker.check_formatting(apa_bad, style="APA")
    assert any(i["issue_type"] == "YEAR_FORMAT_ERROR" for i in apa_issues)

    # IEEE: Missing quotation marks around article title
    ieee_bad = [{"entry_index": 1, "raw_text": "[1] J. Smith, Machine Learning Overview, IEEE Trans., 2022.", "title": "Machine Learning Overview"}]
    ieee_issues = checker.check_formatting(ieee_bad, style="IEEE")
    assert any(i["issue_type"] == "MISSING_QUOTED_TITLE" for i in ieee_issues)

def test_report_generation():
    doc_info = {
        "filename": "test_manuscript.pdf",
        "file_size_bytes": 10240,
        "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "format": "PDF",
        "total_pages": 3,
        "sentences": [{"original_text": "Test sentence."}],
        "has_references_section": True,
        "warnings": []
    }
    sim_data = {
        "overall_similarity_score": 0.15,
        "exact_similarity_score": 0.10,
        "lexical_similarity_score": 0.12,
        "semantic_similarity_score": 0.18,
        "flagged_sentences_count": 2,
        "total_submitted_sentences": 10,
        "exact_matches": [],
        "lexical_matches": [],
        "semantic_matches": [],
        "all_matches": [],
        "review_disclaimer": "Indicator for human review."
    }
    cit_data = {
        "total_in_text_citations": 5,
        "total_references": 5,
        "missing_references": [],
        "unused_references": [],
        "duplicate_references": [],
        "metadata_mismatches": [],
        "not_found_references": [],
        "references": []
    }
    generator = ReportGenerator()
    rep = generator.generate_full_report(
        document_info=doc_info,
        similarity_data=sim_data,
        citation_data=cit_data,
        attribution_data=[],
        formatting_issues=[],
        citation_style="APA"
    )

    # Validate all 11 blueprint-specified sections are present
    assert "1_document_information" in rep
    assert "2_overall_similarity_indicator" in rep
    assert "3_exact_matching_results" in rep
    assert "4_lexical_similarity_results" in rep
    assert "5_semantic_similarity_results" in rep
    assert "6_matched_source_details" in rep
    assert "7_citation_verification_results" in rep
    assert "8_missing_attribution_warnings" in rep
    assert "9_citation_formatting_issues" in rep
    assert "10_recommended_corrections" in rep
    assert "11_methodology_and_limitations" in rep
    assert os.path.exists(rep["report_file_path"])

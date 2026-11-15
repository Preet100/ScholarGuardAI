import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.connection import Base
from app.database.models import ResearchPaper, CorpusPassage
from app.datasets.corpus_manager import CorpusManager
from app.plagiarism.similarity_engine import SimilarityEngine
from app.nlp.preprocessing import preprocessor

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_csv_import_and_similarity(db_session, tmp_path):
    # 1. Create a sample CSV
    csv_file = tmp_path / "custom_corpus.csv"
    csv_file.write_text(
        'title,authors,year,doi,source,text\n'
        '"Graph Convolutional Networks","Kipf, Thomas N.; Welling, Max",2016,"10.48550/arXiv.1609.02907","ICLR","We present a scalable approach for semi-supervised learning on graph-structured data. Our method scales linearly in the number of graph edges and learns hidden layer representations that encode both local graph structure and features of nodes."\n',
        encoding="utf-8"
    )

    # 2. Ingest CSV
    mgr = CorpusManager(db_session)
    res = mgr.import_from_csv(str(csv_file))
    assert res["imported_count"] == 1
    assert res["passages_added"] >= 2

    # 3. Verify in database
    paper = db_session.query(ResearchPaper).filter_by(title="Graph Convolutional Networks").first()
    assert paper is not None
    assert paper.year == 2016
    assert paper.doi == "10.48550/arXiv.1609.02907"

    # 4. Run similarity scan against CSV-imported passage
    corpus_passages = mgr.get_all_corpus_passages()
    assert len(corpus_passages) >= 2

    engine = SimilarityEngine()
    test_submitted_text = "We present a scalable approach for semi-supervised learning on graph-structured data."
    submitted_sents = preprocessor.segment_sentences(test_submitted_text)

    scan_result = engine.run_full_similarity_scan(submitted_sents, corpus_passages)
    assert scan_result["exact_similarity_score"] > 0.8
    assert len(scan_result["exact_matches"]) >= 1
    assert scan_result["exact_matches"][0]["source_title"] == "Graph Convolutional Networks"

import os
import sys
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app
from app.database.connection import init_db

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def init_test_environment():
    init_db()

def test_api_status():
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ONLINE"
    assert data["indexed_reference_papers"] >= 6

def test_api_corpus():
    resp = client.get("/api/corpus")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_papers"] >= 6
    assert any(p["title"] == "Attention Is All You Need" for p in data["papers"])

def test_api_upload_and_analyze_txt():
    # 1. Upload TXT manuscript
    txt_path = os.path.join("datasets", "test_documents", "sample_manuscript.txt")
    with open(txt_path, "rb") as f:
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("sample_manuscript.txt", f, "text/plain")},
            data={"citation_style": "APA"}
        )
    assert upload_resp.status_code == 200
    upload_data = upload_resp.json()
    doc_id = upload_data["document_id"]
    assert doc_id is not None
    assert upload_data["has_references_section"] is True

    # 2. Trigger Full Analysis Pipeline (verify_external_apis=False for test speed)
    analyze_resp = client.post(f"/api/analyze/{doc_id}?verify_external_apis=false")
    assert analyze_resp.status_code == 200
    analysis_data = analyze_resp.json()
    assert analysis_data["status"] == "COMPLETED"
    
    report = analysis_data["report"]
    # Check overall similarity indicator
    assert "2_overall_similarity_indicator" in report
    sim_indicator = report["2_overall_similarity_indicator"]
    assert sim_indicator["overall_hybrid_score"] > 0.0

    # Check that exact match was detected
    assert len(report["3_exact_matching_results"]["matches"]) >= 1
    # Check that citation issues were caught (missing [3], unused [4])
    cit_results = report["7_citation_verification_results"]
    assert len(cit_results["missing_references"]) >= 1
    assert len(cit_results["unused_references"]) >= 1

    # Check that missing attribution was flagged (for the Kingma & Ba optimization sentence)
    attr_results = report["8_missing_attribution_warnings"]
    assert attr_results["flags_count"] >= 1

    # Check dashboard endpoint
    dash_resp = client.get("/api/dashboard")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["metrics"]["total_documents_uploaded"] >= 1
    assert dash_data["metrics"]["total_analyses_completed"] >= 1

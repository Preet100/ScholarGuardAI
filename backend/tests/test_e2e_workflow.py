import os
import sys
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import create_app
from app.database.connection import init_db

app = create_app()
client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_e2e():
    init_db()

def test_e2e_system_status_and_dashboard():
    # 1. Status Check
    status_resp = client.get("/api/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "ONLINE"
    assert status_data["database"] == "CONNECTED"
    assert status_data["indexed_reference_papers"] >= 6

    # 2. Dashboard Check
    dash_resp = client.get("/api/dashboard")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "metrics" in dash_data
    assert "recent_documents" in dash_data
    assert "recent_analyses" in dash_data

def test_e2e_pdf_upload_and_analysis():
    pdf_path = os.path.join("datasets", "test_documents", "sample_manuscript.pdf")
    assert os.path.exists(pdf_path)

    with open(pdf_path, "rb") as f:
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("sample_manuscript.pdf", f, "application/pdf")},
            data={"citation_style": "APA"}
        )
    assert upload_resp.status_code == 200
    doc_data = upload_resp.json()
    doc_id = doc_data["document_id"]
    assert doc_data["format"] == "PDF"
    assert doc_data["status"] == "READY_FOR_ANALYSIS"

    # Analyze with verify_external=False for fast deterministic offline CI execution
    analyze_resp = client.post(f"/api/analyze/{doc_id}?verify_external_apis=false")
    assert analyze_resp.status_code == 200
    res = analyze_resp.json()
    assert res["status"] == "COMPLETED"
    analysis_id = res["analysis_id"]

    # Verify report download
    dl_resp = client.get(f"/api/reports/{analysis_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/json"
    rep_json = dl_resp.json()
    assert "1_document_information" in rep_json
    assert "2_overall_similarity_indicator" in rep_json
    assert "7_citation_verification_results" in rep_json

def test_e2e_docx_upload_and_analysis():
    docx_path = os.path.join("datasets", "test_documents", "sample_manuscript.docx")
    assert os.path.exists(docx_path)

    with open(docx_path, "rb") as f:
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("sample_manuscript.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"citation_style": "IEEE"}
        )
    assert upload_resp.status_code == 200
    doc_data = upload_resp.json()
    doc_id = doc_data["document_id"]
    assert doc_data["format"] == "DOCX"

    analyze_resp = client.post(f"/api/analyze/{doc_id}?verify_external_apis=false")
    assert analyze_resp.status_code == 200
    res = analyze_resp.json()
    assert res["status"] == "COMPLETED"

def test_e2e_txt_upload_and_analysis():
    txt_path = os.path.join("datasets", "test_documents", "sample_manuscript.txt")
    assert os.path.exists(txt_path)

    with open(txt_path, "rb") as f:
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("sample_manuscript.txt", f, "text/plain")},
            data={"citation_style": "APA"}
        )
    assert upload_resp.status_code == 200
    doc_data = upload_resp.json()
    doc_id = doc_data["document_id"]
    assert doc_data["format"] == "TXT"

    analyze_resp = client.post(f"/api/analyze/{doc_id}?verify_external_apis=false")
    assert analyze_resp.status_code == 200
    res = analyze_resp.json()
    assert res["status"] == "COMPLETED"
    assert res["report"]["2_overall_similarity_indicator"]["overall_hybrid_score"] > 0

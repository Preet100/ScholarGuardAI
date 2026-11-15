import os
import re
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.database.models import Document, Analysis, Report, ResearchPaper
from app.document_processing.extractors import DocumentParser, UnsupportedFormatError
from app.nlp.preprocessing import TextPreprocessor
from app.datasets.corpus_manager import CorpusManager
from app.plagiarism.similarity_engine import SimilarityEngine
from app.citation.citation_validator import CitationValidator
from app.attribution.attribution_detector import AttributionDetector
from app.formatting.style_checker import CitationStyleChecker
from app.report.report_generator import ReportGenerator

api_router = APIRouter()

# Singletons for pipeline services
parser = DocumentParser()
preprocessor = TextPreprocessor()
similarity_engine = SimilarityEngine()
citation_validator = CitationValidator()
attribution_detector = AttributionDetector()
style_checker = CitationStyleChecker()
report_generator = ReportGenerator()

@api_router.get("/status")
def get_system_status(db: Session = Depends(get_db)):
    """System health check and corpus statistics."""
    corpus_mgr = CorpusManager(db)
    corpus_count = corpus_mgr.seed_initial_corpus_if_empty()
    total_docs = db.query(Document).count()
    total_analyses = db.query(Analysis).count()

    return {
        "status": "ONLINE",
        "version": settings.VERSION,
        "database": "CONNECTED",
        "semantic_model": settings.SENTENCE_TRANSFORMER_MODEL,
        "indexed_reference_papers": corpus_count,
        "total_documents_processed": total_docs,
        "total_analyses_completed": total_analyses
    }

@api_router.get("/dashboard")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Returns real dashboard data backed by the database:
    recent uploads, recent analysis reports, and real summary metrics.
    No fabricated metrics per Master Blueprint Rule 2 & 4.
    """
    corpus_mgr = CorpusManager(db)
    corpus_mgr.seed_initial_corpus_if_empty()

    recent_docs = db.query(Document).order_by(Document.upload_date.desc()).limit(10).all()
    recent_analyses = db.query(Analysis).order_by(Analysis.created_at.desc()).limit(10).all()
    
    docs_summary = [
        {
            "document_id": d.document_id,
            "filename": d.filename,
            "file_size_bytes": d.file_size_bytes,
            "citation_style": d.citation_style,
            "upload_date": d.upload_date.strftime("%Y-%m-%d %H:%M"),
            "status": d.status
        }
        for d in recent_docs
    ]

    analyses_summary = [
        {
            "analysis_id": a.analysis_id,
            "document_id": a.document_id,
            "filename": a.document.filename if a.document else "Unknown",
            "overall_similarity_score": round(a.overall_similarity_score * 100, 1),
            "total_citations": a.total_citations_found,
            "citation_issues": a.citation_issues_count,
            "missing_attributions": a.missing_attribution_flags_count,
            "formatting_issues": a.formatting_issues_count,
            "status": a.status,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for a in recent_analyses
    ]

    total_docs = db.query(Document).count()
    completed_analyses = db.query(Analysis).filter(Analysis.status == "COMPLETED").count()
    corpus_papers = db.query(ResearchPaper).count()

    return {
        "metrics": {
            "total_documents_uploaded": total_docs,
            "total_analyses_completed": completed_analyses,
            "indexed_reference_corpus_size": corpus_papers
        },
        "recent_documents": docs_summary,
        "recent_analyses": analyses_summary
    }

@api_router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    citation_style: str = Form("APA"),
    db: Session = Depends(get_db)
):
    """
    Validates and stores an uploaded research paper (PDF, DOCX, TXT).
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: '{ext}'. Supported formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Sanitize filename and save to upload directory
    safe_filename = os.path.basename(file.filename)
    # Remove any suspicious directory traversal characters
    safe_filename = re.sub(r'[\r\n\t\\/:]+', '_', safe_filename)
    temp_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    file_bytes = await file.read()

    # Size validation
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    with open(temp_path, "wb") as f:
        f.write(file_bytes)

    # Initial extraction to validate readability
    try:
        extraction = parser.parse_document(temp_path)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=422, detail=f"Failed to extract document contents: {str(e)}")

    # Create document record
    doc_record = Document(
        filename=file.filename,
        file_path=temp_path,
        file_size_bytes=len(file_bytes),
        file_hash=extraction.get("file_hash"),
        citation_style=citation_style.upper(),
        status="PARSED",
        extracted_data=extraction
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    return {
        "document_id": doc_record.document_id,
        "filename": doc_record.filename,
        "file_size_bytes": doc_record.file_size_bytes,
        "citation_style": doc_record.citation_style,
        "format": extraction.get("format"),
        "total_pages": extraction.get("total_pages"),
        "total_paragraphs": len(extraction.get("paragraphs", [])),
        "has_references_section": extraction.get("has_references_section"),
        "is_scanned": extraction.get("is_scanned"),
        "warnings": extraction.get("warnings", []),
        "status": "READY_FOR_ANALYSIS"
    }

@api_router.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "document_id": doc.document_id,
        "filename": doc.filename,
        "file_size_bytes": doc.file_size_bytes,
        "file_hash": doc.file_hash,
        "citation_style": doc.citation_style,
        "status": doc.status,
        "upload_date": doc.upload_date.isoformat(),
        "extracted_data": doc.extracted_data
    }

@api_router.post("/analyze/{document_id}")
def analyze_document(
    document_id: str,
    verify_external_apis: bool = Query(True, description="Whether to query live Crossref/OpenAlex APIs"),
    db: Session = Depends(get_db)
):
    """
    Executes the comprehensive NLP analysis pipeline:
    1. Preprocessing and Sentence Segmentation
    2. Corpus Retrieval & Triple-Tier Similarity (Exact, Lexical, Semantic)
    3. Citation & Bibliography Verification
    4. Missing-Attribution Detection
    5. Citation Formatting Style Checking (APA / IEEE / MLA)
    6. Master Consolidated Report Synthesis
    """
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    extraction = doc.extracted_data
    if not extraction or not extraction.get("body_text"):
        raise HTTPException(status_code=400, detail="Document has no extractable body text to analyze.")

    # Seed reference corpus if empty
    corpus_mgr = CorpusManager(db)
    corpus_mgr.seed_initial_corpus_if_empty()
    corpus_passages = corpus_mgr.get_all_corpus_passages()

    # Step 1: Preprocessing & Sentence Segmentation
    body_text = extraction["body_text"]
    reference_text = extraction.get("reference_text", "")
    sentences = preprocessor.segment_sentences(body_text)

    # Step 2: Plagiarism and Similarity Detection
    similarity_data = similarity_engine.run_full_similarity_scan(
        submitted_sentences=sentences,
        corpus_passages=corpus_passages
    )

    # Step 3: Citation Verification
    citation_data = citation_validator.validate_document_citations(
        body_text=body_text,
        reference_text=reference_text,
        verify_external=verify_external_apis
    )

    # Step 4: Missing Attribution Detection
    attribution_data = attribution_detector.detect_missing_attributions(
        submitted_sentences=sentences,
        similarity_matches=similarity_data.get("all_matches", []),
        body_text=body_text
    )

    # Step 5: Citation Formatting Checks
    formatting_issues = style_checker.check_formatting(
        references=citation_data.get("references", []),
        style=doc.citation_style
    )

    # Step 6: Master Report Generation
    doc_info = {
        "document_id": doc.document_id,
        "filename": doc.filename,
        "file_size_bytes": doc.file_size_bytes,
        "file_hash": doc.file_hash,
        "format": extraction.get("format"),
        "total_pages": extraction.get("total_pages"),
        "sentences": sentences,
        "has_references_section": extraction.get("has_references_section"),
        "warnings": extraction.get("warnings", [])
    }

    full_report = report_generator.generate_full_report(
        document_info=doc_info,
        similarity_data=similarity_data,
        citation_data=citation_data,
        attribution_data=attribution_data,
        formatting_issues=formatting_issues,
        citation_style=doc.citation_style
    )

    # Store analysis record in database
    analysis_record = Analysis(
        document_id=doc.document_id,
        status="COMPLETED",
        overall_similarity_score=similarity_data["overall_similarity_score"],
        exact_similarity_score=similarity_data["exact_similarity_score"],
        lexical_similarity_score=similarity_data["lexical_similarity_score"],
        semantic_similarity_score=similarity_data["semantic_similarity_score"],
        total_sentences=len(sentences),
        total_citations_found=citation_data["total_in_text_citations"],
        total_references_found=citation_data["total_references"],
        citation_issues_count=citation_data["total_citation_issues"],
        missing_attribution_flags_count=len(attribution_data),
        formatting_issues_count=len(formatting_issues),
        result_summary=full_report
    )
    db.add(analysis_record)
    db.flush()  # Ensures analysis_record.analysis_id is generated and populated
    
    # Store Report record
    report_record = Report(
        analysis_id=analysis_record.analysis_id,
        report_file_path=full_report.get("report_file_path"),
        report_data=full_report
    )
    db.add(report_record)

    doc.status = "COMPLETED"
    db.commit()
    db.refresh(analysis_record)

    return {
        "analysis_id": analysis_record.analysis_id,
        "document_id": doc.document_id,
        "status": "COMPLETED",
        "report": full_report
    }

@api_router.get("/analysis/{analysis_id}")
def get_analysis_results(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.analysis_id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    return {
        "analysis_id": analysis.analysis_id,
        "document_id": analysis.document_id,
        "status": analysis.status,
        "created_at": analysis.created_at.isoformat(),
        "report": analysis.result_summary
    }

@api_router.get("/reports/{analysis_id}/download")
def download_report(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.analysis_id == analysis_id).first()
    if not analysis or not analysis.result_summary:
        raise HTTPException(status_code=404, detail="Report not found.")

    report_path = analysis.result_summary.get("report_file_path")
    if not report_path or not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report file missing on server.")

    # Prevent path traversal
    normalized_path = os.path.abspath(report_path)
    allowed_dir = os.path.abspath(settings.REPORTS_DIR)
    if not normalized_path.startswith(allowed_dir):
        raise HTTPException(status_code=403, detail="Access to specified report path is forbidden.")

    return FileResponse(
        path=normalized_path,
        filename=os.path.basename(normalized_path),
        media_type="application/json"
    )

@api_router.get("/corpus")
def get_reference_corpus(db: Session = Depends(get_db)):
    """Returns the indexed papers in the academic reference corpus."""
    corpus_mgr = CorpusManager(db)
    corpus_mgr.seed_initial_corpus_if_empty()
    papers = db.query(ResearchPaper).all()

    return {
        "total_papers": len(papers),
        "papers": [
            {
                "paper_id": p.paper_id,
                "title": p.title,
                "authors": p.authors,
                "year": p.year,
                "doi": p.doi,
                "abstract": p.abstract,
                "source": p.source,
                "url": p.url,
                "passages_count": len(p.passages)
            }
            for p in papers
        ]
    }

@api_router.post("/corpus/import-csv")
async def import_corpus_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and index a custom research paper dataset from a CSV file.
    Expected columns (case-insensitive):
    - title (required)
    - authors
    - year
    - doi
    - text / passages / abstract
    - source
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    safe_name = os.path.basename(file.filename)
    safe_name = re.sub(r'[\r\n\t\\/:]+', '_', safe_name)
    temp_path = os.path.join(settings.CORPUS_DIR, f"temp_{safe_name}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        corpus_mgr = CorpusManager(db)
        stats = corpus_mgr.import_from_csv(temp_path)
        return {
            "status": "SUCCESS",
            "message": f"Successfully indexed {stats['imported_count']} new paper(s) with {stats['passages_added']} passage(s).",
            "details": stats
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

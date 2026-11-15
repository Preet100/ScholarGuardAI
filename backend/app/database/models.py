import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base

def generate_uuid():
    return str(uuid.uuid4())

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), default="researcher")
    created_at = Column(DateTime, default=utcnow)

    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    document_id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_hash = Column(String(64), index=True, nullable=True)
    citation_style = Column(String(50), default="APA")
    upload_date = Column(DateTime, default=utcnow)
    status = Column(String(50), default="UPLOADED")  # UPLOADED, PARSED, ANALYZING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    
    # Structured extracted content cache
    extracted_data = Column(JSON, nullable=True)

    user = relationship("User", back_populates="documents")
    analyses = relationship("Analysis", back_populates="document", cascade="all, delete-orphan")

class ResearchPaper(Base):
    """
    Academic reference corpus paper entry.
    Maintains provenance fields per Section 7.3 of the Master Blueprint.
    """
    __tablename__ = "research_papers"

    paper_id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(500), nullable=False, index=True)
    authors = Column(Text, nullable=True)
    year = Column(Integer, nullable=True)
    doi = Column(String(120), index=True, nullable=True)
    abstract = Column(Text, nullable=True)
    source = Column(String(100), default="OpenAlex")  # OpenAlex, Crossref, arXiv, LocalCorpus
    url = Column(String(512), nullable=True)
    license = Column(String(100), nullable=True)
    full_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Passages in this paper
    passages = relationship("CorpusPassage", back_populates="paper", cascade="all, delete-orphan")

class CorpusPassage(Base):
    """
    Passage or sentence segmented from a reference paper for granular similarity retrieval.
    """
    __tablename__ = "corpus_passages"

    passage_id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey("research_papers.paper_id"), nullable=False)
    passage_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_vector = Column(JSON, nullable=True)  # serialised float vector if stored locally

    paper = relationship("ResearchPaper", back_populates="passages")

class Analysis(Base):
    __tablename__ = "analyses"

    analysis_id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.document_id"), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    
    # Hybrid Similarity Indicators (Indicators for human review, not verdicts)
    overall_similarity_score = Column(Float, default=0.0)
    exact_similarity_score = Column(Float, default=0.0)
    lexical_similarity_score = Column(Float, default=0.0)
    semantic_similarity_score = Column(Float, default=0.0)
    
    # Counts
    total_sentences = Column(Integer, default=0)
    total_citations_found = Column(Integer, default=0)
    total_references_found = Column(Integer, default=0)
    citation_issues_count = Column(Integer, default=0)
    missing_attribution_flags_count = Column(Integer, default=0)
    formatting_issues_count = Column(Integer, default=0)
    
    # Consolidated Result JSON (for comprehensive reporting)
    result_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)

    document = relationship("Document", back_populates="analyses")
    matches = relationship("SimilarityMatch", back_populates="analysis", cascade="all, delete-orphan")
    citations = relationship("CitationFinding", back_populates="analysis", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="analysis", cascade="all, delete-orphan")

class SimilarityMatch(Base):
    __tablename__ = "similarity_matches"

    match_id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.analysis_id"), nullable=False)
    source_paper_id = Column(String(36), ForeignKey("research_papers.paper_id"), nullable=True)
    
    match_method = Column(String(50), nullable=False)  # EXACT, LEXICAL_TFIDF, SEMANTIC_TRANSFORMER
    similarity_score = Column(Float, nullable=False)
    
    submitted_passage = Column(Text, nullable=False)
    matched_source_passage = Column(Text, nullable=False)
    source_title = Column(String(500), nullable=True)
    source_doi = Column(String(120), nullable=True)
    source_authors = Column(Text, nullable=True)
    
    submitted_sentence_index = Column(Integer, nullable=True)
    is_attributed = Column(Boolean, default=False)
    needs_review = Column(Boolean, default=True)

    analysis = relationship("Analysis", back_populates="matches")

class CitationFinding(Base):
    __tablename__ = "citation_findings"

    citation_id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.analysis_id"), nullable=False)
    
    raw_citation_text = Column(Text, nullable=False)
    citation_type = Column(String(50), default="IN_TEXT")  # IN_TEXT, BIBLIOGRAPHY
    author = Column(String(255), nullable=True)
    year = Column(String(20), nullable=True)
    doi = Column(String(120), nullable=True)
    
    # Validation status: VERIFIED, METADATA_MISMATCH, NOT_FOUND, UNRESOLVED, UNUSED, MISSING_REF, FORMAT_ERROR
    validation_status = Column(String(60), default="UNRESOLVED")
    service_queried = Column(String(50), nullable=True)  # Crossref, OpenAlex, Internal
    validation_message = Column(Text, nullable=True)
    external_metadata = Column(JSON, nullable=True)

    analysis = relationship("Analysis", back_populates="citations")

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.analysis_id"), nullable=False)
    report_file_path = Column(String(512), nullable=True)
    report_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    analysis = relationship("Analysis", back_populates="reports")

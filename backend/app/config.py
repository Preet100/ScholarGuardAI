import os
from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ScholarGuard AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Storage
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    WORKSPACE_DIR: str = os.path.dirname(BASE_DIR)
    UPLOAD_DIR: str = os.path.join(WORKSPACE_DIR, "uploads")
    REPORTS_DIR: str = os.path.join(WORKSPACE_DIR, "generated_reports")
    CORPUS_DIR: str = os.path.join(WORKSPACE_DIR, "datasets", "reference_corpus")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(WORKSPACE_DIR, 'scholarguard.db')}")
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]
    
    # Hybrid Similarity Weights (Initial defaults per blueprint Section 6.3: E=0.30, L=0.25, M=0.45)
    WEIGHT_EXACT: float = 0.30
    WEIGHT_LEXICAL: float = 0.25
    WEIGHT_SEMANTIC: float = 0.45
    
    # Similarity Thresholds (Evidence filtering)
    EXACT_MATCH_THRESHOLD: float = 0.85
    LEXICAL_SIMILARITY_THRESHOLD: float = 0.40
    SEMANTIC_SIMILARITY_THRESHOLD: float = 0.65
    ATTRIBUTION_SUSPICION_THRESHOLD: float = 0.70
    
    # External Metadata API settings
    CROSSREF_API_URL: str = "https://api.crossref.org/works"
    CROSSREF_MAILTO: str = os.getenv("CROSSREF_MAILTO", "scholarguard-ai@research.edu")
    OPENALEX_API_URL: str = "https://api.openalex.org/works"
    API_TIMEOUT_SECONDS: float = 8.0
    
    # Semantic Model Configuration
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"

    model_config = ConfigDict(extra="allow", env_file=".env")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
os.makedirs(settings.CORPUS_DIR, exist_ok=True)

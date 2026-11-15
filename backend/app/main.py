import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database.connection import init_db, SessionLocal
from app.database.models import ResearchPaper
from app.datasets.corpus_manager import CorpusManager
from app.api.routes import api_router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="NLP-powered Research Paper Plagiarism and Citation Verification Tool",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # Enable CORS for local and hosted frontends
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    # Initialize database schemas and seed default reference corpus
    @app.on_event("startup")
    def on_startup():
        init_db()
        db = SessionLocal()
        try:
            corpus_mgr = CorpusManager(db)
            corpus_mgr.seed_initial_corpus_if_empty()
            corpus_mgr.sync_local_csv_files()
            total_papers = db.query(ResearchPaper).count()
            print(f"[ScholarGuard AI] Online. Indexed {total_papers} reference papers in corpus.")
        finally:
            db.close()

    # Mount API routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Mount compiled React Frontend if available
    dist_dir = os.path.join(settings.WORKSPACE_DIR, "frontend", "dist")
    if os.path.exists(dist_dir):
        assets_dir = os.path.join(dist_dir, "assets")
        if os.path.exists(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}")
        def serve_frontend_spa(full_path: str):
            if full_path.startswith("api") or full_path in ("docs", "redoc", "openapi.json"):
                raise HTTPException(status_code=404, detail="Not Found")
            target = os.path.join(dist_dir, full_path)
            if full_path and os.path.isfile(target):
                return FileResponse(target)
            return FileResponse(os.path.join(dist_dir, "index.html"))
    else:
        @app.get("/")
        def root():
            return {
                "name": settings.PROJECT_NAME,
                "version": settings.VERSION,
                "status": "OPERATIONAL",
                "documentation": "/docs"
            }

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

import os
import sys
import time
import threading
import subprocess
import webbrowser
import urllib.request

# Ensure backend directory is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

def kill_process_on_port(port: int):
    """Frees up the port if a previous process is still occupying it."""
    if sys.platform == "win32":
        try:
            cmd = f'netstat -ano | findstr :{port}'
            output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
            for line in output.strip().split("\n"):
                parts = line.split()
                if len(parts) >= 5 and "LISTENING" in line:
                    pid = parts[-1]
                    if pid.isdigit() and int(pid) != os.getpid():
                        print(f"[Cleanup] Freeing port {port} (Terminating PID: {pid})...")
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

def opener_worker(primary_url):
    """Waits for backend to respond on port 8000 then launches browser."""
    for _ in range(40):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/api/status", timeout=1.5) as resp:
                if resp.status == 200:
                    time.sleep(0.5)
                    try:
                        webbrowser.open(primary_url)
                    except Exception:
                        pass
                    return
        except Exception:
            time.sleep(0.5)

def main():
    print("=" * 72)
    print("                     SCHOLARGUARD AI")
    print("      Research Paper Plagiarism & Citation Verification Tool")
    print("                     Project ID: CSEAI ML2026-P41")
    print("=" * 72)
    print()

    # 1. Clean ports to prevent [WinError 10048]
    kill_process_on_port(8000)
    kill_process_on_port(5173)

    # 2. Pre-warm semantic transformer model so initial API requests respond instantly
    print("[1/3] Initializing NLP Core & Pre-warming Transformer Models...")
    try:
        from app.plagiarism.semantic_similarity import SemanticSimilarityDetector
        model = SemanticSimilarityDetector.get_model()
        if model and model != "FALLBACK":
            _ = model.encode(["ScholarGuard AI warmup"])
            print("[NLP Core] Semantic transformer model (all-MiniLM-L6-v2) pre-warmed successfully.")
    except Exception as e:
        print(f"[NLP Core] Note: Lazy warming enabled ({e})")

    # 3. Start Vite React Dev Server in parallel if npm is available
    frontend_proc = None
    try:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=FRONTEND_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print("[2/3] Starting React Vite UI...")
    except Exception as e:
        print(f"[Notice] Vite runner unavailable ({e}). Using FastAPI static UI.")

    primary_url = "http://127.0.0.1:8000"
    vite_url = "http://localhost:5173" if frontend_proc else None

    print("[3/3] Launching ScholarGuard AI Unified Server...")
    print()
    print("=" * 72)
    print(" [ONLINE] ScholarGuard AI is ready and operational!")
    print()
    print(f" -> ScholarGuard Web UI:  {primary_url}")
    if vite_url:
        print(f" -> Vite Dev Server:      {vite_url}")
    print(f" -> Swagger API Docs:     http://127.0.0.1:8000/docs")
    print(f" -> API Health Status:    http://127.0.0.1:8000/api/status")
    print("=" * 72)
    print("\nPress Ctrl+C in this terminal window to stop the server.\n")

    # Launch browser opener daemon thread
    threading.Thread(target=opener_worker, args=(primary_url,), daemon=True).start()

    # 4. Import and start FastAPI directly on main thread with Uvicorn
    import uvicorn
    from app.main import app

    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=False
    )
    server = uvicorn.Server(config)

    try:
        server.run()
    except KeyboardInterrupt:
        print("\n[Shutdown] Stopping ScholarGuard AI...")
    finally:
        if frontend_proc:
            try:
                frontend_proc.terminate()
            except Exception:
                pass
        print("[Shutdown] Completed.")

if __name__ == "__main__":
    main()

import React, { useEffect, useState } from "react";
import { fetchDashboardData, fetchSystemStatus, setCustomBackendUrl, getBaseUrl, isStandaloneMode } from "../services/api";
import { FileText, CheckCircle2, AlertTriangle, BookOpen, Upload, Clock, Database, ShieldAlert, Search, ArrowRight, ExternalLink, Cpu, Sparkles, Globe, Link2, RefreshCw } from "lucide-react";

export default function Dashboard({ onNavigate, onSelectAnalysis, systemStatus }) {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState(systemStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(1);
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [corpusSearch, setCorpusSearch] = useState("");
  const [customBackendUrl, setCustomBackendUrlState] = useState("");

  // When parent App detects systemStatus is online, automatically reload dashboard
  useEffect(() => {
    if (systemStatus && !dashboard) {
      loadData();
    }
  }, [systemStatus]);

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    async function tryLoad(currentAttempt = 1) {
      try {
        setAttempt(currentAttempt);
        const [dashData, statusData] = await Promise.all([
          fetchDashboardData(),
          fetchSystemStatus()
        ]);
        if (isMounted) {
          setDashboard(dashData);
          setStatus(statusData);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.warn(`Connection attempt ${currentAttempt} failed:`, err);
        if (isMounted) {
          if (currentAttempt < 5) {
            timer = setTimeout(() => {
              if (isMounted) tryLoad(currentAttempt + 1);
            }, 1500);
          } else {
            setError("Unable to connect to the ScholarGuard AI backend on port 8000. Please ensure the backend server window is running.");
            setLoading(false);
            timer = setTimeout(() => {
              if (isMounted) tryLoad(currentAttempt + 1);
            }, 3000);
          }
        }
      }
    }

    tryLoad(1);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [dashData, statusData] = await Promise.all([
        fetchDashboardData(),
        fetchSystemStatus()
      ]);
      setDashboard(dashData);
      setStatus(statusData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the ScholarGuard AI backend on port 8000. Please ensure the backend server window is running.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "6rem 0" }}>
        <div style={{
          display: "inline-block",
          border: "3px solid rgba(56, 189, 248, 0.2)",
          borderTopColor: "var(--accent-cyan)",
          borderRadius: "50%",
          width: 44,
          height: 44,
          animation: "spin 0.8s linear infinite"
        }}></div>
        <p style={{ marginTop: "1.25rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Connecting to ScholarGuard NLP Core... {attempt > 1 ? `(Attempt ${attempt}/5 - Initializing PyTorch models)` : ""}
        </p>
      </div>
    );
  }

  function handleLoadDemoMode() {
    setError(null);
    loadData();
  }

  function handleConnectCustomBackend(e) {
    e.preventDefault();
    if (!customBackendUrl.trim()) return;
    setCustomBackendUrl(customBackendUrl);
    loadData();
  }

  if (error) {
    const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
    return (
      <div className="card" style={{ borderColor: "rgba(56, 189, 248, 0.4)", background: "rgba(14, 22, 44, 0.95)", padding: "2.25rem", maxWidth: 760, margin: "2rem auto" }}>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
          <div style={{ background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "0.85rem", borderRadius: "12px", color: "var(--accent-cyan)", flexShrink: 0 }}>
            <Globe size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.2rem 0.65rem", borderRadius: "999px", color: "var(--accent-cyan)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
              <span>{isVercel ? "Vercel Cloud Deployment" : "Backend Connection"}</span>
            </div>
            <h3 style={{ fontSize: "1.35rem", marginBottom: "0.4rem", color: "#ffffff", fontWeight: 800 }}>
              {isVercel ? "Frontend Live on Vercel • Backend URL Needed" : "Connecting to ScholarGuard AI Backend..."}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              {isVercel
                ? "Your frontend is deployed successfully on Vercel! Because the Python PyTorch AI engine runs separately from Vercel's serverless limits, connect your hosted backend URL below or explore the live platform using interactive Demo Mode."
                : "Unable to reach the ScholarGuard AI backend on port 8000. Please verify that 'python launch.py' or 'run_server.bat' is running."}
            </p>

            {/* Custom Backend URL Connector */}
            <form onSubmit={handleConnectCustomBackend} style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
                <Link2 size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="text"
                  placeholder="https://scholarguard-api.onrender.com or http://127.0.0.1:8000"
                  value={customBackendUrl}
                  onChange={(e) => setCustomBackendUrlState(e.target.value)}
                  className="input"
                  style={{ paddingLeft: "2.4rem", fontSize: "0.85rem", height: "40px" }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: "0 1.25rem", height: "40px", fontSize: "0.88rem" }}>
                Connect Backend
              </button>
            </form>

            <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", flexWrap: "wrap", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={handleLoadDemoMode} className="btn btn-primary" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)" }}>
                <Sparkles size={16} />
                Explore Platform in Demo Mode
              </button>
              <button onClick={loadData} className="btn btn-secondary">
                <RefreshCw size={15} />
                Retry Local Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const metrics = dashboard?.metrics || {};
  const recentAnalyses = dashboard?.recent_analyses || [];

  // Filtered analyses
  const filteredAnalyses = recentAnalyses.filter(item =>
    item.filename.toLowerCase().includes(analysisSearch.toLowerCase())
  );

  // Reference papers library
  const allCorpusPapers = [
    { title: "Attention Is All You Need", authors: "Vaswani et al.", year: 2017, venue: "NeurIPS", tag: "Transformers", doi: "10.48550/arXiv.1706.03762" },
    { title: "Deep Residual Learning for Image Recognition", authors: "He et al.", year: 2016, venue: "IEEE CVPR", tag: "ResNet", doi: "10.1109/CVPR.2016.90" },
    { title: "BERT: Bidirectional Transformers", authors: "Devlin et al.", year: 2018, venue: "NAACL", tag: "BERT", doi: "10.48550/arXiv.1810.04805" },
    { title: "Adam: Stochastic Optimization", authors: "Kingma & Ba", year: 2014, venue: "ICLR", tag: "Optimization", doi: "10.48550/arXiv.1412.6980" },
    { title: "Retrieval-Augmented Generation (RAG)", authors: "Lewis et al.", year: 2020, venue: "NeurIPS", tag: "RAG", doi: "10.48550/arXiv.2005.11401" },
    { title: "Sentence-BERT (SBERT Embeddings)", authors: "Reimers & Gurevych", year: 2019, venue: "EMNLP", tag: "Embeddings", doi: "10.48550/arXiv.1908.10084" },
    { title: "Generative Adversarial Nets", authors: "Goodfellow et al.", year: 2014, venue: "NeurIPS", tag: "GANs", doi: "10.48550/arXiv.1406.2661" },
    { title: "Mastering the Game of Go with Deep RL", authors: "Silver et al.", year: 2016, venue: "Nature", tag: "Deep RL", doi: "10.1038/nature16961" }
  ];

  const filteredCorpus = allCorpusPapers.filter(p =>
    p.title.toLowerCase().includes(corpusSearch.toLowerCase()) ||
    p.authors.toLowerCase().includes(corpusSearch.toLowerCase()) ||
    p.tag.toLowerCase().includes(corpusSearch.toLowerCase())
  );

  const getFormatBadge = (filename) => {
    const ext = filename.split('.').pop().toUpperCase();
    if (ext === 'PDF') return <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>.PDF</span>;
    if (ext === 'DOCX') return <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>.DOCX</span>;
    return <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>.TXT</span>;
  };

  const getSimilarityRisk = (score) => {
    if (score < 15) return { color: "var(--status-verified)", text: "Low Overlap", badge: "badge-green" };
    if (score <= 35) return { color: "var(--status-warning)", text: "Moderate Overlap", badge: "badge-yellow" };
    return { color: "var(--status-danger)", text: "Attention Required", badge: "badge-danger" };
  };

  return (
    <div className="fade-in">
      {/* Top Welcome & Hero Banner with Multi-Stop Atmosphere */}
      <div style={{
        background: "radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.16) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.14) 0%, transparent 45%), linear-gradient(135deg, rgba(14, 22, 44, 0.85) 0%, rgba(9, 14, 31, 0.95) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "20px",
        padding: "2.25rem 2.5rem",
        marginBottom: "2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.75rem",
        boxShadow: "0 12px 40px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ maxWidth: 800, zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            padding: "0.3rem 0.85rem",
            borderRadius: "999px",
            color: "var(--accent-cyan)",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "1rem",
            boxShadow: "0 0 14px rgba(56, 189, 248, 0.15)"
          }}>
            <Sparkles size={14} />
            <span>Automated Academic Pre-Submission Verification</span>
          </div>

          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.035em", marginBottom: "0.75rem", lineHeight: 1.2 }}>
            Research Paper Integrity &amp; Citation Workspace
          </h1>

          <p style={{ color: "var(--text-muted)", fontSize: "0.98rem", lineHeight: 1.65, maxWidth: 740 }}>
            Evidence-based pre-submission auditing combining exact 5-gram token matching, TF-IDF vocabulary overlap, Sentence Transformers semantic retrieval, and live Crossref/OpenAlex scholarly DOI validation.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.85rem", zIndex: 1, flexWrap: "wrap" }}>
          <button
            onClick={() => onNavigate("upload")}
            className="btn btn-primary"
            style={{ padding: "0.85rem 1.85rem", fontSize: "0.95rem" }}
          >
            <Upload size={18} />
            Upload New Manuscript
          </button>

          <button
            onClick={() => onNavigate("methodology")}
            className="btn btn-secondary"
            style={{ padding: "0.85rem 1.4rem", fontSize: "0.95rem" }}
          >
            <Cpu size={17} />
            System Model
          </button>
        </div>
      </div>

      {/* Bento Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.25rem", marginBottom: "2.25rem" }}>
        {/* Card 1 */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.35rem" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(2, 132, 199, 0.12) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            padding: "1rem",
            borderRadius: "14px",
            color: "var(--accent-cyan)",
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <FileText size={26} />
          </div>
          <div>
            <div style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.04em", fontFamily: "JetBrains Mono, monospace", color: "var(--text-main)" }}>
              {metrics.total_documents_uploaded || 0}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Manuscripts Uploaded</div>
            <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", marginTop: "2px" }}>Active Ingestion Queue</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.35rem" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.12) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            padding: "1rem",
            borderRadius: "14px",
            color: "var(--status-verified)",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.04em", fontFamily: "JetBrains Mono, monospace", color: "var(--text-main)" }}>
              {metrics.total_analyses_completed || 0}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Completed Pre-Audits</div>
            <div style={{ fontSize: "0.72rem", color: "var(--status-verified)", marginTop: "2px" }}>100% Verified Pipeline</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.35rem" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(79, 70, 229, 0.12) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            padding: "1rem",
            borderRadius: "14px",
            color: "#a5b4fc",
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <BookOpen size={26} />
          </div>
          <div>
            <div style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.04em", fontFamily: "JetBrains Mono, monospace", color: "var(--text-main)" }}>
              {metrics.indexed_reference_corpus_size || 8}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Indexed Reference Works</div>
            <div style={{ fontSize: "0.72rem", color: "#a5b4fc", marginTop: "2px" }}>6 Landmark + 2 Custom CSV</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.35rem" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.12) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            padding: "1rem",
            borderRadius: "14px",
            color: "var(--status-warning)",
            boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Database size={26} />
          </div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>Live Crossref API</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>OpenAlex Active</div>
            <div style={{ fontSize: "0.72rem", color: "var(--status-warning)", marginTop: "2px" }}>150M+ Works • Zero API Key</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Analyses & Indexed Corpus */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1.3fr", gap: "1.75rem" }}>
        {/* Left Column: Recent Analyses */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Recent Manuscript Analyses</h2>
              <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Click any record to inspect split-screen evidence and full audit reports
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", background: "rgba(255, 255, 255, 0.06)", border: "1px solid var(--border-subtle)", padding: "0.3rem 0.75rem", borderRadius: "999px", color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}>
              Total: {recentAnalyses.length}
            </span>
          </div>

          {/* Quick Search Toolbar */}
          <div style={{ position: "relative", marginBottom: "1.25rem" }}>
            <Search size={15} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Filter manuscripts by name..."
              value={analysisSearch}
              onChange={(e) => setAnalysisSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: "2.4rem", fontSize: "0.85rem", height: "38px" }}
            />
          </div>

          {filteredAnalyses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--text-muted)" }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: "0.85rem" }} />
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>No matching manuscripts found</h3>
              <p style={{ fontSize: "0.88rem" }}>Upload a PDF, Word DOCX, or TXT file to run your first integrity audit.</p>
              <button onClick={() => onNavigate("upload")} className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
                <Upload size={16} />
                Upload New Manuscript
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxHeight: "560px", overflowY: "auto", paddingRight: "4px" }}>
              {filteredAnalyses.map((item) => {
                const risk = getSimilarityRisk(item.overall_similarity_score);
                return (
                  <div
                    key={item.analysis_id}
                    onClick={() => onSelectAnalysis(item.analysis_id)}
                    className="interactive-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        {getFormatBadge(item.filename)}
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.filename}
                        </span>
                        <span className="badge badge-verified" style={{ fontSize: "0.68rem" }}>
                          COMPLETED
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.45rem", fontSize: "0.8rem", color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                        <span><Clock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> {item.created_at}</span>
                        <span>📚 {item.total_citations} citations</span>
                        {item.citation_issues > 0 ? (
                          <span style={{ color: "var(--status-danger)", fontWeight: 600 }}>⚠️ {item.citation_issues} issue(s)</span>
                        ) : (
                          <span style={{ color: "var(--status-verified)" }}>✓ 0 issues</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: "1.45rem",
                          fontWeight: 800,
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "-0.03em",
                          color: risk.color
                        }}>
                          {item.overall_similarity_score}%
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
                          {risk.text}
                        </div>
                      </div>

                      <div style={{ color: "var(--accent-cyan)", opacity: 0.7 }}>
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Reference Corpus Overview */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Curated Reference Corpus</h2>
            <span className="badge badge-green">
              {metrics.indexed_reference_corpus_size || 8} Papers Indexed
            </span>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", marginBottom: "1rem", lineHeight: 1.55 }}>
            Seminal peer-reviewed AI/CS landmark publications indexed for exact 5-gram sequences and SBERT dense semantic vectors.
          </p>

          {/* Quick Corpus Search */}
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <Search size={15} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Search reference library..."
              value={corpusSearch}
              onChange={(e) => setCorpusSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: "2.4rem", fontSize: "0.85rem", height: "38px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "490px", overflowY: "auto", paddingRight: "4px" }}>
            {filteredCorpus.map((p, i) => (
              <div
                key={i}
                className="interactive-item"
                style={{ padding: "0.9rem 1.1rem" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.6rem" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-main)", lineHeight: 1.35, fontSize: "0.9rem" }}>
                    {p.title}
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: "0.68rem", flexShrink: 0 }}>
                    {p.tag}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.45rem", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>
                    {p.authors} ({p.year}) • {p.venue}
                  </span>

                  {p.doi && (
                    <a
                      href={`https://doi.org/${p.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--accent-cyan)", display: "inline-flex", alignItems: "center", gap: "2px", textDecoration: "none", fontSize: "0.74rem" }}
                    >
                      <span>DOI</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "1.25rem",
            padding: "0.9rem 1.1rem",
            background: "rgba(56, 189, 248, 0.05)",
            borderRadius: "10px",
            border: "1px solid rgba(56, 189, 248, 0.18)",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>Custom Dataset:</span>
              <span>CSV auto-sync enabled</span>
            </div>
            <code style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px" }}>
              datasets/reference_corpus/
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import UploadPaper from "./pages/UploadPaper";
import SimilarityAnalysis from "./pages/SimilarityAnalysis";
import CitationVerification from "./pages/CitationVerification";
import FinalReport from "./pages/FinalReport";
import SystemModel from "./pages/SystemModel";
import { fetchSystemStatus, fetchAnalysisResult } from "./services/api";
import { Shield, LayoutDashboard, Upload, Layers, BookCheck, FileText, CheckCircle2, Cpu } from "lucide-react";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [activeReport, setActiveReport] = useState(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    function checkStatus() {
      fetchSystemStatus()
        .then((data) => {
          if (isMounted) setSystemStatus(data);
        })
        .catch((err) => {
          if (isMounted) setSystemStatus(null);
        });
    }

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  function handleAnalysisComplete(report) {
    setActiveReport(report);
    setCurrentPage("similarity");
  }

  async function handleSelectAnalysis(analysisId) {
    try {
      const data = await fetchAnalysisResult(analysisId);
      setActiveReport(data.report);
      setActiveAnalysisId(analysisId);
      setCurrentPage("report");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="header">
        <div className="header-container">
          {/* Brand */}
          <div
            onClick={() => setCurrentPage("dashboard")}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", flexShrink: 0 }}
          >
            <div style={{
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              padding: "0.5rem",
              borderRadius: "10px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.25)"
            }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", lineHeight: 1.2 }}>
                <span style={{ fontWeight: 800, fontSize: "1.18rem", letterSpacing: "-0.03em", color: "var(--text-main)" }}>
                  ScholarGuard<span style={{ color: "var(--accent-cyan)" }}>AI</span>
                </span>
                <span style={{
                  fontSize: "0.65rem",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  color: "var(--accent-cyan)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600,
                  letterSpacing: "0.02em"
                }}>
                  v1.0 • P41
                </span>
              </div>
              <div className="brand-subtitle" style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginTop: "2px" }}>
                Academic Integrity & Citation Engine
              </div>
            </div>
          </div>

          {/* Navigation Links - Segmented Pill */}
          <nav className="nav-pill-container">
            <button
              onClick={() => setCurrentPage("dashboard")}
              className={`nav-link ${currentPage === "dashboard" ? "active" : ""}`}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentPage("upload")}
              className={`nav-link ${currentPage === "upload" ? "active" : ""}`}
            >
              <Upload size={14} />
              <span>Upload Paper</span>
            </button>

            <button
              onClick={() => setCurrentPage("similarity")}
              className={`nav-link ${currentPage === "similarity" ? "active" : ""}`}
              style={{ position: "relative" }}
            >
              <Layers size={14} />
              <span>Similarity Evidence</span>
              {activeReport && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent-cyan)",
                  position: "absolute",
                  top: 6,
                  right: 6,
                  boxShadow: "0 0 8px var(--accent-cyan)"
                }}></span>
              )}
            </button>

            <button
              onClick={() => setCurrentPage("citations")}
              className={`nav-link ${currentPage === "citations" ? "active" : ""}`}
            >
              <BookCheck size={14} />
              <span>Citation Audit</span>
            </button>

            <button
              onClick={() => setCurrentPage("report")}
              className={`nav-link ${currentPage === "report" ? "active" : ""}`}
            >
              <FileText size={14} />
              <span>Final Report</span>
            </button>

            <button
              onClick={() => setCurrentPage("methodology")}
              className={`nav-link ${currentPage === "methodology" ? "active" : ""}`}
            >
              <Cpu size={14} />
              <span>System Model</span>
            </button>
          </nav>

          {/* Backend Status Pill (Always single-line, flex-shrink: 0) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              fontSize: "0.76rem",
              fontWeight: 600,
              background: systemStatus ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.1)",
              border: systemStatus ? "1px solid rgba(16, 185, 129, 0.28)" : "1px solid rgba(245, 158, 11, 0.35)",
              padding: "0.32rem 0.75rem",
              borderRadius: "999px",
              color: systemStatus ? "var(--status-verified)" : "#f59e0b",
              transition: "all 0.3s ease",
              boxShadow: systemStatus ? "0 0 12px rgba(16, 185, 129, 0.12)" : "none",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: systemStatus ? "var(--status-verified)" : "#f59e0b",
                boxShadow: systemStatus ? "0 0 8px rgba(16, 185, 129, 0.8)" : "0 0 8px rgba(245, 158, 11, 0.8)",
                animation: "pulse 2s infinite ease-in-out",
                flexShrink: 0
              }}
            ></span>
            <span>NLP Core: {systemStatus ? "Online" : "Connecting..."}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="main-content">
        {currentPage === "dashboard" && (
          <Dashboard
            onNavigate={(page) => setCurrentPage(page)}
            onSelectAnalysis={handleSelectAnalysis}
            systemStatus={systemStatus}
          />
        )}

        {currentPage === "upload" && (
          <UploadPaper
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {currentPage === "similarity" && (
          <SimilarityAnalysis
            report={activeReport}
          />
        )}

        {currentPage === "citations" && (
          <CitationVerification
            report={activeReport}
          />
        )}

        {currentPage === "report" && (
          <FinalReport
            report={activeReport}
            analysisId={activeAnalysisId}
          />
        )}

        {currentPage === "methodology" && (
          <SystemModel />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "1.5rem", textAlign: "center", fontSize: "0.82rem", color: "var(--text-dim)", background: "var(--bg-surface)" }}>
        <div>
          <strong>ScholarGuard AI</strong> — Research Paper Plagiarism and Citation Verification Tool • Project ID: <code>CSEAI ML2026-P41</code>
        </div>
        <div style={{ marginTop: "0.35rem" }}>
          Engineered as an evidence-based academic research assistant • Powered by Sentence Transformers & Crossref Metadata
        </div>
      </footer>
    </div>
  );
}

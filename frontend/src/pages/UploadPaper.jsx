import React, { useState } from "react";
import { uploadDocument, analyzeDocument } from "../services/api";
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Settings2 } from "lucide-react";

export default function UploadPaper({ onAnalysisComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [citationStyle, setCitationStyle] = useState("APA");
  const [verifyExternal, setVerifyExternal] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("IDLE"); // IDLE, UPLOADING, PARSED, ANALYZING, COMPLETED, ERROR
  const [parsedDoc, setParsedDoc] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }

  function validateAndSetFile(file) {
    const validExtensions = [".pdf", ".docx", ".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported format: '${file.name}'. Please choose a .PDF, .DOCX, or .TXT research paper.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage("File exceeds the 25MB maximum upload limit.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadStatus("FILE_SELECTED");
  }

  async function handleUploadAndParse() {
    if (!selectedFile) return;

    try {
      setUploadStatus("UPLOADING");
      setErrorMessage(null);
      const res = await uploadDocument(selectedFile, citationStyle);
      setParsedDoc(res);
      setUploadStatus("PARSED");
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to upload and extract manuscript.");
      setUploadStatus("ERROR");
    }
  }

  async function handleStartAnalysis() {
    if (!parsedDoc?.document_id) return;

    try {
      setUploadStatus("ANALYZING");
      setErrorMessage(null);
      const result = await analyzeDocument(parsedDoc.document_id, verifyExternal);
      setUploadStatus("COMPLETED");
      onAnalysisComplete(result.report);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Analysis error occurred.");
      setUploadStatus("ERROR");
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }} className="fade-in">
      {/* Page Title & Context Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.22rem 0.65rem", borderRadius: "999px", color: "var(--accent-cyan)", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          <span>Document Ingestion & Parsing</span>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Upload Research Manuscript
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, marginTop: "0.25rem" }}>
          Ingest your academic draft to trigger dual-representation text preprocessing, triple-tier similarity detection, and live Crossref citation auditing.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "1rem",
        marginBottom: "1.75rem"
      }}>
        <div style={{
          background: selectedFile ? "rgba(56, 189, 248, 0.1)" : "var(--bg-surface)",
          border: `1px solid ${selectedFile ? "rgba(56, 189, 248, 0.4)" : "var(--border-subtle)"}`,
          padding: "0.85rem 1rem",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: selectedFile ? "var(--accent-cyan)" : "var(--border-subtle)",
            color: selectedFile ? "#000" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.82rem"
          }}>1</div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>Select File</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>PDF, DOCX, or TXT</div>
          </div>
        </div>

        <div style={{
          background: parsedDoc ? "rgba(16, 185, 129, 0.1)" : "var(--bg-surface)",
          border: `1px solid ${parsedDoc ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)"}`,
          padding: "0.85rem 1rem",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: parsedDoc ? "var(--status-verified)" : "var(--border-subtle)",
            color: parsedDoc ? "#000" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.82rem"
          }}>2</div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>Parse Structure</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Extract text & refs</div>
          </div>
        </div>

        <div style={{
          background: uploadStatus === "ANALYZING" ? "rgba(99, 102, 241, 0.15)" : "var(--bg-surface)",
          border: `1px solid ${uploadStatus === "ANALYZING" ? "rgba(99, 102, 241, 0.4)" : "var(--border-subtle)"}`,
          padding: "0.85rem 1rem",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: uploadStatus === "ANALYZING" ? "var(--accent-indigo)" : "var(--border-subtle)",
            color: uploadStatus === "ANALYZING" ? "#fff" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.82rem"
          }}>3</div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>Execute Audit</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Similarity & citations</div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="card" style={{ borderColor: "var(--status-danger)", background: "rgba(239, 68, 68, 0.08)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", color: "var(--status-danger)" }}>
            <AlertTriangle size={20} />
            <div style={{ fontWeight: 600 }}>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* File Dropzone */}
      <div className="card" style={{ marginBottom: "1.75rem" }}>
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
            borderRadius: "12px",
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            background: dragActive ? "rgba(56, 189, 248, 0.06)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.25s ease"
          }}
          onClick={() => document.getElementById("file-input-hidden").click()}
        >
          <input
            id="file-input-hidden"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div style={{
            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.1) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            color: "var(--accent-cyan)",
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.2)"
          }}>
            <Upload size={30} />
          </div>

          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {selectedFile ? selectedFile.name : "Select or Drop Your Manuscript Here"}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", maxWidth: 500, margin: "0 auto 1.25rem" }}>
            PyMuPDF & python-docx engine extracts body text, author lists, and bibliographies with OCR fallback.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#fca5a5", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>.PDF (PyMuPDF)</span>
            <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>.DOCX (Word)</span>
            <span style={{ fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#6ee7b7", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>.TXT (Plain)</span>
          </div>

          <span className="btn btn-secondary" style={{ pointerEvents: "none", fontSize: "0.85rem" }}>
            Browse Files from Computer
          </span>
        </div>

        {/* Selected File Details Bar */}
        {selectedFile && (
          <div style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{ background: "rgba(56, 189, 248, 0.15)", padding: "0.6rem", borderRadius: "8px", color: "var(--accent-cyan)" }}>
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{selectedFile.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                </div>
              </div>
            </div>

            {uploadStatus === "FILE_SELECTED" && (
              <button onClick={handleUploadAndParse} className="btn btn-primary" style={{ padding: "0.55rem 1.15rem", fontSize: "0.88rem" }}>
                Extract Text & Sections
              </button>
            )}

            {uploadStatus === "UPLOADING" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-cyan)", fontSize: "0.88rem", fontWeight: 600 }}>
                <div style={{ width: 14, height: 14, border: "2px solid var(--accent-cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                Extracting contents...
              </div>
            )}

            {uploadStatus === "PARSED" && (
              <span className="badge badge-verified"><CheckCircle2 size={14} /> Structure Parsed</span>
            )}
          </div>
        )}
      </div>

      {/* Analysis Configuration */}
      <div className="card" style={{ marginBottom: "1.75rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Settings2 size={20} color="var(--accent-cyan)" />
          Analysis Parameters & Citation Style Guide
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.86rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-main)" }}>
              Target Citation Formatting Guide
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
              {[
                { id: "APA", label: "APA 7th", desc: "(Author, Year)" },
                { id: "IEEE", label: "IEEE", desc: "Numbered [1]" },
                { id: "MLA", label: "MLA 9th", desc: "Author (Page)" }
              ].map((style) => (
                <div
                  key={style.id}
                  onClick={() => setCitationStyle(style.id)}
                  style={{
                    background: citationStyle === style.id ? "rgba(56, 189, 248, 0.12)" : "var(--bg-surface)",
                    border: `1px solid ${citationStyle === style.id ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                    borderRadius: "8px",
                    padding: "0.75rem",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: citationStyle === style.id ? "var(--accent-cyan)" : "var(--text-main)" }}>
                    {style.label}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "2px" }}>
                    {style.desc}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Validates bibliographic fields, parenthetical years, author initials, and canonical DOI links.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.86rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-main)" }}>
              Scholarly Metadata Verification
            </label>
            <div
              onClick={() => setVerifyExternal(!verifyExternal)}
              style={{
                background: verifyExternal ? "rgba(16, 185, 129, 0.08)" : "var(--bg-surface)",
                border: `1px solid ${verifyExternal ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                borderRadius: "8px",
                padding: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <input
                type="checkbox"
                checked={verifyExternal}
                onChange={() => {}}
                style={{ width: 18, height: 18, accentColor: "var(--status-verified)", cursor: "pointer" }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                  Query Live Crossref & OpenAlex APIs
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Verifies real publishing records and catches hallucinated LLM citations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Document Summary & Start Action */}
      {parsedDoc && (
        <div className="card" style={{ borderColor: "rgba(56, 189, 248, 0.5)", marginBottom: "2rem", background: "linear-gradient(135deg, rgba(21, 34, 62, 0.9) 0%, rgba(13, 21, 39, 0.9) 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={18} />
              Extraction Summary & Readiness
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}>
              Doc ID: {parsedDoc.document_id.substring(0, 8)}...
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>Detected Format</div>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "2px" }}>{parsedDoc.format}</div>
            </div>
            <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>Total Paragraphs</div>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "2px" }}>{parsedDoc.total_paragraphs}</div>
            </div>
            <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>References Section</div>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "2px", color: parsedDoc.has_references_section ? "var(--status-verified)" : "var(--status-warning)" }}>
                {parsedDoc.has_references_section ? "✓ Segmented" : "⚠️ None Detected"}
              </div>
            </div>
          </div>

          {parsedDoc.warnings?.length > 0 && (
            <div style={{ padding: "0.85rem 1rem", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", marginBottom: "1.25rem", fontSize: "0.85rem", color: "var(--status-warning)" }}>
              {parsedDoc.warnings.map((w, i) => (
                <div key={i}>⚠️ {w}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={handleStartAnalysis}
              disabled={uploadStatus === "ANALYZING"}
              className="btn btn-primary"
              style={{
                padding: "0.85rem 1.85rem",
                fontSize: "0.98rem",
                boxShadow: "0 4px 20px rgba(2, 132, 199, 0.45)"
              }}
            >
              {uploadStatus === "ANALYZING" ? (
                <>
                  <div style={{ display: "inline-block", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", width: 16, height: 16, animation: "spin 1s linear infinite" }}></div>
                  Executing Multi-Tier NLP Audit...
                </>
              ) : (
                <>
                  Execute Full Academic Integrity Audit
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

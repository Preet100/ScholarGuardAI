import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, ExternalLink, HelpCircle, FileQuestion, BookOpen, Layers, ShieldCheck, Search } from "lucide-react";

export default function CitationVerification({ report }) {
  const [activeTab, setActiveTab] = useState("ALL_REFS");
  const [searchTerm, setSearchTerm] = useState("");

  if (!report) {
    return (
      <div className="card fade-in" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <BookOpen size={48} style={{ opacity: 0.25, margin: "0 auto 1rem" }} />
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Citation Analysis Loaded</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: 450, margin: "0 auto" }}>
          Upload and analyze a manuscript from the <strong>Upload Paper</strong> tab to audit citations, references, and live Crossref metadata.
        </p>
      </div>
    );
  }

  const citData = report["7_citation_verification_results"] || {};
  const references = citData.references || [];
  const missingRefs = citData.missing_references || [];
  const unusedRefs = citData.unused_references || [];
  const duplicateRefs = citData.duplicate_references || [];
  const metadataMismatches = citData.metadata_mismatches || [];

  const verifiedCount = references.filter((r) => r.verification_status === "VERIFIED").length;

  const filteredReferences = references.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.raw_text && r.raw_text.toLowerCase().includes(term)) ||
      (r.doi && r.doi.toLowerCase().includes(term)) ||
      (r.authors && r.authors.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fade-in">
      {/* Page Title & Context Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.22rem 0.65rem", borderRadius: "999px", color: "var(--accent-cyan)", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          <span>Scholarly Graph & DOI Verification</span>
        </div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Citation Consistency & Metadata Audit
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.94rem", marginTop: "2px" }}>
          Cross-checks in-text citation keys against bibliography entries and queries Crossref/OpenAlex for verified publication metadata.
        </p>
      </div>

      {/* Caution Callout */}
      <div className="disclaimer-banner">
        <HelpCircle size={20} style={{ flexShrink: 0, marginTop: 2, color: "var(--status-warning)" }} />
        <div>
          <strong>Scholarly Registry Guidance:</strong> An unverified or unlocated DOI does not automatically indicate a fabricated citation.
          Certain valid works, regional conference proceedings, or vintage journal publications do not have registered Crossref DOIs. Always verify discrepancies contextually.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.15rem" }}>
          <div style={{ background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.85rem", borderRadius: "10px", color: "var(--accent-cyan)" }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {citData.total_in_text_citations || 0}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>In-Text Citations</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.15rem" }}>
          <div style={{ background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.25)", padding: "0.85rem", borderRadius: "10px", color: "#a5b4fc" }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {citData.total_references_listed || 0}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Bibliography Entries</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.15rem" }}>
          <div style={{
            background: missingRefs.length > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
            border: `1px solid ${missingRefs.length > 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            padding: "0.85rem",
            borderRadius: "10px",
            color: missingRefs.length > 0 ? "var(--status-danger)" : "var(--status-verified)"
          }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: missingRefs.length > 0 ? "var(--status-danger)" : "var(--status-verified)"
            }}>
              {missingRefs.length}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Missing in Bibliography</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.15rem" }}>
          <div style={{
            background: unusedRefs.length > 0 ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
            border: `1px solid ${unusedRefs.length > 0 ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            padding: "0.85rem",
            borderRadius: "10px",
            color: unusedRefs.length > 0 ? "var(--status-warning)" : "var(--status-verified)"
          }}>
            <FileQuestion size={24} />
          </div>
          <div>
            <div style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: unusedRefs.length > 0 ? "var(--status-warning)" : "var(--status-verified)"
            }}>
              {unusedRefs.length}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Uncited References</div>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("ALL_REFS")}
            className={`btn ${activeTab === "ALL_REFS" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.84rem", padding: "0.45rem 0.95rem" }}
          >
            All References ({references.length})
          </button>

          <button
            onClick={() => setActiveTab("MISSING")}
            className={`btn ${activeTab === "MISSING" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.84rem", padding: "0.45rem 0.95rem" }}
          >
            Missing References ({missingRefs.length})
          </button>

          <button
            onClick={() => setActiveTab("UNUSED")}
            className={`btn ${activeTab === "UNUSED" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.84rem", padding: "0.45rem 0.95rem" }}
          >
            Unused References ({unusedRefs.length})
          </button>

          {duplicateRefs.length > 0 && (
            <button
              onClick={() => setActiveTab("DUPLICATES")}
              className={`btn ${activeTab === "DUPLICATES" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.84rem", padding: "0.45rem 0.95rem" }}
            >
              Duplicates ({duplicateRefs.length})
            </button>
          )}
        </div>

        {activeTab === "ALL_REFS" && references.length > 0 && (
          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Search reference text or DOI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "0.45rem 0.85rem 0.45rem 2.25rem",
                color: "var(--text-main)",
                fontSize: "0.84rem"
              }}
            />
          </div>
        )}
      </div>

      {/* Tab 1: All Bibliography Entries */}
      {activeTab === "ALL_REFS" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                Bibliographic Entries & Metadata Resolution
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Verified against Crossref REST API and OpenAlex scholarly graph
              </p>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>
              Showing {filteredReferences.length} of {references.length}
            </span>
          </div>

          {filteredReferences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
              <FileQuestion size={36} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
              <p>No matching reference entries found.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredReferences.map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "1.25rem",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{
                        background: "rgba(56, 189, 248, 0.12)",
                        color: "var(--accent-cyan)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontFamily: "JetBrains Mono"
                      }}>
                        #{r.entry_index}
                      </span>
                      {r.numeric_label && (
                        <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.88rem" }}>
                          [{r.numeric_label}]
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    {r.verification_status === "VERIFIED" && (
                      <span className="badge badge-verified">
                        <CheckCircle2 size={13} /> Verified Registry Match
                      </span>
                    )}
                    {r.verification_status === "METADATA_MISMATCH" && (
                      <span className="badge badge-warning">
                        <AlertTriangle size={13} /> Metadata Discrepancy
                      </span>
                    )}
                    {r.verification_status === "NOT_FOUND" && (
                      <span className="badge badge-danger">
                        <AlertCircle size={13} /> Unlocated in Registry
                      </span>
                    )}
                    {r.verification_status === "NO_DOI_SUPPLIED" && (
                      <span className="badge" style={{ background: "rgba(148, 163, 184, 0.1)", color: "var(--text-muted)", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
                        No DOI Declared
                      </span>
                    )}
                    {r.verification_status === "SERVICE_UNAVAILABLE" && (
                      <span className="badge badge-warning">API Timeout / Offline</span>
                    )}
                    {r.verification_status === "UNCHECKED" && (
                      <span className="badge" style={{ background: "rgba(148, 163, 184, 0.1)", color: "var(--text-dim)" }}>
                        Offline Verification
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: "0.94rem", color: "var(--text-main)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                    {r.raw_text}
                  </p>

                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center" }}>
                    {r.doi && (
                      <span>
                        DOI: <a
                          href={`https://doi.org/${r.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent-cyan)", textDecoration: "none", fontWeight: 600 }}
                        >
                          {r.doi} <ExternalLink size={12} style={{ display: "inline", verticalAlign: "middle" }} />
                        </a>
                      </span>
                    )}
                    {r.year && <span>Published Year: <strong>{r.year}</strong></span>}
                  </div>

                  {/* Verification Status Banner */}
                  {r.verification_message && (
                    <div style={{
                      marginTop: "0.75rem",
                      fontSize: "0.82rem",
                      padding: "0.45rem 0.75rem",
                      borderRadius: "6px",
                      background: r.verification_status === "VERIFIED" ? "rgba(16, 185, 129, 0.08)" : r.verification_status === "METADATA_MISMATCH" ? "rgba(245, 158, 11, 0.08)" : "rgba(255, 255, 255, 0.03)",
                      color: r.verification_status === "VERIFIED" ? "#6ee7b7" : r.verification_status === "METADATA_MISMATCH" ? "#fcd34d" : "var(--text-muted)"
                    }}>
                      ℹ️ {r.verification_message}
                    </div>
                  )}

                  {/* External Registry Match Details */}
                  {r.external_metadata && (
                    <div style={{
                      marginTop: "0.75rem",
                      padding: "0.75rem 1rem",
                      background: "rgba(15, 23, 42, 0.6)",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      borderLeft: "3px solid var(--accent-blue)"
                    }}>
                      <div style={{ color: "var(--accent-cyan)", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
                        Official Crossref/OpenAlex Record:
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.9rem" }}>
                        {r.external_metadata.title}
                      </div>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                        {r.external_metadata.authors} ({r.external_metadata.year})
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Missing References */}
      {activeTab === "MISSING" && (
        <div className="card">
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--status-danger)" }}>
              Missing In-Text References ({missingRefs.length})
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", marginTop: "2px" }}>
              These citation tags were detected in the manuscript text, but have no corresponding entry in the bibliography.
            </p>
          </div>

          {missingRefs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--status-verified)" }}>
              <CheckCircle2 size={40} style={{ margin: "0 auto 0.75rem" }} />
              <h4 style={{ fontWeight: 700, fontSize: "1.1rem" }}>All Citations Fully Resolved</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "4px" }}>Every in-text citation correctly maps to a defined reference.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {missingRefs.map((m, i) => (
                <div key={i} style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.28)", borderRadius: "8px", padding: "1.15rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "var(--status-danger)", fontSize: "1rem" }}>
                      Cited In Text: {m.citation_raw}
                    </span>
                    <span className="badge badge-danger">Phantom Reference</span>
                  </div>
                  <div style={{ color: "var(--text-main)", fontSize: "0.88rem", marginTop: "0.5rem", lineHeight: 1.5 }}>
                    {m.detail}
                  </div>
                  <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    💡 <em>Action:</em> Add the full bibliographic citation for this work into the References section before submission.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Unused References */}
      {activeTab === "UNUSED" && (
        <div className="card">
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--status-warning)" }}>
              Uncited Bibliography Entries ({unusedRefs.length})
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", marginTop: "2px" }}>
              These references are listed at the back of the manuscript, but were never cited anywhere in the body text.
            </p>
          </div>

          {unusedRefs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--status-verified)" }}>
              <CheckCircle2 size={40} style={{ margin: "0 auto 0.75rem" }} />
              <h4 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Zero Dead References</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "4px" }}>Every bibliography entry is actively referenced in the manuscript.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {unusedRefs.map((u, i) => (
                <div key={i} style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.28)", borderRadius: "8px", padding: "1.15rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>
                      Reference #{u.entry_index}: {u.reference_entry}
                    </span>
                    <span className="badge badge-warning">Uncited</span>
                  </div>
                  <div style={{ color: "var(--status-warning)", fontSize: "0.84rem", marginTop: "0.5rem" }}>
                    ⚠️ {u.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { AlertCircle, ExternalLink, CheckCircle, ShieldAlert, BookOpen, Layers, ChevronLeft, ChevronRight, Sparkles, FileText } from "lucide-react";

export default function SimilarityAnalysis({ report }) {
  const [filterMethod, setFilterMethod] = useState("ALL"); // ALL, EXACT, SEMANTIC_TRANSFORMER, LEXICAL_TFIDF
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!report) {
    return (
      <div className="card fade-in" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <BookOpen size={48} style={{ opacity: 0.25, margin: "0 auto 1rem" }} />
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Analysis Report Loaded</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: 450, margin: "0 auto" }}>
          Please upload and analyze a manuscript from the <strong>Upload Paper</strong> tab to review similarity evidence and citation audits.
        </p>
      </div>
    );
  }

  const docInfo = report["1_document_information"] || {};
  const simSummary = report["2_overall_similarity_indicator"] || {};
  const allMatches = report["6_matched_source_details"] ? (report["3_exact_matching_results"]?.matches || []).concat(report["5_semantic_similarity_results"]?.matches || [], report["4_lexical_similarity_results"]?.matches || []) : [];

  // Deduplicate matches
  const uniqueMatches = [];
  const seen = new Set();
  for (const m of allMatches) {
    const key = `${m.submitted_sentence_index}-${m.source_title}-${m.method}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMatches.push(m);
    }
  }

  const filteredMatches = filterMethod === "ALL"
    ? uniqueMatches
    : uniqueMatches.filter((m) => m.method === filterMethod);

  const currentMatch = filteredMatches[selectedIndex] || filteredMatches[0];

  function handlePrev() {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredMatches.length - 1));
  }

  function handleNext() {
    setSelectedIndex((prev) => (prev < filteredMatches.length - 1 ? prev + 1 : 0));
  }

  const exactCount = uniqueMatches.filter((m) => m.method === "EXACT").length;
  const semanticCount = uniqueMatches.filter((m) => m.method === "SEMANTIC_TRANSFORMER").length;
  const lexicalCount = uniqueMatches.filter((m) => m.method === "LEXICAL_TFIDF").length;

  return (
    <div className="fade-in">
      {/* Top Banner: Overall Score & Methodology */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1.25rem" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.22rem 0.65rem", borderRadius: "999px", color: "var(--accent-cyan)", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            <span>Dual-Pane Evidence Workspace</span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Similarity & Attribution Review Console
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "2px" }}>
            Manuscript: <strong style={{ color: "var(--text-main)" }}>{docInfo.filename}</strong> • Evaluated using Triple-Tier Formulation: <code style={{ color: "var(--accent-cyan)", fontSize: "0.82rem" }}>S = 0.30E + 0.25L + 0.45M</code>
          </p>
        </div>

        {/* Overall Score Card with Mini Gauges */}
        <div className="card" style={{ padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1.5rem", background: "linear-gradient(135deg, rgba(21, 34, 62, 0.9) 0%, rgba(13, 21, 39, 0.9) 100%)" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
              Hybrid Indicator
            </div>
            <div style={{
              fontSize: "2.1rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: simSummary.overall_hybrid_score > 0.2 ? "var(--status-warning)" : "var(--status-verified)"
            }}>
              {Math.round((simSummary.overall_hybrid_score || 0) * 100)}%
            </div>
          </div>

          <div style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Exact (E, 30%):</span>
              <strong style={{ color: "#fca5a5" }}>{Math.round((simSummary.exact_similarity_score || 0) * 100)}%</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Semantic (M, 45%):</span>
              <strong style={{ color: "#c7d2fe" }}>{Math.round((simSummary.semantic_similarity_score || 0) * 100)}%</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Lexical (L, 25%):</span>
              <strong style={{ color: "#7dd3fc" }}>{Math.round((simSummary.lexical_similarity_score || 0) * 100)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Human Review Disclaimer Banner */}
      <div className="disclaimer-banner">
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2, color: "var(--status-warning)" }} />
        <div>
          <strong>Scholarly Review Principle:</strong> A similarity percentage is an algorithmic indicator for academic review, not a plagiarism verdict.
          Legitimate verbatim quotes, scientific definitions, and standard mathematical formulations naturally yield high similarity. Always evaluate evidence contextually.
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: `All Flagged (${uniqueMatches.length})` },
            { id: "EXACT", label: `Exact Matches (${exactCount})` },
            { id: "SEMANTIC_TRANSFORMER", label: `Semantic Paraphrases (${semanticCount})` },
            { id: "LEXICAL_TFIDF", label: `Lexical TF-IDF (${lexicalCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterMethod(tab.id);
                setSelectedIndex(0);
              }}
              className={`btn ${filterMethod === tab.id ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredMatches.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Match {selectedIndex + 1} of {filteredMatches.length}
            </span>
            <button onClick={handlePrev} className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem" }} title="Previous match">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNext} className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem" }} title="Next match">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Split Workspace */}
      {filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
          <CheckCircle size={40} color="var(--status-verified)" style={{ margin: "0 auto 0.85rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.4rem" }}>No Flagged Passages Found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: 460, margin: "0 auto" }}>
            The manuscript demonstrates clean originality with zero suspicious matches under this detection filter.
          </p>
        </div>
      ) : (
        <div className="evidence-workspace">
          {/* Left Column: Flagged Submitted Passages */}
          <div className="evidence-pane">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Submitted Manuscript Passages ({filteredMatches.length})
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Click to compare</span>
            </div>

            {filteredMatches.map((m, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`passage-card ${selectedIndex === idx ? "selected" : ""}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span className={m.method === "EXACT" ? "badge badge-exact" : m.method === "SEMANTIC_TRANSFORMER" ? "badge badge-semantic" : "badge badge-lexical"}>
                    {m.method === "EXACT" ? "5-Gram Exact" : m.method === "SEMANTIC_TRANSFORMER" ? "SBERT Semantic" : "TF-IDF Lexical"}
                  </span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--accent-cyan)", fontFamily: "JetBrains Mono" }}>
                    {Math.round(m.similarity_score * 100)}% Match
                  </span>
                </div>

                <p style={{ fontSize: "0.92rem", color: "var(--text-main)", lineHeight: 1.55, fontWeight: 500 }}>
                  "{m.submitted_passage}"
                </p>

                <div style={{ marginTop: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <span>Sentence #{m.submitted_sentence_index != null ? m.submitted_sentence_index + 1 : idx + 1}</span>
                  <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
                    Source: {m.source_title?.substring(0, 32)}...
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Matched Source Evidence Card */}
          <div className="card" style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Authoritative Source Evidence
              </span>
              <span style={{ fontSize: "0.75rem", background: "rgba(56, 189, 248, 0.12)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                Corpus Verified
              </span>
            </div>

            {currentMatch ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Method & Confidence Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)", marginBottom: "1rem" }}>
                  <div>
                    <span className={currentMatch.method === "EXACT" ? "badge badge-exact" : currentMatch.method === "SEMANTIC_TRANSFORMER" ? "badge badge-semantic" : "badge badge-lexical"}>
                      {currentMatch.method}
                    </span>
                    <span style={{ marginLeft: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Detection Confidence: <strong style={{ color: "var(--text-main)" }}>{Math.round(currentMatch.similarity_score * 100)}%</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>
                    Sentence #{currentMatch.submitted_sentence_index != null ? currentMatch.submitted_sentence_index + 1 : 1}
                  </span>
                </div>

                {/* Comparative Passages Box */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
                    Submitted Text:
                  </div>
                  <div style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.92rem", color: "var(--text-main)", marginBottom: "0.85rem", lineHeight: 1.5 }}>
                    "{currentMatch.submitted_passage}"
                  </div>

                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
                    Matched Reference Source Text:
                  </div>
                  <div style={{ background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.92rem", color: "#f0fdf4", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{currentMatch.matched_source_passage}"
                  </div>
                </div>

                {/* Publication Metadata Card */}
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.15rem", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>
                    Published Reference Metadata
                  </div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.45rem", lineHeight: 1.35 }}>
                    {currentMatch.source_title}
                  </h4>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                    <strong>Authors:</strong> {currentMatch.source_authors || "Landmark AI Literature Corpus"}
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
                    <strong>Publication Year:</strong> {currentMatch.source_year || "Peer-Reviewed"}
                  </div>

                  {currentMatch.source_doi && (
                    <a
                      href={`https://doi.org/${currentMatch.source_doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                    >
                      <ExternalLink size={14} />
                      Verify Official DOI: {currentMatch.source_doi}
                    </a>
                  )}
                </div>

                {/* Editorial Recommendation Callout */}
                <div style={{
                  marginTop: "auto",
                  padding: "0.85rem 1.15rem",
                  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)",
                  borderRadius: "8px",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  fontSize: "0.84rem",
                  color: "var(--accent-cyan)",
                  lineHeight: 1.5
                }}>
                  💡 <strong>Actionable Guidance:</strong> If this passage reflects derived theory or empirical findings from <em>{currentMatch.source_title}</em>, ensure an explicit citation tag (e.g. <code>[X]</code> or <code>(Author, Year)</code>) is appended to maintain academic rigor.
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>Select a passage from the left list to inspect comparative evidence.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

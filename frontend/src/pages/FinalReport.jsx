import React from "react";
import { Download, Printer, CheckCircle, AlertTriangle, AlertCircle, FileText, ExternalLink, HelpCircle, Shield, Award, BookOpen, Layers } from "lucide-react";
import { getReportDownloadUrl } from "../services/api";

export default function FinalReport({ report, analysisId }) {
  if (!report) {
    return (
      <div className="card fade-in" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <FileText size={48} style={{ opacity: 0.25, margin: "0 auto 1rem" }} />
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Analysis Report Loaded</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: 460, margin: "0 auto" }}>
          Please upload and analyze a manuscript from the <strong>Upload Paper</strong> tab to generate the comprehensive pre-submission report.
        </p>
      </div>
    );
  }

  const docInfo = report["1_document_information"] || {};
  const simIndicator = report["2_overall_similarity_indicator"] || {};
  const exactRes = report["3_exact_matching_results"] || {};
  const lexicalRes = report["4_lexical_similarity_results"] || {};
  const semanticRes = report["5_semantic_similarity_results"] || {};
  const sourceDetails = report["6_matched_source_details"] || [];
  const citRes = report["7_citation_verification_results"] || {};
  const attrRes = report["8_missing_attribution_warnings"] || {};
  const formatRes = report["9_citation_formatting_issues"] || {};
  const recs = report["10_recommended_corrections"] || [];
  const methodology = report["11_methodology_and_limitations"] || {};

  function handleDownloadJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ScholarGuard_Report_${docInfo.filename || "manuscript"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto" }} className="fade-in">
      {/* Header & Export Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "1.25rem",
        paddingBottom: "1.25rem",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.22rem 0.65rem", borderRadius: "999px", color: "var(--accent-cyan)", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            <span>Institutional Pre-Submission Audit</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Comprehensive Manuscript Integrity Report
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "3px" }}>
            Generated: <strong style={{ color: "var(--text-main)" }}>{report.report_metadata?.generated_at}</strong> • Engine Version: <code>{report.report_metadata?.engine_version}</code> • Project ID: <code>CSEAI ML2026-P41</code>
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }} className="no-print">
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer size={16} />
            Print / Save PDF
          </button>
          <button onClick={handleDownloadJson} className="btn btn-primary">
            <Download size={16} />
            Export JSON Report
          </button>
        </div>
      </div>

      {/* Human Review Disclaimer Callout */}
      <div className="disclaimer-banner">
        <HelpCircle size={22} style={{ flexShrink: 0, marginTop: 2, color: "var(--status-warning)" }} />
        <div>
          <strong>Academic Evaluation Principle:</strong> This report provides computational evidence to assist author self-review and peer evaluation.
          A similarity score is an algorithmic indicator, not a definitive verdict of plagiarism. Semantic similarity does not prove copying, and unlocated DOIs do not indicate fraudulent works.
        </div>
      </div>

      {/* 1. Document Information */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>01</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Document Information & Provenance</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", fontSize: "0.92rem" }}>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 600 }}>Manuscript Filename</div>
            <div style={{ fontWeight: 700, marginTop: "2px", color: "var(--text-main)" }}>{docInfo.filename}</div>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 600 }}>Format & File Size</div>
            <div style={{ fontWeight: 700, marginTop: "2px", color: "var(--text-main)" }}>{docInfo.format} ({Math.round((docInfo.file_size_bytes || 0) / 1024)} KB)</div>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 600 }}>Sentences Extracted</div>
            <div style={{ fontWeight: 700, marginTop: "2px", color: "var(--text-main)" }}>{docInfo.total_sentences_extracted} sentences</div>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 600 }}>SHA-256 Checksum</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: "0.78rem", color: "var(--accent-cyan)", marginTop: "2px" }}>
              {docInfo.file_hash_sha256 ? `${docInfo.file_hash_sha256.substring(0, 18)}...` : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Overall Similarity Indicator */}
      <div className="card" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, rgba(21, 34, 62, 0.95) 0%, rgba(13, 21, 39, 0.95) 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>02</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Overall Similarity Metric & Multi-Tier Formulation</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <div style={{
              fontSize: "3.2rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: simIndicator.overall_hybrid_score > 0.2 ? "var(--status-warning)" : "var(--status-verified)"
            }}>
              {Math.round((simIndicator.overall_hybrid_score || 0) * 100)}%
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", marginTop: "0.35rem" }}>
              Weighted Hybrid Score
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span>Exact Matching (E, 30%):</span>
                <strong style={{ color: "#fca5a5" }}>{Math.round((simIndicator.exact_similarity_score || 0) * 100)}%</strong>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill" style={{ width: `${Math.round((simIndicator.exact_similarity_score || 0) * 100)}%`, background: "var(--status-danger)" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span>Semantic Paraphrasing (M, 45%):</span>
                <strong style={{ color: "#c7d2fe" }}>{Math.round((simIndicator.semantic_similarity_score || 0) * 100)}%</strong>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill" style={{ width: `${Math.round((simIndicator.semantic_similarity_score || 0) * 100)}%`, background: "var(--accent-indigo)" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span>Lexical TF-IDF Overlap (L, 25%):</span>
                <strong style={{ color: "#7dd3fc" }}>{Math.round((simIndicator.lexical_similarity_score || 0) * 100)}%</strong>
              </div>
              <div className="metric-bar">
                <div className="metric-bar-fill" style={{ width: `${Math.round((simIndicator.lexical_similarity_score || 0) * 100)}%`, background: "var(--accent-cyan)" }}></div>
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {simIndicator.review_warning}
        </p>
      </div>

      {/* 3, 4, 5: Similarity Breakdown Summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>03. EXACT MATCHING</span>
            <span className="badge badge-exact">{exactRes.matches_count || 0} Flagged</span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Identical or near-verbatim 5-gram token sequences mapped directly to reference literature.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>04. SEMANTIC SIMILARITY</span>
            <span className="badge badge-semantic">{semanticRes.matches_count || 0} Flagged</span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Deep conceptual paraphrasing identified via Sentence Transformers (<code>all-MiniLM-L6-v2</code>) cosine distance.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>05. LEXICAL OVERLAP</span>
            <span className="badge badge-lexical">{lexicalRes.matches_count || 0} Flagged</span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Distinctive vocabulary and specialized terminology overlap captured via term frequency–inverse document frequency.
          </p>
        </div>
      </div>

      {/* 6. Matched Source Details */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>06</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Matched Reference Publications ({sourceDetails.length})</h2>
        </div>

        {sourceDetails.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No source works from the reference corpus exhibited significant overlap.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {sourceDetails.map((src, i) => (
              <div key={i} style={{ background: "var(--bg-surface)", padding: "1.1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--text-main)" }}>{src.source_title}</div>
                  <span className="badge badge-warning">Max Similarity: {Math.round(src.max_similarity_score * 100)}%</span>
                </div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                  {src.source_authors} ({src.source_year}) • <strong>{src.total_matched_passages}</strong> passage(s) flagged
                </div>
                {src.source_doi && (
                  <div style={{ marginTop: "0.45rem" }}>
                    <a href={`https://doi.org/${src.source_doi}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", fontSize: "0.82rem", textDecoration: "none" }}>
                      DOI: {src.source_doi} <ExternalLink size={12} style={{ display: "inline", verticalAlign: "middle" }} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Citation Verification Results */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>07</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Citation & Reference Graph Audit</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>In-Text Citations</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "2px" }}>{citRes.total_in_text_citations}</div>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Listed References</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "2px" }}>{citRes.total_references_listed}</div>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Missing In Bibliography</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "2px", color: citRes.missing_references?.length > 0 ? "var(--status-danger)" : "var(--status-verified)" }}>
              {citRes.missing_references?.length || 0}
            </div>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Uncited References</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "2px", color: citRes.unused_references?.length > 0 ? "var(--status-warning)" : "var(--status-verified)" }}>
              {citRes.unused_references?.length || 0}
            </div>
          </div>
        </div>

        {citRes.missing_references?.length > 0 && (
          <div style={{ padding: "0.95rem 1.15rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px" }}>
            <h4 style={{ color: "var(--status-danger)", fontSize: "0.92rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              Missing Reference Details:
            </h4>
            {citRes.missing_references.map((m, i) => (
              <div key={i} style={{ fontSize: "0.84rem", color: "var(--text-main)", marginTop: "2px" }}>
                • <strong style={{ color: "var(--status-danger)" }}>{m.citation_raw}</strong>: {m.detail}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Missing Attribution Warnings */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>08</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Missing Attribution Analysis ({attrRes.flags_count || 0})</h2>
        </div>

        {attrRes.flags?.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No uncredited high-similarity passages were flagged.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {attrRes.flags?.map((f, i) => (
              <div key={i} style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.28)", padding: "1.1rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                  <span className="badge badge-warning">Uncited Paraphrase Flag</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}>
                    Semantic Similarity: <strong>{Math.round(f.semantic_similarity_score * 100)}%</strong>
                  </span>
                </div>
                <div style={{ fontSize: "0.94rem", fontStyle: "italic", marginBottom: "0.5rem", color: "var(--text-main)" }}>
                  "{f.submitted_passage}"
                </div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  Derived from reference: <strong style={{ color: "var(--text-main)" }}>{f.source_title}</strong> ({f.source_authors})
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--status-warning)", marginTop: "0.45rem" }}>
                  💡 <strong>Action Required:</strong> {f.suggested_action}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. Citation Formatting Issues */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>09</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Citation Style & Formatting Compliance ({formatRes.issues_count || 0})</h2>
        </div>

        {formatRes.issues?.length === 0 ? (
          <p style={{ color: "var(--status-verified)", fontSize: "0.9rem" }}>✓ All parsed references conform to the selected publication style guidelines.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {formatRes.issues?.map((iss, i) => (
              <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--status-warning)" }}>
                    Ref #{iss.entry_index}: {iss.issue_type}
                  </span>
                  <span style={{ fontSize: "0.75rem", background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px", color: "var(--text-dim)" }}>
                    Style: {iss.style_evaluated}
                  </span>
                </div>
                <div style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>{iss.description}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--accent-cyan)", marginTop: "0.35rem" }}>
                  Recommendation: {iss.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10. Recommended Corrections */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>10</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Actionable Pre-Submission Checklist</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {recs.map((rec, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", background: "var(--bg-surface)", padding: "1rem 1.15rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <span className={`badge ${rec.priority === "HIGH" ? "badge-danger" : rec.priority === "MEDIUM" ? "badge-warning" : "badge-verified"}`}>
                {rec.priority} PRIORITY
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)" }}>{rec.category}</div>
                <div style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginTop: "0.25rem", lineHeight: 1.45 }}>{rec.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 11. Methodology & Limitations */}
      <div className="card" style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", fontFamily: "JetBrains Mono" }}>11</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Methodology & Limitations Statement</h2>
        </div>

        <div style={{ fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.65 }}>
          <p style={{ marginBottom: "0.75rem" }}>
            <strong>Hybrid Similarity Formulation:</strong> Evaluated using the weighted linear combination:
            <code style={{ background: "rgba(0,0,0,0.4)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", marginLeft: "0.5rem", fontFamily: "JetBrains Mono" }}>
              {methodology.hybrid_weights?.formula}
            </code>
          </p>
          <p style={{ marginBottom: "0.75rem" }}>
            <strong>Deployed Models:</strong> Semantic embeddings via <em>{methodology.models_employed?.semantic_transformer}</em>. Lexical analysis via <em>{methodology.models_employed?.lexical_vectorizer}</em>. Exact matching via <em>{methodology.models_employed?.exact_matcher}</em>.
          </p>
          <p style={{ fontStyle: "italic", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem", color: "var(--text-dim)" }}>
            {methodology.limitations_statement}
          </p>
        </div>
      </div>
    </div>
  );
}

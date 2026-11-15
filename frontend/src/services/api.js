// ScholarGuard AI - API Client & Resilient Transport Layer

// 1. Determine dynamic backend URL with multi-tier resolution:
//    Priority 1: User-entered custom backend URL (stored in localStorage)
//    Priority 2: Build-time environment variable (VITE_API_URL, e.g. on Vercel)
//    Priority 3: Vite Dev Server proxy or direct local port
export function getBaseUrl() {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("scholarguard_api_url");
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/+$/, "");
      return clean.endsWith("/api") ? clean : `${clean}/api`;
    }
  }

  if (import.meta.env?.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  if (typeof window !== "undefined") {
    // If on Vite dev server (port 5173), direct to FastAPI on port 8000
    if (window.location.port === "5173") {
      return "http://127.0.0.1:8000/api";
    }
    // If hosted on localhost or 127.0.0.1 without port 8000
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "/api";
    }
  }

  // Hosted platforms (Vercel, Netlify, etc.) without explicit VITE_API_URL
  return "/api";
}

export function setCustomBackendUrl(url) {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem("scholarguard_api_url");
    } else {
      localStorage.setItem("scholarguard_api_url", url.trim());
    }
  }
}

// Safe parser to guarantee HTML (like <!doctype html>) never throws a JSON syntax error
async function parseResponseSafely(res) {
  const text = await res.text();
  const trimmed = text.trim();

  // If response is HTML document (e.g. Vercel SPA rewrite fallback)
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    throw new Error("Received HTML instead of JSON from backend. Please ensure the backend server is reachable.");
  }

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const parsedErr = JSON.parse(text);
      if (parsedErr.detail) errorDetail = parsedErr.detail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON received: ${err.message}`);
  }
}

// Resilient fetch with automatic fallback for local development
async function resilientFetch(endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  const primaryUrl = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  try {
    const res = await fetch(primaryUrl, options);
    return res;
  } catch (err) {
    // If relative /api failed on local host, attempt fallback to http://127.0.0.1:8000/api
    if (
      !primaryUrl.includes("127.0.0.1:8000") &&
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      const fallbackUrl = `http://127.0.0.1:8000/api${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
      try {
        const fallbackRes = await fetch(fallbackUrl, options);
        return fallbackRes;
      } catch (_) {}
    }
    throw err;
  }
}

// Pre-packaged offline demo dataset for cloud showcase / Vercel preview
export const DEMO_DATA = {
  status: {
    status: "ONLINE",
    version: "1.0.0 (Cloud Demo)",
    database: "CONNECTED",
    semantic_model: "all-MiniLM-L6-v2",
    indexed_reference_papers: 8,
    total_documents_processed: 12,
    total_analyses_completed: 10,
    is_demo: true
  },
  dashboard: {
    metrics: {
      total_documents_uploaded: 12,
      total_analyses_completed: 10,
      indexed_reference_corpus_size: 8
    },
    recent_analyses: [
      {
        analysis_id: "demo-sample-1",
        document_id: "doc-sample-1",
        filename: "Attention_Mechanisms_in_Modern_NLP.pdf",
        overall_similarity_score: 40.0,
        total_citations: 28,
        citation_issues: 4,
        missing_attributions: 2,
        formatting_issues: 2,
        status: "COMPLETED",
        created_at: "2026-11-15 13:59"
      },
      {
        analysis_id: "demo-sample-2",
        document_id: "doc-sample-2",
        filename: "Deep_Residual_Learning_Empirical_Study.docx",
        overall_similarity_score: 18.0,
        total_citations: 46,
        citation_issues: 0,
        missing_attributions: 0,
        formatting_issues: 0,
        status: "COMPLETED",
        created_at: "2026-11-15 12:53"
      },
      {
        analysis_id: "demo-sample-3",
        document_id: "doc-sample-3",
        filename: "Adaptive_Stochastic_Optimization_Benchmarks.pdf",
        overall_similarity_score: 8.0,
        total_citations: 35,
        citation_issues: 1,
        missing_attributions: 0,
        formatting_issues: 1,
        status: "COMPLETED",
        created_at: "2026-11-15 11:29"
      }
    ]
  },
  sampleReport: {
    "1_document_information": {
      filename: "Attention_Mechanisms_in_Modern_NLP.pdf",
      format: "PDF",
      file_size_bytes: 42100,
      total_passages: 14,
      total_sentences: 32
    },
    "2_overall_similarity_indicator": {
      overall_hybrid_score: 0.40,
      exact_similarity_score: 0.35,
      lexical_similarity_score: 0.38,
      semantic_similarity_score: 0.45,
      interpretation: "Moderate overlap detected with published Transformer literature. Editorial citation audit recommended."
    },
    "3_exact_matching_results": {
      matches: [
        {
          submitted_sentence_index: 3,
          submitted_passage: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.",
          matched_source_passage: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.",
          source_title: "Attention Is All You Need",
          source_authors: "Vaswani et al.",
          source_year: 2017,
          source_doi: "10.48550/arXiv.1706.03762",
          method: "EXACT",
          similarity_score: 1.0
        }
      ]
    },
    "4_lexical_similarity_results": { matches: [] },
    "5_semantic_similarity_results": {
      matches: [
        {
          submitted_sentence_index: 5,
          submitted_passage: "We introduce a novel simple network architecture founded entirely on attention mechanisms, eschewing recurrence and convolutions entirely.",
          matched_source_passage: "We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism.",
          source_title: "Attention Is All You Need",
          source_authors: "Vaswani et al.",
          source_year: 2017,
          source_doi: "10.48550/arXiv.1706.03762",
          method: "SEMANTIC_TRANSFORMER",
          similarity_score: 0.92
        }
      ]
    },
    "6_matched_source_details": [
      {
        source_title: "Attention Is All You Need",
        source_authors: "Vaswani et al.",
        source_year: 2017,
        source_doi: "10.48550/arXiv.1706.03762"
      }
    ],
    "7_citation_verification_results": {
      total_in_text_citations: 28,
      total_references_listed: 26,
      missing_references: [
        { key: "Vaswani et al. (2017)", sentence_index: 3 }
      ],
      unused_references: [],
      references: [
        {
          entry_index: 1,
          raw_text: "Vaswani, A., Shazeer, N., Parmar, N., et al. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30.",
          doi: "10.48550/arXiv.1706.03762",
          year: 2017,
          verification_status: "VERIFIED",
          verification_message: "Verified canonical DOI registered in scholarly graph.",
          external_metadata: {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017
          }
        }
      ]
    },
    "8_missing_attribution_warnings": {
      missing_attributions: [
        {
          sentence_index: 3,
          submitted_passage: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
          matched_source: "Attention Is All You Need",
          recommendation: "Append explicit bibliographic citation tag."
        }
      ]
    },
    "9_citation_formatting_issues": { issues: [] },
    "10_recommended_corrections": [
      "Add parenthetical citation to Vaswani et al. (2017) in Section 2.",
      "Verify canonical DOI links in references section."
    ],
    "11_methodology_and_limitations": {
      framework: "ScholarGuard AI Tri-Tier Similarity Architecture",
      version: "1.0.0"
    },
    report_metadata: {
      generated_at: "2026-11-15 14:00 UTC",
      engine_version: "1.0.0",
      project_id: "CSEAI ML2026-P41"
    }
  }
};

export async function fetchSystemStatus() {
  try {
    const resp = await resilientFetch("/status");
    return await parseResponseSafely(resp);
  } catch (err) {
    // If hosted on Vercel without a backend connected yet, use Demo mode gracefully
    if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
      return DEMO_DATA.status;
    }
    throw err;
  }
}

export async function fetchDashboardData() {
  try {
    const resp = await resilientFetch("/dashboard");
    return await parseResponseSafely(resp);
  } catch (err) {
    if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
      return DEMO_DATA.dashboard;
    }
    throw err;
  }
}

export async function uploadDocument(file, citationStyle = "APA") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("citation_style", citationStyle);

  const resp = await resilientFetch("/upload", {
    method: "POST",
    body: formData,
  });

  return await parseResponseSafely(resp);
}

export async function analyzeDocument(documentId, verifyExternal = true) {
  const resp = await resilientFetch(
    `/analyze/${documentId}?verify_external_apis=${verifyExternal}`,
    { method: "POST" }
  );

  return await parseResponseSafely(resp);
}

export async function fetchAnalysisResult(analysisId) {
  if (analysisId?.startsWith("demo-")) {
    return { report: DEMO_DATA.sampleReport };
  }
  const resp = await resilientFetch(`/analysis/${analysisId}`);
  return await parseResponseSafely(resp);
}

export async function fetchReferenceCorpus() {
  const resp = await resilientFetch("/corpus");
  return await parseResponseSafely(resp);
}

export function getReportDownloadUrl(analysisId) {
  const base = getBaseUrl();
  return `${base}/reports/${analysisId}/download`;
}

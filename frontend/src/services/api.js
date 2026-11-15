// Smart API Base URL:
// If running on Vite dev server (e.g. port 5173), direct requests to FastAPI on port 8000.
// If served directly by FastAPI (port 8000) or anywhere else, use relative /api.
const getBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.port === "5173") {
    return "http://127.0.0.1:8000/api";
  }
  return "/api";
};

const API_BASE_URL = getBaseUrl();

async function resilientFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    // If relative /api failed on another dev host, fallback to http://127.0.0.1:8000/api
    if (!url.startsWith("http")) {
      const fallbackUrl = `http://127.0.0.1:8000${url.startsWith("/") ? url : "/" + url}`;
      try {
        const fallbackRes = await fetch(fallbackUrl, options);
        return fallbackRes;
      } catch (fallbackErr) {
        throw err;
      }
    }
    throw err;
  }
}

export async function fetchSystemStatus() {
  const resp = await resilientFetch(`${API_BASE_URL}/status`);
  if (!resp.ok) throw new Error("Failed to fetch system status");
  return resp.json();
}

export async function fetchDashboardData() {
  const resp = await resilientFetch(`${API_BASE_URL}/dashboard`);
  if (!resp.ok) throw new Error("Failed to fetch dashboard data");
  return resp.json();
}

export async function uploadDocument(file, citationStyle = "APA") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("citation_style", citationStyle);

  const resp = await resilientFetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload document");
  }

  return resp.json();
}

export async function analyzeDocument(documentId, verifyExternal = true) {
  const resp = await resilientFetch(
    `${API_BASE_URL}/analyze/${documentId}?verify_external_apis=${verifyExternal}`,
    { method: "POST" }
  );

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to complete document analysis");
  }

  return resp.json();
}

export async function fetchAnalysisResult(analysisId) {
  const resp = await resilientFetch(`${API_BASE_URL}/analysis/${analysisId}`);
  if (!resp.ok) throw new Error("Failed to fetch analysis record");
  return resp.json();
}

export async function fetchReferenceCorpus() {
  const resp = await resilientFetch(`${API_BASE_URL}/corpus`);
  if (!resp.ok) throw new Error("Failed to fetch reference corpus");
  return resp.json();
}

export function getReportDownloadUrl(analysisId) {
  return `${API_BASE_URL}/reports/${analysisId}/download`;
}

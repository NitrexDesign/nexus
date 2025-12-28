const getBaseUrl = () => {
  // If we're in a chrome extension environment (chrome-extension://)
  // we need a full URL. Otherwise, relative paths are fine.
  const isExtension = window.location.protocol === "chrome-extension:";
  if (isExtension) {
    return localStorage.getItem("nexus_server_url") || "http://localhost:8080";
  }
  return "";
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  
  const res = await fetch(url, options);
  return res;
}

export function resolveUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}


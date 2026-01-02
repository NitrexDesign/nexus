const getBaseUrl = () => {
  const savedUrl = localStorage.getItem("nexus_server_url");
  if (savedUrl) return savedUrl;
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

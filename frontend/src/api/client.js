function computeBase() {
  const { hostname, port } = window.location;

  if (hostname === "localhost" || port === "3000") {
    return "http://localhost:5001/api";
  }

  return `http://${hostname}:5001/api`;
}

const BASE = computeBase();

export async function apiFetch(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!isJson) {
    throw new Error("Unexpected response from server");
  }

  return data;
}

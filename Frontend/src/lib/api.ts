// src/lib/api.ts
export const API_BASE_URL = (() => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.protocol}//${host}:4000`;
    }
  }
  return (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";
})();

export function getAuthToken() {
  return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
}

export function clearAuthToken() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

let logoutInProgress = false;

export function forceLogout(reason: string = "SESSION_EXPIRED") {
  if (logoutInProgress) return;
  logoutInProgress = true;

  clearAuthToken();

  window.dispatchEvent(
    new CustomEvent("auth:logout", { detail: { reason } })
  );

  setTimeout(() => (logoutInProgress = false), 1000);
}

export function authHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json().catch(() => ({}));
  const text = await res.text().catch(() => "");
  return { message: text || `HTTP ${res.status}` };
}

export async function fetchWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  if (!token) {
    forceLogout("NO_TOKEN");
    const err: any = new Error("Missing auth token");
    err.code = "NO_TOKEN";
    err.status = 401;
    throw err;
  }

  const headers = {
    ...authHeaders(),
    ...(init?.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    forceLogout("UNAUTHORIZED");
    const data = await readJsonSafe(res);
    const err: any = new Error(data.message || "Unauthorized");
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const data = await readJsonSafe(res);
    const err: any = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return (await res.json()) as Promise<T>;
}

// apps/web/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type JsonBody = Record<string, any> | undefined;

async function withAuthHeaders(base: HeadersInit = {}) {
  try {
    const { getAuth } = await import("firebase/auth");
    const user = getAuth().currentUser;
    if (!user) return base;
    const token = await user.getIdToken();
    return { ...base, Authorization: `Bearer ${token}` };
  } catch {
    return base;
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const url = `${API_URL}${path}`;

  let headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  if (requireAuth) headers = await withAuthHeaders(headers);

  const res = await fetch(url, { ...init, headers });

  // Try to parse JSON on both success and error for better messages
  const text = await res.text();
  const data = text ? (JSON.parse(text) as any) : undefined;

  if (!res.ok) {
    const message =
      (data && (data.error || data.message || data.details)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return (data as T) ?? ({} as T);
}

// -------- Public helpers (no token) --------
export function apiGet<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, init, false);
}
export function apiPost<T>(path: string, body?: JsonBody, init: RequestInit = {}) {
  return apiFetch<T>(
    path,
    { method: "POST", body: body ? JSON.stringify(body) : undefined, ...init },
    false
  );
}
export function apiDelete<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, { method: "DELETE", ...init }, false);
}

// -------- Auth helpers (send Firebase ID token) --------
export function apiGetAuth<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, { method: "GET", ...init }, true);
}
export function apiPostAuth<T>(path: string, body?: JsonBody, init: RequestInit = {}) {
  return apiFetch<T>(
    path,
    { method: "POST", body: body ? JSON.stringify(body) : undefined, ...init },
    true
  );
}
export function apiDeleteAuth<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, { method: "DELETE", ...init }, true);
}


export function apiPutAuth<T>(path: string, body?: Record<string, any>, init: RequestInit = {}) {
  return apiFetch<T>(
    path,
    { method: "PUT", body: body ? JSON.stringify(body) : undefined, ...init },
    true
  );
}

export function apiPatchAuth<T>(path: string, body: any, init: RequestInit = {}) {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  }, true);
}



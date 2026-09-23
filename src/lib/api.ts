/**
 * Thin wrapper around fetch() for talking to our own Express API.
 * `credentials: 'include'` ensures the session cookie is sent/received --
 * this is what keeps the user logged in. In dev, Vite's proxy (see
 * vite.config.ts) makes /api same-origin with the frontend so the cookie
 * works without any CORS configuration; in production the API and static
 * files are served from the same Express process/port.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response body wasn't JSON; keep the generic message
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: formData });
}

export function apiPutForm<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: 'PUT', body: formData });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

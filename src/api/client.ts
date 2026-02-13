/**
 * API Client — Type-safe HTTP client for the Rust backend.
 * Replaces @supabase/supabase-js with native fetch.
 * Handles JWT token management, auto-refresh on 401, and error handling.
 */

interface ApiError {
  error: string;
  status: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

let tokens: TokenPair | undefined;
let refreshPromise: Promise<void> | undefined;

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    const err: ApiError = { error: body.error || response.statusText, status: response.status };
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

async function refreshAccessToken(): Promise<void> {
  if (!tokens?.refreshToken) throw { error: 'No refresh token', status: 401 };

  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refreshToken }),
  });

  if (!response.ok) {
    tokens = undefined;
    throw { error: 'Session expired', status: 401 };
  }

  const data = await response.json();
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresIn: data.expires_in,
  };
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });

  // Auto-refresh on 401
  if (response.status === 401 && tokens?.refreshToken) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = undefined;
      });
    }
    await refreshPromise;

    // Retry with new token
    const retry = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { ...getHeaders(), ...options.headers },
    });
    return handleResponse<T>(retry);
  }

  return handleResponse<T>(response);
}

export const api = {
  get<T>(url: string): Promise<T> {
    return fetchWithAuth<T>(url, { method: 'GET' });
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return fetchWithAuth<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return fetchWithAuth<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(url: string): Promise<T> {
    return fetchWithAuth<T>(url, { method: 'DELETE' });
  },

  async upload<T>(url: string, file: File, additionalFields?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        formData.append(key, value);
      }
    }

    const headers: Record<string, string> = {};
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse<T>(response);
  },

  setTokens(t: TokenPair) {
    tokens = t;
  },

  clearTokens() {
    tokens = undefined;
  },

  getAccessToken(): string | undefined {
    return tokens?.accessToken;
  },

  isAuthenticated(): boolean {
    return !!tokens?.accessToken;
  },
};

import type { ApiError, ApiResponse, HealthStatus } from '@aura/shared';

/**
 * Base URL for API calls. Empty by default so requests are same-origin and
 * routed through the Vite dev proxy (see vite.config.ts) — this keeps the
 * httpOnly refresh cookie flowing without cross-site credential issues.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Error thrown by the API client, carrying the HTTP status and field errors. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly errors: ApiError[] | null;

  constructor(message: string, status: number, errors: ApiError[] | null = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

// ── In-memory access token (never persisted to localStorage/sessionStorage) ──
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Single-flight refresh ────────────────────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;

/** Attempt to refresh the access token using the httpOnly refresh cookie. */
async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
    if (body.status !== 'success' || !body.data?.accessToken) return false;
    setAccessToken(body.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

/** Ensure only one refresh request runs at a time (prevents stampedes). */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Authenticated JSON request. On a 401 it performs a single-flight refresh and
 * retries the original request exactly once — never looping.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  allowRetry = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && allowRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, options, false); // retry once only
    }
    setAccessToken(null);
    throw new ApiClientError('Unauthorized', 401);
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body || body.status !== 'success') {
    throw new ApiClientError(
      body?.message ?? `Request failed: ${res.status}`,
      res.status,
      body?.errors ?? null,
    );
  }
  return body.data as T;
}

/** Fetch the backend health status (public endpoint). */
/**
 * Subscribes to a server-sent-event endpoint. EventSource cannot carry the bearer
 * token, so this reads the stream over fetch. Returns an unsubscribe function.
 */
export function subscribeToEvents(
  path: string,
  onEvent: (event: string, data: unknown) => void,
): () => void {
  const controller = new AbortController();

  void (async () => {
    try {
      const headers: Record<string, string> = { accept: 'text/event-stream' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const event = /^event: (.*)$/m.exec(frame)?.[1];
          const raw = /^data: (.*)$/m.exec(frame)?.[1];
          if (!event) continue;
          try {
            onEvent(event, raw ? JSON.parse(raw) : null);
          } catch {
            // A malformed frame must not tear down the subscription.
          }
        }
      }
    } catch {
      // Aborts and dropped connections are expected; persistence stays authoritative.
    }
  })();

  return () => controller.abort();
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  const body = (await res.json()) as ApiResponse<HealthStatus>;
  if (body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Unexpected response');
  }
  return body.data;
}

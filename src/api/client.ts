const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

interface RequestOptions {
  method?: string;
  body?: unknown;
  sessionId?: string;
  turnstileSession?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, sessionId, turnstileSession } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }
  if (turnstileSession) {
    headers["X-Turnstile-Session"] = turnstileSession;
  }

  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok) {
    const err = json as { error: string; message: string };
    throw new ApiRequestError(err.error, err.message, res.status);
  }

  return (json as { data: T }).data;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export const apiClient = {
  get: <T>(path: string, opts?: Pick<RequestOptions, "sessionId">) =>
    request<T>(path, { ...opts }),

  post: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, "sessionId" | "turnstileSession">) =>
    request<T>(path, { method: "POST", body, ...opts }),

  put: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, "sessionId" | "turnstileSession">) =>
    request<T>(path, { method: "PUT", body, ...opts }),

  delete: <T>(path: string, opts?: Pick<RequestOptions, "sessionId" | "turnstileSession">) =>
    request<T>(path, { method: "DELETE", ...opts }),
};

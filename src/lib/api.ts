// Shared API client. Every request goes through here so error handling, JSON
// (de)serialization, and cookie credentials are consistent instead of each
// component reimplementing fetch() + try/catch on its own.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // no/invalid JSON body — leave data as null
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Erro de comunicação com o servidor.', res.status);
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, options?: ApiOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T = any>(path: string, body?: unknown, options?: ApiOptions) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T = any>(path: string, body?: unknown, options?: ApiOptions) => request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T = any>(path: string, options?: ApiOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

import { clearSession, getAccessToken, getRefreshToken, saveTokens } from '../auth';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: BodyInit | null;
  retry?: boolean;
};

let refreshing: Promise<boolean> | null = null;

function messageOf(body: unknown, status: number) {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join('；');
    if (typeof message === 'string' && message) return message;
  }
  return `请求失败（${status}）`;
}

async function readBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const body = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
        };
        if (!body.accessToken || !body.refreshToken) return false;
        saveTokens(body.accessToken, body.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });

  if (
    response.status === 401 &&
    options.retry !== false &&
    path !== '/auth/login' &&
    path !== '/auth/refresh'
  ) {
    const refreshed = await refreshTokens();
    if (refreshed) return api<T>(path, { ...options, retry: false });
    clearSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }

  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, messageOf(body, response.status));
  }
  return body as T;
}

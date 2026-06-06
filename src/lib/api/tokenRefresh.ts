import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string | null;
}

type RefreshTokenGetter = () => string | null | undefined;
type RefreshHandler = (tokens: AuthTokens) => void;
type LogoutHandler = () => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function parseTokenNode(node: unknown, depth = 0): AuthTokens | null {
  if (!isRecord(node) || depth > 3) return null;

  const accessToken = firstString(
    node.accessToken,
    node.token,
    node.access_token,
    node.jwt,
  );
  const refreshToken = firstString(node.refreshToken, node.refresh_token, node.refresh);

  if (accessToken) {
    return {
      accessToken,
      refreshToken: refreshToken ?? null,
    };
  }

  const nextKeys = ['data', 'result', 'response', 'payload', 'admin', 'user'] as const;
  for (const key of nextKeys) {
    const found = parseTokenNode(node[key], depth + 1);
    if (found) return found;
  }

  return null;
}

export function parseAuthTokens(body: unknown): AuthTokens | null {
  return parseTokenNode(body);
}

interface RefreshInterceptorOptions {
  refreshPath?: string;
  refreshRequestData?: (refreshToken: string) => unknown;
  refreshRequestHeaders?: Record<string, string>;
}

export function attachTokenRefreshInterceptor(
  api: AxiosInstance,
  getRefreshToken: RefreshTokenGetter,
  onRefreshed: RefreshHandler,
  onLogout: LogoutHandler,
  options: RefreshInterceptorOptions = {},
) {
  const refreshPath = options.refreshPath ?? '/auth/refresh';
  let inFlight: Promise<AuthTokens | null> | null = null;

  const refreshTokens = async (): Promise<AuthTokens | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    if (!inFlight) {
      inFlight = (async () => {
        try {
          const res = await api.post(
            refreshPath,
            options.refreshRequestData?.(refreshToken) ?? { refreshToken },
            { headers: options.refreshRequestHeaders },
          );
          return parseAuthTokens(res.data);
        } catch {
          return null;
        } finally {
          inFlight = null;
        }
      })();
    }

    return inFlight;
  };

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

      if (!original || status !== 401 || original._retry || original.url?.includes(refreshPath)) {
        return Promise.reject(error);
      }

      original._retry = true;
      const tokens = await refreshTokens();

      if (!tokens?.accessToken) {
        onLogout();
        return Promise.reject(error);
      }

      onRefreshed(tokens);
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${tokens.accessToken}`;

      return api.request(original);
    },
  );
}

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/constants';
import { store } from '@/redux/store';
import { setAccessToken, logout } from '@/redux/slices/authSlice';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the httpOnly refresh-token cookie
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Automatic refresh on 401 ─────────────────────────────────
// Concurrent 401s share one refresh request; on refresh failure the
// session is cleared and the user lands back on /login.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<{ data: { accessToken: string } }>(
    `${API_URL}/auth/refresh-token`,
    {},
    { withCredentials: true },
  );
  return data.data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        store.dispatch(setAccessToken(token));
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from any API error. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

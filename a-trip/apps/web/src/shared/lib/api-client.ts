import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorBody, ApiResponse } from '../interfaces/api';

/**
 * No longer the session credential — the API authenticates browser requests
 * from an httpOnly cookie it sets on login (see the API's session-cookie.ts),
 * which `apiClient`'s `withCredentials` below sends automatically. This key
 * now caches only the admin's token for the Next.js cache-purge ping in
 * use-site-content.ts, which cannot read an httpOnly cookie itself; it is
 * never attached to a request here.
 */
export const AUTH_TOKEN_KEY = 'a-trip.admin.revalidateToken';

/** Thrown for every failed request so callers get one consistent shape. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
  // Lets the browser attach the httpOnly session cookie to every request.
  // Which of the two scoped cookies (admin vs guest) actually goes out is
  // decided by the request's own path, not by anything this client does.
  withCredentials: true,
});

/**
 * A cached user surviving past its cookie's expiry (or a revoked session) is
 * only caught the next time that scope calls the API — there is no other
 * signal a plain cookie gives up. Clearing the matching store on a 401 is
 * what turns that failed request into an actual sign-out instead of a page
 * that keeps rendering as if it were still authenticated. Imported lazily to
 * dodge a load-order cycle: the auth module's hooks import this file too.
 */
function clearSessionOn401(url: string | undefined) {
  const isAdminRequest = (url ?? '').replace(/^\/+/, '').startsWith('admin');
  void import('../../modules/auth/stores/session.store').then(
    ({ useAdminSessionStore, useUserSessionStore }) => {
      (isAdminRequest ? useAdminSessionStore : useUserSessionStore).getState().clear();
    },
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response) {
      const body = error.response.data;
      const message =
        body && typeof body.message === 'string'
          ? body.message
          : 'Something went wrong. Please try again.';
      if (error.response.status === 401) {
        clearSessionOn401(error.config?.url);
      }
      return Promise.reject(new ApiError(message, error.response.status, body?.errors));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('The request timed out. Please try again.', 408));
    }
    return Promise.reject(
      new ApiError('Cannot reach the server. Check your connection and try again.', 0),
    );
  },
);

/** Unwraps the { success, data } envelope so callers work with plain data. */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  return data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body);
  return data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiResponse<T>>(url, body);
  return data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<ApiResponse<T>>(url);
  return data.data;
}

/**
 * Multipart upload. The Content-Type header is deleted rather than set: the
 * browser has to generate it itself so it can append the multipart boundary.
 * Uploads also get a longer timeout than the 20s default for JSON calls.
 */
export async function apiUpload<T>(
  url: string,
  files: File[],
  field = 'files',
  onProgress?: (percent: number) => void,
): Promise<T> {
  const form = new FormData();
  files.forEach((file) => form.append(field, file));

  const { data } = await apiClient.post<ApiResponse<T>>(url, form, {
    headers: { 'Content-Type': undefined },
    timeout: 120_000,
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data.data;
}

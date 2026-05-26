import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/auth';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://schoolmate.digitalleadpro.com/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, activeSchoolId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (activeSchoolId) config.headers['X-School-ID'] = activeSchoolId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ success: false; code: string; message: string }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export type ApiOk<T> = { success: true; data: T; meta?: PaginatedMeta };
export type ApiErr = { success: false; code: string; message: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Unwraps the {success, data} envelope. Throws on api-level failure. */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  const body = res.data;
  if (body.success) return body.data;
  throw new Error(body.message || 'API error');
}

import { isAxiosError } from 'axios';

export interface ApiErrorBody {
  error?: string;
  details?: Record<string, unknown>;
}

// Cuerpo de error que devuelve la API de LiteCMS ({ error, details })
export const apiErrorBody = (error: unknown): ApiErrorBody =>
  isAxiosError<ApiErrorBody>(error) ? error.response?.data ?? {} : {};

export const apiErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;

export const apiErrorMessage = (error: unknown, fallback: string): string =>
  apiErrorBody(error).error || fallback;

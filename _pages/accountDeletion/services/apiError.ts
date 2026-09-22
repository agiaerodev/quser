type UnknownRecord = Record<string, any>;

export class ApiError extends Error {
  retryAfterSeconds: number | null;

  constructor(message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const firstString = (...values: any[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const fromErrors = (errors: any): string | null => {
  if (!errors) {
    return null;
  }

  if (typeof errors === 'string') {
    return errors.trim() || null;
  }

  if (Array.isArray(errors)) {
    return firstString(...errors.map((item) => fromErrors(item)));
  }

  if (typeof errors === 'object') {
    return firstString(
      errors.message,
      ...Object.values(errors as UnknownRecord).map((item) => fromErrors(item)),
    );
  }

  return null;
};

const getPayload = (error: any): UnknownRecord =>
  error?.response?.data ?? error?.data ?? error ?? {};

/**
 * Extract a readable message from the API response of a failed request.
 * Backend answers with shapes like { data: { message } }, { errors } or { messages: [{ message }] }.
 */
export const getApiErrorMessage = (error: any, fallback: string): string => {
  const payload = getPayload(error);

  return (
    firstString(
      payload?.data?.message,
      payload?.message,
      fromErrors(payload?.errors),
      fromErrors(payload?.messages),
      typeof error === 'string' ? error : null,
    ) ?? fallback
  );
};

const toPositiveSeconds = (value: any): number | null => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.ceil(parsed);
};

/**
 * The backend may nest retry_after_seconds inside data, errors or messages,
 * so the value is searched recursively through the payload.
 */
const findRetryAfter = (source: any, depth = 0): number | null => {
  if (!source || typeof source !== 'object' || depth > 6) {
    return null;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findRetryAfter(item, depth + 1);
      if (found) return found;
    }

    return null;
  }

  const direct = toPositiveSeconds(
    source.retry_after_seconds ?? source.retryAfterSeconds ?? source['retry-after'],
  );

  if (direct) {
    return direct;
  }

  for (const value of Object.values(source as UnknownRecord)) {
    const found = findRetryAfter(value, depth + 1);
    if (found) return found;
  }

  return null;
};

/**
 * Seconds the backend asks to wait before requesting a new PIN.
 */
export const getRetryAfterSeconds = (source: any): number | null => {
  const headerRetry = toPositiveSeconds(
    source?.response?.headers?.['retry-after'] ?? source?.headers?.['retry-after'],
  );

  if (headerRetry) {
    return headerRetry;
  }

  return findRetryAfter(getPayload(source));
};

/**
 * Some endpoints answer with a 200 status but flag the failure inside the payload.
 */
export const assertSuccessPayload = (payload: any, fallback: string) => {
  const data = payload?.data ?? payload ?? {};
  const isSuccess = data.is_success ?? data.isSuccess;

  if (isSuccess === false) {
    throw new ApiError(
      firstString(data.message) ?? fallback,
      getRetryAfterSeconds(payload),
    );
  }

  return payload;
};

export const toApiError = (error: any, fallback: string): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(getApiErrorMessage(error, fallback), getRetryAfterSeconds(error));
};

export default getApiErrorMessage;

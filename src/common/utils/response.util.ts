export interface IOneResponse<T = any> {
  is_error: boolean;
  code: string;
  message: string;
  data: T | null | undefined;
  error: Record<string, any> | null | undefined;
  status_code: number;
}

export interface IManyResponse<T = any> {
  is_error: boolean;
  code: string;
  message: string;
  total: number;
  data: T[] | null;
  error: Record<string, any> | null;
  status_code: number;
}

// Success (single resource)
export function handleSuccessOne<T>(params: {
  code?: string;
  message?: string;
  data?: T | null;
  statusCode?: number;
}): IOneResponse<T> {
  const {
    code = 'SUCCESS',
    message = 'Success',
    data = null,
    statusCode = 200,
  } = params;
  return {
    is_error: false,
    code,
    message,
    data,
    error: null,
    status_code: statusCode,
  };
}

// Success (multiple resources / list)
export function handleSuccessMany<T>(params: {
  code?: string;
  message?: string;
  data?: T[] | null;
  total?: number;
  statusCode?: number;
}): IManyResponse<T> {
  const {
    code = 'SUCCESS',
    message = 'Success',
    data = null,
    total = Array.isArray(data) ? data.length : 0,
    statusCode = 200,
  } = params;
  return {
    is_error: false,
    code,
    message,
    data,
    total,
    error: null,
    status_code: statusCode,
  };
}

// Error handler
export function handleError(params: {
  code?: string;
  message?: string;
  error?: unknown;
  statusCode?: number;
}): IOneResponse<null> {
  const {
    code = 'ERROR',
    message = 'Error',
    error = null,
    statusCode = 400,
  } = params;
  let normalizedError: Record<string, any> | null = null;
  if (error) {
    if (typeof error === 'object') {
      normalizedError = error as Record<string, any>;
    } else {
      try {
        normalizedError = { message: JSON.stringify(error) };
      } catch {
        normalizedError = {
          message:
            typeof error === 'string' || typeof error === 'number'
              ? String(error)
              : 'Unknown error',
        };
      }
    }
  }
  return {
    is_error: true,
    code,
    message,
    data: null,
    error: normalizedError,
    status_code: statusCode,
  };
}

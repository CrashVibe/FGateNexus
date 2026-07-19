import type { ApiResponse } from "#shared/model";

/** 后端返回非 2xx 时抛出，携带状态码与后端错误信息。 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code?: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

const buildUrl = (path: string, query?: RequestOptions["query"]): string => {
  if (!query) {
    return path;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

/** 非 2xx 抛 {@link ApiRequestError}（沿用后端 message）。 */
const parseApiResponse = async <T>(
  response: Response,
): Promise<ApiResponse<T>> => {
  let parsed: ApiResponse<T> | undefined;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    const message = parsed?.message ?? response.statusText;
    const code = (parsed as { code?: number } | undefined)?.code;
    const errors = (parsed as { errors?: Record<string, string[]> } | undefined)
      ?.errors;
    throw new ApiRequestError(message, response.status, code, errors);
  }

  return parsed ?? { message: "" };
};

/**
 * 统一请求封装：发送 JSON、携带同源 Cookie（会话），解析 `ApiResponse`。
 * 非 2xx 抛 {@link ApiRequestError}（沿用后端 `message`），与 TanStack Query 协作。
 */
export const request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> => {
  const { method = "GET", body, query } = options;
  const hasBody = body !== undefined;
  const response = await fetch(buildUrl(path, query), {
    body: hasBody ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    method,
  });

  return await parseApiResponse<T>(response);
};

/** 不手动设置 content-type：浏览器自动加 boundary。 */
export const uploadFile = async <T>(
  path: string,
  file: File,
  field = "file",
): Promise<ApiResponse<T>> => {
  const form = new FormData();
  form.set(field, file);
  const response = await fetch(path, {
    body: form,
    credentials: "same-origin",
    method: "POST",
  });

  return await parseApiResponse<T>(response);
};

export const throwIfNotOk = async (response: Response): Promise<void> => {
  if (response.ok) {
    return;
  }
  let message = response.statusText;
  try {
    const parsed = (await response.json()) as { message?: string };
    message = parsed.message ?? message;
  } catch {
    /* 非 JSON，保留 statusText */
  }
  throw new ApiRequestError(message, response.status);
};

/** 从任意错误中提取面向用户的提示文本。 */
export const errorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

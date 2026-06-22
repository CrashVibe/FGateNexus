import type { ZodError } from "zod";

/**
 * API 错误响应模型，用于 OpenAPI 文档
 */
export interface ApiErrorResponse {
  /** HTTP 状态码 */
  code: ApiErrorType;
  /** 错误信息 */
  message: string;
  /** 错误详情 */
  errors?: Record<string, string[]>;
}

/**
 * API 错误类型枚举
 */
export enum ApiErrorType {
  Database = 50_001,
  Validation = 50_002,
  NotFound = 50_005,
  Conflict = 50_006,
  Internal = 50_007,
  BadRequest = 50_008,
  Unauthorized = 50_009,
  TooManyRequests = 50_012,
}

/** ZodError → 按路径聚合 */
export const flattenZodError = (
  zodError: ZodError,
): Record<string, string[]> => {
  const validationErrors: Record<string, string[]> = {};
  for (const issue of zodError.issues) {
    const path = issue.path.join(".");
    validationErrors[path] ??= [];
    validationErrors[path].push(issue.message);
  }
  return validationErrors;
};

/**
 * API 错误类
 */
export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(
    type: ApiErrorType,
    message: string,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.type = type;
    this.name = "ApiError";
    this.status = this.getStatusCode();
    this.errors = errors;
  }

  /**
   * 静态工厂方法
   */
  static database(message: string): ApiError {
    return new ApiError(ApiErrorType.Database, message);
  }

  static validation(message: string, zodError?: ZodError): ApiError {
    return new ApiError(
      ApiErrorType.Validation,
      message,
      zodError ? flattenZodError(zodError) : undefined,
    );
  }

  static notFound(message: string): ApiError {
    return new ApiError(ApiErrorType.NotFound, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(ApiErrorType.Conflict, message);
  }

  static internal(message: string): ApiError {
    return new ApiError(ApiErrorType.Internal, message);
  }

  static badRequest(message: string): ApiError {
    return new ApiError(ApiErrorType.BadRequest, message);
  }

  static unauthorized(message: string): ApiError {
    return new ApiError(ApiErrorType.Unauthorized, message);
  }

  static tooManyRequests(message: string): ApiError {
    return new ApiError(ApiErrorType.TooManyRequests, message);
  }

  /**
   * 转换为响应对象
   */
  toResponse(): ApiErrorResponse {
    let errorMessage = this.message;

    // 对于内部错误，不暴露具体错误信息
    if (
      this.type === ApiErrorType.Database ||
      this.type === ApiErrorType.Internal
    ) {
      console.error(`${this.type} error:`, this.message);
      errorMessage =
        this.type === ApiErrorType.Database
          ? "Database error"
          : "Internal server error";
    }

    return {
      code: this.type,
      errors: this.errors,
      // 可选
      message: errorMessage,
    };
  }

  /**
   * 根据错误类型获取对应的 HTTP 状态码
   */
  private getStatusCode(): number {
    const statusMap: Record<ApiErrorType, number> = {
      [ApiErrorType.Database]: 500,
      [ApiErrorType.Validation]: 400,
      [ApiErrorType.NotFound]: 404,
      [ApiErrorType.Conflict]: 409,
      [ApiErrorType.TooManyRequests]: 429,
      [ApiErrorType.Internal]: 500,
      [ApiErrorType.BadRequest]: 400,
      [ApiErrorType.Unauthorized]: 401,
    };

    return statusMap[this.type] || 500;
  }
}

/**
 * 构造错误响应体。HTTP 状态码取自 `error.status`，由调用方在 Hono 里通过
 * `c.json(body, error.status)` 设置。
 */
export const createErrorResponse = (
  error: ApiError,
  zodError?: ZodError,
): ApiErrorResponse => {
  const response = error.toResponse();

  if (zodError) {
    response.errors = flattenZodError(zodError);
  }

  return response;
};

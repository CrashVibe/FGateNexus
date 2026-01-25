import { type EventHandlerRequest, type H3Event, setResponseStatus } from "h3";
import type { ZodError } from "zod";

/**
 * API 错误响应模型，用于 OpenAPI 文档
 */
export interface ApiErrorResponse {
  /** HTTP 状态码 */
  code: number;
  /** 错误信息 */
  message: string;
  /** 错误详情 */
  errors?: Record<string, string[]>;
}

/**
 * API 错误类型枚举
 */
export enum ApiErrorType {
  Database = "Database",
  Validation = "Validation",
  Authentication = "Authentication",
  Authorization = "Authorization",
  NotFound = "NotFound",
  Conflict = "Conflict",
  Internal = "Internal",
  BadRequest = "BadRequest",
  Unauthorized = "Unauthorized",
  Forbidden = "Forbidden",
  InternalServerError = "InternalServerError",
  TooManyRequests = "TooManyRequests"
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(type: ApiErrorType, message: string, errors?: Record<string, string[]>) {
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

  static validation(message: string): ApiError {
    return new ApiError(ApiErrorType.Validation, message);
  }

  static authentication(message: string): ApiError {
    return new ApiError(ApiErrorType.Authentication, message);
  }

  static authorization(message: string): ApiError {
    return new ApiError(ApiErrorType.Authorization, message);
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

  static forbidden(message: string): ApiError {
    return new ApiError(ApiErrorType.Forbidden, message);
  }

  static internalServerError(message: string): ApiError {
    return new ApiError(ApiErrorType.InternalServerError, message);
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
      this.type === ApiErrorType.Internal ||
      this.type === ApiErrorType.InternalServerError
    ) {
      console.error(`${this.type} error:`, this.message);
      errorMessage = this.type === ApiErrorType.Database ? "Database error" : "Internal server error";
    }

    return {
      message: errorMessage,
      code: this.status,
      errors: this.errors // 可选
    };
  }

  /**
   * 根据错误类型获取对应的 HTTP 状态码
   */
  private getStatusCode(): number {
    const statusMap: Record<ApiErrorType, number> = {
      [ApiErrorType.Database]: 500,
      [ApiErrorType.Validation]: 400,
      [ApiErrorType.Authentication]: 401,
      [ApiErrorType.Authorization]: 403,
      [ApiErrorType.NotFound]: 404,
      [ApiErrorType.Conflict]: 409,
      [ApiErrorType.TooManyRequests]: 429,
      [ApiErrorType.Internal]: 500,
      [ApiErrorType.BadRequest]: 400,
      [ApiErrorType.Unauthorized]: 401,
      [ApiErrorType.Forbidden]: 403,
      [ApiErrorType.InternalServerError]: 500
    };

    return statusMap[this.type] || 500;
  }
}

/**
 * API 结果类型
 */
export type ApiResult<T> = Promise<T>;

export function createErrorResponse(
  event: H3Event<EventHandlerRequest>,
  error: ApiError,
  zodError?: ZodError
): ApiErrorResponse {
  setResponseStatus(event, error.status);
  const response = error.toResponse();

  if (zodError) {
    const validationErrors: Record<string, string[]> = {};
    zodError.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!validationErrors[path]) {
        validationErrors[path] = [];
      }
      validationErrors[path].push(issue.message);
    });
    response.errors = validationErrors;
  }

  return response;
}

/**
 * 错误处理中间件辅助函数
 */
export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return ApiError.internal(error.message);
  }

  return ApiError.internal("Unknown error occurred");
}

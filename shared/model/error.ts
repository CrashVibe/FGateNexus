import type { EventHandlerRequest, H3Event } from "h3";
import { setResponseStatus } from "h3";
import { FetchError } from "ofetch";
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
  Authentication = 50_003,
  Authorization = 50_004,
  NotFound = 50_005,
  Conflict = 50_006,
  Internal = 50_007,
  BadRequest = 50_008,
  Unauthorized = 50_009,
  Forbidden = 50_010,
  InternalServerError = 50_011,
  TooManyRequests = 50_012,
}

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
      [ApiErrorType.Authentication]: 401,
      [ApiErrorType.Authorization]: 403,
      [ApiErrorType.NotFound]: 404,
      [ApiErrorType.Conflict]: 409,
      [ApiErrorType.TooManyRequests]: 429,
      [ApiErrorType.Internal]: 500,
      [ApiErrorType.BadRequest]: 400,
      [ApiErrorType.Unauthorized]: 401,
      [ApiErrorType.Forbidden]: 403,
      [ApiErrorType.InternalServerError]: 500,
    };

    return statusMap[this.type] || 500;
  }
}

export const createErrorResponse = (
  event: H3Event<EventHandlerRequest>,
  error: ApiError,
  zodError?: ZodError,
): ApiErrorResponse => {
  setResponseStatus(event, error.status);
  const response = error.toResponse();

  if (zodError) {
    const validationErrors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const path = issue.path.join(".");
      validationErrors[path] ??= [];
      validationErrors[path].push(issue.message);
    }
    response.errors = validationErrors;
  }

  return response;
};

export const isFetchError = (
  err: unknown,
): err is FetchError<ApiErrorResponse> => err instanceof FetchError;

import type { ZodType } from "zod";

export type ApiSchemaRegistry = Partial<
  Record<
    string,
    {
      description?: string;
      request: ZodType;
      response: ZodType;
    }
  >
>;

export interface ApiResponse<T = unknown> {
  code?: number;
  message: string;
  data?: T;
}

/**
 * 构造成功响应体（框架无关）。HTTP 状态码由调用方在 Hono 里通过
 * `c.json(body, status)` 指定。
 */
export const createApiResponse = <T>(
  message = "请求成功",
  data?: T,
): ApiResponse<T> => ({
  data,
  message,
});

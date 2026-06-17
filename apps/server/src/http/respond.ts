import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError, ZodType, z } from "zod";

import { logger } from "#server/utils/logger";
import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";

/** 统一响应工具 —— 把 `packages/shared` 里框架无关的响应体构造器接到 Hono。 */
export const ok = <T>(
  c: Context,
  message: string,
  status = 200,
  data?: T,
): Response =>
  c.json(createApiResponse(message, data), status as ContentfulStatusCode);

export const fail = (
  c: Context,
  error: ApiError,
  zodError?: ZodError,
): Response =>
  c.json(
    createErrorResponse(error, zodError),
    error.status as ContentfulStatusCode,
  );

/** 安全读取 JSON 请求体（非法/空体返回 undefined，交由 Zod 校验报错）。 */
export const readJson = async (c: Context): Promise<unknown> => {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
};

/** 校验请求体，失败抛 ApiError.validation */
export const parseBody = async <S extends ZodType>(
  c: Context,
  schema: S,
  message = "请求参数错误",
): Promise<z.infer<S>> => {
  const parsed = schema.safeParse(await readJson(c));
  if (!parsed.success) {
    throw ApiError.validation(message, parsed.error);
  }
  return parsed.data;
};

/** 全局错误兜底：ApiError 按其状态返回，其余按 500 内部错误。 */
export const errorHandler = (err: Error, c: Context): Response => {
  if (err instanceof ApiError) {
    return fail(c, err);
  }
  logger.error(err, "未处理的请求错误");
  return fail(c, ApiError.internal("服务器内部错误"));
};

/**
 * 包裹一个处理器：抛出的 ApiError 按其状态返回，其它异常按给定的内部错误信息
 * 记录并返回 500
 */
export const guard =
  (internalMessage: string, handler: (c: Context) => Promise<Response>) =>
  async (c: Context): Promise<Response> => {
    try {
      return await handler(c);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(c, error);
      }
      logger.error(error, internalMessage);
      return fail(c, ApiError.internal(internalMessage));
    }
  };

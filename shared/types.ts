import { setResponseStatus } from "h3";
import type { EventHandlerRequest, H3Event } from "h3";

export interface ApiResponse<T = unknown> {
  code?: number;
  message: string;
  data?: T;
}

export const createApiResponse = <T>(
  event: H3Event<EventHandlerRequest>,
  message = "请求成功",
  statusCode = 200,
  data?: T,
): ApiResponse<T> => {
  setResponseStatus(event, statusCode);
  return {
    data,
    message,
  };
};

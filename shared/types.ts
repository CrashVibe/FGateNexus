import type { ApiErrorResponse } from "./error";
import { type EventHandlerRequest, type H3Event, setResponseStatus } from "h3";

export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data?: T;
}

export type ApiResponseType = ApiResponse | ApiErrorResponse;

export function createApiResponse<T>(
    event: H3Event<EventHandlerRequest>,
    message = "请求成功",
    code = 200,
    data?: T
): ApiResponse<T> {
    setResponseStatus(event, code);
    return {
        code,
        message,
        data
    };
}

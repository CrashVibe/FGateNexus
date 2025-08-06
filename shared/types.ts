export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data?: T;
}

export function createApiResponse<T>(message = "请求成功", code = 200, data?: T): ApiResponse<T> {
    return {
        code,
        message,
        data
    };
}

import type { AdapterInternal, Peer } from "crossws";
import type { JsonRpcRequest } from "./types";
import { pluginBridge } from "./MCWSBridge";

/**
 * WebSocket 请求处理器基类
 */
export abstract class RequestHandler {
    /**
     * 获取处理器支持的方法名
     */
    abstract getMethod(): string;

    /**
     * 处理请求的抽象方法
     * @param request - JSON-RPC 请求对象
     * @param peer - WebSocket 连接
     */
    abstract handleRequest(request: JsonRpcRequest, peer: Peer<AdapterInternal>): Promise<void> | void;

    /**
     * 发送错误响应
     * @param peer - WebSocket 连接
     * @param id - 请求 ID
     * @param code - 错误代码
     * @param message - 错误消息
     * @param data - 附加数据
     */
    protected sendError(
        peer: Peer<AdapterInternal>,
        id: string | null,
        code: number,
        message: string,
        data?: unknown
    ): void {
        pluginBridge.sendError(peer, id, code, message, data);
    }

    protected sendSuccessResponse(peer: Peer<AdapterInternal>, id: string | null, result?: unknown): void {
        pluginBridge.sendResponse(peer, id, result);
    }
}

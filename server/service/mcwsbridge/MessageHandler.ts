import type { AdapterInternal, Peer } from "crossws";
import type { JsonRpcRequest, JsonRpcResponse, PendingRequest } from "./types";
import { v4 as uuidv4 } from "uuid";
import { isValidJsonRpcResponse } from "./utils";
import { requestDispatcher } from "./RequestDispatcher";

/**
 * 消息处理器
 * 负责处理 JSON-RPC 消息的解析、验证和分发
 */
export class MessageHandler {
    private pendingRequests = new Map<string, PendingRequest>();

    /**
     * 处理 WebSocket 消息
     *
     * @param peer - WebSocket 连接
     * @param message - 收到的消息
     */
    public async handleMessage(peer: Peer<AdapterInternal>, message: string): Promise<void> {
        try {
            const data = JSON.parse(message);

            // 验证 JSON-RPC 格式
            if (data.jsonrpc !== "2.0") {
                this.sendError(peer, data.id, -32600, "Invalid Request");
                return;
            }

            // 检查是否是响应消息
            if (isValidJsonRpcResponse(data)) {
                this.handleResponse(data);
                return;
            }

            // 分发请求到对应的处理器
            await requestDispatcher.dispatch(data, peer);
        } catch (error) {
            console.error(`[ERROR] 处理消息失败: ${peer.id}`, error);
            this.sendError(peer, null, -32700, "Parse error");
        }
    }

    /**
     * 发送请求并等待响应
     *
     * @param peer - WebSocket 连接
     * @param method - 请求方法
     * @param params - 请求参数
     * @param timeout - 超时时间（毫秒），默认 10 秒
     * @returns Promise 返回响应结果
     */
    public sendRequest<T = unknown, P = unknown>(
        peer: Peer<AdapterInternal>,
        method: string,
        params?: P,
        timeout: number = 10000
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = uuidv4();
            const request: JsonRpcRequest<P> = {
                jsonrpc: "2.0",
                method,
                params,
                id
            };

            // 设置超时
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timeout: ${method} (${timeout}ms)`));
            }, timeout);

            // 存储待处理的请求
            this.pendingRequests.set(id, {
                resolve: (value: unknown) => resolve(value as T),
                reject,
                timeout: timeoutHandle,
                peerId: peer.id
            });

            try {
                peer.send(JSON.stringify(request));
                console.debug(`[SEND] 请求已发送: ${peer.id} - ${method} (ID: ${id})`);
            } catch (error) {
                clearTimeout(timeoutHandle);
                this.pendingRequests.delete(id);
                reject(error);
            }
        });
    }

    /**
     * 发送通知消息
     *
     * @param peer - WebSocket 连接
     * @param method - 通知方法
     * @param params - 通知参数
     */
    public sendNotification<P = unknown>(peer: Peer<AdapterInternal>, method: string, params?: P): void {
        const notification: JsonRpcRequest<P> = {
            jsonrpc: "2.0",
            method,
            params,
            id: null
        };
        try {
            peer.send(JSON.stringify(notification));
            console.debug(`[NOTIFY] 通知已发送: ${peer.id} - ${method}`);
        } catch (error) {
            console.error(`[FAILED] 发送通知失败: ${peer.id} - ${method}`, error);
        }
    }

    /**
     * 发送成功响应
     *
     * @param peer - WebSocket 连接
     * @param id - 请求 ID
     * @param result - 响应结果
     */
    public sendResponse(peer: Peer<AdapterInternal>, id: string | null, result?: unknown): void {
        const response: JsonRpcResponse = {
            jsonrpc: "2.0",
            result,
            id
        };

        try {
            peer.send(JSON.stringify(response));
            console.debug(`[SUCCESS] 响应已发送: ${peer.id} - ID: ${id}`);
        } catch (error) {
            console.error(`[FAILED] 发送响应失败: ${peer.id}`, error);
        }
    }

    /**
     * 发送错误响应
     *
     * @param peer - WebSocket 连接
     * @param id - 请求 ID
     * @param code - 错误代码
     * @param message - 错误消息
     * @param data - 附加数据
     */
    public sendError(
        peer: Peer<AdapterInternal>,
        id: string | null,
        code: number,
        message: string,
        data?: unknown
    ): void {
        const response: JsonRpcResponse = {
            jsonrpc: "2.0",
            id,
            error: { code, message, data }
        };

        try {
            peer.send(JSON.stringify(response));
            console.warn(`[ERROR] 错误响应已发送: ${peer.id} - ${code}: ${message} (ID: ${id})`);
        } catch (error) {
            console.error(`[FAILED] 发送错误响应失败: ${peer.id}`, error);
        }
    }

    /**
     * 清理指定连接的待处理请求
     *
     * @param peerId - 连接 ID
     */
    public cleanupByPeer(peerId: string): void {
        const keysToDelete: string[] = [];

        for (const [id, request] of this.pendingRequests.entries()) {
            if (request.peerId === peerId) {
                clearTimeout(request.timeout);
                request.reject(new Error("Connection closed"));
                keysToDelete.push(id);
            }
        }

        for (const key of keysToDelete) {
            this.pendingRequests.delete(key);
        }

        if (keysToDelete.length > 0) {
            console.info(`[CLEANUP] 已清理连接 ${peerId} 的 ${keysToDelete.length} 个待处理请求`);
        }
    }

    /**
     * 清理所有待处理的请求
     */
    public cleanup(): void {
        for (const [, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeout);
            request.reject(new Error("Connection closed"));
        }
        this.pendingRequests.clear();
        console.info(`[CLEANUP] 已清理所有待处理的请求`);
    }

    /**
     * 获取待处理请求数量
     *
     * @returns 待处理请求数量
     */
    public getPendingRequestCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * 处理响应消息
     *
     * @param response - JSON-RPC 响应
     */
    private handleResponse(response: JsonRpcResponse): void {
        if (response.id && this.pendingRequests.has(response.id.toString())) {
            const pendingRequest = this.pendingRequests.get(response.id.toString())!;
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(response.id.toString());

            if (response.error) {
                pendingRequest.reject(new Error(response.error.message));
            } else {
                pendingRequest.resolve(response.result);
                console.debug(`[RESPONSE] 响应已处理: ${pendingRequest.peerId} - ID: ${response.id}`);
            }
        }
    }
}

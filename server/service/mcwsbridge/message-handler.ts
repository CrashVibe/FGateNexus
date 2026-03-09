import type { Peer } from "crossws";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { requestDispatcher } from "./request-dispatcher";
import { createJsonRpcRequestSchema, jsonRpcResponseSchema } from "./types";
import type { JsonRpcResponse, PendingRequest } from "./types";

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
  public async handleMessage(peer: Peer, message: string): Promise<void> {
    let data: unknown;
    try {
      data = JSON.parse(message);
    } catch {
      logger.error(`[ERROR] JSON 解析失败：${peer.id}`);
      MessageHandler.sendError(peer, null, -32_700, "Parse error");
      return;
    }

    const ValidResponse = jsonRpcResponseSchema.safeParse(data);
    if (ValidResponse.success) {
      this.handleResponse(ValidResponse.data);
      return;
    }

    const ValidRequest = createJsonRpcRequestSchema(z.unknown()).safeParse(
      data,
    );
    if (ValidRequest.success) {
      try {
        await requestDispatcher.dispatch(ValidRequest.data, peer);
      } catch (error) {
        logger.error(error, `[ERROR] 处理请求失败：${peer.id}`);
        MessageHandler.sendError(
          peer,
          ValidRequest.data.id ?? null,
          -32_603,
          "Internal error",
        );
      }
      return;
    }

    // 既不是有效响应也不是有效请求
    logger.warn(`[WARN] 无效的 JSON-RPC 消息：${peer.id}`);
    MessageHandler.sendError(peer, null, -32_600, "Invalid Request");
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
  public async sendRequest<P = unknown>(
    peer: Peer,
    method: string,
    params?: P,
    timeout = 10_000,
  ): Promise<unknown> {
    const id = uuidv4();
    const request = {
      id,
      jsonrpc: "2.0" as const,
      method,
      params,
    };

    const {
      promise: responsePromise,
      reject,
      resolve,
    } = Promise.withResolvers();

    // 设置超时
    const timeoutHandle = setTimeout(() => {
      this.pendingRequests.delete(id);
      reject(new Error(`Request timeout: ${method} (${timeout}ms)`));
    }, timeout);

    // 存储待处理的请求
    this.pendingRequests.set(id, {
      peerId: peer.id,
      reject,
      resolve,
      timeout: timeoutHandle,
    });

    try {
      peer.send(JSON.stringify(request));
      logger.debug(`[SEND] 请求已发送：${peer.id} - ${method} (ID: ${id})`);
      return await responsePromise;
    } catch (error) {
      const pendingRequest = this.pendingRequests.get(id);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(id);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 发送通知消息
   *
   * @param peer - WebSocket 连接
   * @param method - 通知方法
   * @param params - 通知参数
   */
  public static sendNotification<P = unknown>(
    peer: Peer,
    method: string,
    params?: P,
  ): void {
    const notification = {
      id: null,
      jsonrpc: "2.0" as const,
      method,
      params,
    };
    try {
      peer.send(JSON.stringify(notification));
      logger.debug(`[NOTIFY] 通知已发送：${peer.id} - ${method}`);
    } catch (error) {
      logger.error(error, `[FAILED] 发送通知失败：${peer.id} - ${method}`);
    }
  }

  /**
   * 发送成功响应
   *
   * @param peer - WebSocket 连接
   * @param id - 请求 ID
   * @param result - 响应结果
   */
  public static sendResponse(
    peer: Peer,
    id: string | null,
    result?: unknown,
  ): void {
    const response: JsonRpcResponse = {
      id,
      jsonrpc: "2.0",
      result,
    };

    try {
      peer.send(JSON.stringify(response));
      logger.debug(`[SUCCESS] 响应已发送：${peer.id} - ID: ${id}`);
    } catch (error) {
      logger.error(error, `[FAILED] 发送响应失败：${peer.id}`);
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
  public static sendError(
    peer: Peer,
    id: string | null,
    code: number,
    message: string,
    data?: unknown,
  ): void {
    const response: JsonRpcResponse = {
      error: { code, data, message },
      id,
      jsonrpc: "2.0",
    };

    try {
      peer.send(JSON.stringify(response));
      logger.warn(
        `[ERROR] 错误响应已发送：${peer.id} - ${code}: ${message} (ID: ${id})`,
      );
    } catch (error) {
      logger.error(error, `[FAILED] 发送错误响应失败：${peer.id}`);
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
      logger.info(
        `[CLEANUP] 已清理连接 ${peerId} 的 ${keysToDelete.length} 个待处理请求`,
      );
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
    logger.info(`[CLEANUP] 已清理所有待处理的请求`);
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
    if (
      response.id !== null &&
      this.pendingRequests.has(response.id.toString())
    ) {
      const pendingRequest = this.pendingRequests.get(response.id.toString());
      if (!pendingRequest) {
        throw new Error(`无法找到待处理请求：ID ${response.id}`);
      }
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(response.id.toString());

      if (response.error) {
        pendingRequest.reject(new Error(response.error.message));
      } else {
        pendingRequest.resolve(response.result);
        logger.debug(
          `[RESPONSE] 响应已处理：${pendingRequest.peerId} - ID: ${response.id}`,
        );
      }
    }
  }
}

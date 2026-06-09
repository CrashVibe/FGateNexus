import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import ChatMessageHandler from "#server/service/mcwsbridge/handler/chat-message-handler";
import PlayerDeathHandler from "#server/service/mcwsbridge/handler/player-death-handler";
import PlayerJoinHandler from "#server/service/mcwsbridge/handler/player-join-handler";
import PlayerLeaveHandler from "#server/service/mcwsbridge/handler/player-leave-handler";
import PlayerLoginHandler from "#server/service/mcwsbridge/handler/player-login-handler";
import {
  executeCommandSchema,
  kickPlayerSchema,
} from "#server/service/mcwsbridge/model";
import type { Peer } from "#server/service/mcwsbridge/peer";
import type RequestHandler from "#server/service/mcwsbridge/request-handler";
import {
  createJsonRpcRequestSchema,
  jsonRpcResponseSchema,
} from "#server/service/mcwsbridge/types";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  PendingRequest,
} from "#server/service/mcwsbridge/types";
import { logger } from "#server/utils/logger";

class ServerSession {
  public readonly peer: Peer;
  public readonly serverId: number;
  public supports_papi: boolean | null = null;
  public supports_command: boolean | null = null;
  private readonly handlers = new Map<string, RequestHandler>();
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly logger_prefix: string;

  constructor(peer: Peer, serverId: number) {
    this.peer = peer;
    this.serverId = serverId;
    this.registerHandler(new PlayerLoginHandler());
    this.registerHandler(new ChatMessageHandler());
    this.registerHandler(new PlayerLeaveHandler());
    this.registerHandler(new PlayerJoinHandler());
    this.registerHandler(new PlayerDeathHandler());
    this.logger_prefix = `[Session #${serverId}]`;
  }

  public async handleMessage(message: string): Promise<void> {
    let data: unknown;
    try {
      data = JSON.parse(message);
    } catch {
      logger.error(`${this.logger_prefix} JSON 解析失败：${this.peer.id}`);
      this.sendError(null, -32_700, "Parse error");
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
        await this.dispatch(ValidRequest.data);
      } catch (error) {
        logger.error(
          error,
          `${this.logger_prefix} 处理请求失败：${this.peer.id}`,
        );
        this.sendError(ValidRequest.data.id ?? null, -32_603, "Internal error");
      }
      return;
    }

    logger.warn(`${this.logger_prefix} 无效的 JSON-RPC 消息：${this.peer.id}`);
    this.sendError(null, -32_600, "Invalid Request");
  }

  public async sendRequest<P = unknown>(
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

    const timeoutHandle = setTimeout(() => {
      this.pendingRequests.delete(id);
      reject(new Error(`Request timeout: ${method} (${timeout}ms)`));
    }, timeout);

    this.pendingRequests.set(id, {
      reject,
      resolve,
      timeout: timeoutHandle,
    });

    try {
      this.peer.send(JSON.stringify(request));
      logger.debug(
        `${this.logger_prefix} 请求已发送：${this.peer.id} - ${method} (ID: ${id})`,
      );
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

  public sendNotification<P = unknown>(method: string, params?: P): void {
    const notification = {
      id: null,
      jsonrpc: "2.0" as const,
      method,
      params,
    };
    try {
      this.peer.send(JSON.stringify(notification));
      logger.debug(
        `${this.logger_prefix} 通知已发送：${this.peer.id} - ${method}`,
      );
    } catch (error) {
      logger.error(
        error,
        `${this.logger_prefix} 发送通知失败：${this.peer.id} - ${method}`,
      );
    }
  }

  public sendResponse(id: string | null, result?: unknown): void {
    const response: JsonRpcResponse = {
      id,
      jsonrpc: "2.0",
      result,
    };

    try {
      this.peer.send(JSON.stringify(response));
      logger.debug(
        `${this.logger_prefix} 响应已发送：${this.peer.id} - ID: ${id}`,
      );
    } catch (error) {
      logger.error(
        error,
        `${this.logger_prefix} 发送响应失败：${this.peer.id}`,
      );
    }
  }

  public sendError(
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
      this.peer.send(JSON.stringify(response));
      logger.warn(
        `${this.logger_prefix} 错误响应已发送：${this.peer.id} - ${code}: ${message} (ID: ${id})`,
      );
    } catch (error) {
      logger.error(error, `${this.logger_prefix} 发送错误响应失败`);
    }
  }

  public cleanup(): void {
    const pendingCount = this.pendingRequests.size;

    for (const [, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
    logger.info(`${this.logger_prefix} 已清理 ${pendingCount} 个待处理请求`);
  }

  public async kickPlayer(
    playerUUID: string,
    reason = "You have been kicked",
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.sendRequest("kick.player", {
      playerUUID,
      reason,
    });

    const parsed = kickPlayerSchema.safeParse(result);
    if (!parsed.success) {
      throw new Error("Invalid kick player response", { cause: parsed.error });
    }

    return parsed.data;
  }

  public async executeCommand(
    command: string,
    need_color = false,
  ): Promise<z.infer<typeof executeCommandSchema>> {
    const result = await this.sendRequest("execute.command", {
      command,
      need_color,
    });

    const parsed = executeCommandSchema.safeParse(result);
    if (!parsed.success) {
      throw new Error("Invalid command result", { cause: parsed.error });
    }

    return parsed.data;
  }

  public broadcastMessageToServer(message: string): void {
    this.sendNotification("chat.broadcast", {
      message,
    });
  }

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
        logger.debug(`${this.logger_prefix} 响应已处理：${response.id}`);
      }
    }
  }

  private registerHandler(handler: RequestHandler): void {
    const { method } = handler;
    if (this.handlers.has(method)) {
      throw new Error(`处理器已存在：${method}`);
    }
    this.handlers.set(method, handler);
    logger.debug(`[REGISTER] 请求处理器已注册：${method}`);
  }

  private async dispatch(request: JsonRpcRequest): Promise<void> {
    const handler = this.handlers.get(request.method);
    if (!handler) {
      logger.warn(`[DISPATCH] 未找到处理器：${request.method}`);
      this.sendError(request.id, -32_601, "Method not found");
      return;
    }

    try {
      await handler.handleRequest(request, this);
    } catch (error) {
      logger.error(error, `[DISPATCH] 处理请求失败：${request.method}`);
      this.sendError(request.id, -32_603, "Internal error", error);
    }
  }
}

export default ServerSession;

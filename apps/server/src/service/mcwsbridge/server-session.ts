import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import ChatMessageHandler from "#server/service/mcwsbridge/handler/chat-message-handler";
import PlayerDeathHandler from "#server/service/mcwsbridge/handler/player-death-handler";
import PlayerJoinHandler from "#server/service/mcwsbridge/handler/player-join-handler";
import PlayerLeaveHandler from "#server/service/mcwsbridge/handler/player-leave-handler";
import PlayerLoginHandler from "#server/service/mcwsbridge/handler/player-login-handler";
import {
  executeCommandSchema,
  getAdvancementsResponseSchema,
  getEquipmentResponseSchema,
  getPlaceholdersResponseSchema,
  getPlayersSchema,
  getServerStatusSchema,
  getStatisticsResponseSchema,
  kickPlayerSchema,
} from "#server/service/mcwsbridge/model";
import type {
  AdvancementsRequest,
  AdvancementsResult,
  Capabilities,
  EquipmentRequest,
  EquipmentResult,
  PlaceholderRequest,
  PlaceholderResult,
  PlayerInfo,
  ServerStatus,
  StatisticResult,
  StatisticsRequest,
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
  public capabilities: Capabilities = {
    advancements: false,
    equipment: false,
    players: false,
    server_status: false,
    statistics: false,
  };
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

  /** 解析失败抛错（附 cause） */
  private static parseRpcResult<S extends z.ZodType>(
    schema: S,
    result: unknown,
    errorMessage: string,
  ): z.infer<S> {
    const parsed = schema.safeParse(result);
    if (!parsed.success) {
      throw new Error(errorMessage, { cause: parsed.error });
    }
    return parsed.data;
  }

  /** 玩家数 ≤ 200，单玩家子项 ≤ 20 */
  private static assertBatchSize<T>(
    requests: T[],
    method: string,
    itemLabel: string,
    itemCount: (request: T) => number,
  ): void {
    if (requests.length > 200) {
      throw new Error(`${method} 请求玩家数超出上限：${requests.length} > 200`);
    }
    for (const request of requests) {
      const count = itemCount(request);
      if (count > 20) {
        throw new Error(
          `${method} 单玩家${itemLabel}数超出上限：${count} > 20`,
        );
      }
    }
  }

  public async kickPlayer(
    playerUUID: string,
    reason = "You have been kicked",
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.sendRequest("kick.player", {
      playerUUID,
      reason,
    });

    return ServerSession.parseRpcResult(
      kickPlayerSchema,
      result,
      "Invalid kick player response",
    );
  }

  public async executeCommand(
    command: string,
    need_color = false,
  ): Promise<z.infer<typeof executeCommandSchema>> {
    const result = await this.sendRequest("execute.command", {
      command,
      need_color,
    });

    return ServerSession.parseRpcResult(
      executeCommandSchema,
      result,
      "Invalid command result",
    );
  }

  public async getPlayers(): Promise<PlayerInfo[]> {
    if (!this.capabilities.players) {
      return [];
    }

    const result = await this.sendRequest("get.players");

    return ServerSession.parseRpcResult(
      getPlayersSchema,
      result,
      "Invalid get.players response",
    ).players;
  }

  public async getServerStatus(): Promise<ServerStatus | null> {
    if (!this.capabilities.server_status) {
      return null;
    }

    const result = await this.sendRequest("get.server_status");

    return ServerSession.parseRpcResult(
      getServerStatusSchema,
      result,
      "Invalid get.server_status response",
    );
  }

  /** 批量 RPC 通用骨架 */
  private async batchRpc<T, S extends z.ZodType, R>(opts: {
    enabled: boolean;
    method: string;
    schema: S;
    errMsg: string;
    requests: T[];
    pick: (parsed: z.infer<S>) => R[];
    itemLabel?: string;
    itemCount?: (request: T) => number;
    timeout?: number;
  }): Promise<R[]> {
    if (!opts.enabled || opts.requests.length === 0) {
      return [];
    }
    if (opts.itemLabel && opts.itemCount) {
      ServerSession.assertBatchSize(
        opts.requests,
        opts.method,
        opts.itemLabel,
        opts.itemCount,
      );
    }

    const result = await this.sendRequest(
      opts.method,
      { requests: opts.requests },
      opts.timeout ?? 8000,
    );

    return opts.pick(
      ServerSession.parseRpcResult(opts.schema, result, opts.errMsg),
    );
  }

  public async getPlaceholders(
    requests: PlaceholderRequest[],
  ): Promise<PlaceholderResult[]> {
    return await this.batchRpc({
      enabled: this.supports_papi === true,
      errMsg: "Invalid get.placeholders response",
      itemCount: (request) => request.placeholders.length,
      itemLabel: "占位符",
      method: "get.placeholders",
      pick: (parsed) => parsed.results,
      requests,
      schema: getPlaceholdersResponseSchema,
    });
  }

  public async getStatistics(
    requests: StatisticsRequest[],
  ): Promise<StatisticResult[]> {
    return await this.batchRpc({
      enabled: this.capabilities.statistics,
      errMsg: "Invalid get.statistics response",
      itemCount: (request) => request.statistics.length,
      itemLabel: "统计名",
      method: "get.statistics",
      pick: (parsed) => parsed.results,
      requests,
      schema: getStatisticsResponseSchema,
    });
  }

  /** 仅在线玩家有数据 */
  public async getAdvancements(
    requests: AdvancementsRequest[],
  ): Promise<AdvancementsResult[]> {
    return await this.batchRpc({
      enabled: this.capabilities.advancements,
      errMsg: "Invalid get.advancements response",
      method: "get.advancements",
      pick: (parsed) => parsed.results,
      requests,
      schema: getAdvancementsResponseSchema,
    });
  }

  /** 仅在线玩家有数据 */
  public async getEquipment(
    requests: EquipmentRequest[],
  ): Promise<EquipmentResult[]> {
    return await this.batchRpc({
      enabled: this.capabilities.equipment,
      errMsg: "Invalid get.equipment response",
      method: "get.equipment",
      pick: (parsed) => parsed.results,
      requests,
      schema: getEquipmentResponseSchema,
    });
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

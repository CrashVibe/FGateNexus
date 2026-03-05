import type { Peer } from "crossws";

import { ChatMessageHandler } from "./impl/chat-message";
import { PlayerDeathHandler } from "./impl/player-death";
import { PlayerJoinHandler } from "./impl/player-join";
import { PlayerLeaveHandler } from "./impl/player-leave";
import { PlayerLoginHandler } from "./impl/player-login";
import { MessageHandler } from "./message-handler";
import type { RequestHandler } from "./request-handler";
import type { JsonRpcRequest } from "./types";

class RequestDispatcher {
  static instance: RequestDispatcher | null = null;

  private handlers = new Map<string, RequestHandler>();
  private constructor() {
    this.registerHandler(new PlayerLoginHandler());
    this.registerHandler(new ChatMessageHandler());
    this.registerHandler(new PlayerLeaveHandler());
    this.registerHandler(new PlayerJoinHandler());
    this.registerHandler(new PlayerDeathHandler());
  }

  public static getInstance(): RequestDispatcher {
    RequestDispatcher.instance ??= new RequestDispatcher();
    return RequestDispatcher.instance;
  }

  /**
   * 注册请求处理器
   */
  public registerHandler(handler: RequestHandler): void {
    const { method } = handler;
    if (this.handlers.has(method)) {
      throw new Error(`处理器已存在：${method}`);
    }
    this.handlers.set(method, handler);
    logger.info(`[REGISTER] 请求处理器已注册：${method}`);
  }

  /**
   * 分发请求
   */
  public async dispatch(request: JsonRpcRequest, peer: Peer): Promise<void> {
    const handler = this.handlers.get(request.method);
    if (!handler) {
      logger.warn(`[DISPATCH] 未找到处理器：${request.method}`);
      MessageHandler.sendError(peer, request.id, -32_601, "Method not found");
      return;
    }

    try {
      await handler.handleRequest(request, peer);
    } catch (error) {
      logger.error({ error }, `[DISPATCH] 处理请求失败：${request.method}`);
      MessageHandler.sendError(
        peer,
        request.id,
        -32_603,
        "Internal error",
        error,
      );
    }
  }
}

export const requestDispatcher = RequestDispatcher.getInstance();

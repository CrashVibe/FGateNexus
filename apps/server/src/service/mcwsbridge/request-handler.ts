import type ServerSession from "#server/service/mcwsbridge/server-session";

import type { JsonRpcRequest } from "./types";

/**
 * WebSocket 请求处理器基类
 */
abstract class RequestHandler {
  /**
   * 获取处理器支持的方法名
   */
  public abstract method: string;

  /**
   * 处理请求的抽象方法
   * @param request - JSON-RPC 请求对象
   * @param session - 当前请求的服务器会话
   */
  public abstract handleRequest(
    request: JsonRpcRequest,
    session: ServerSession,
  ): Promise<void> | void;
}

export default RequestHandler;

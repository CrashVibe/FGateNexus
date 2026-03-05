import type { Peer } from "crossws";

import type { JsonRpcRequest } from "./types";

/**
 * WebSocket 请求处理器基类
 */
export abstract class RequestHandler {
  /**
   * 获取处理器支持的方法名
   */
  public abstract method: string;

  /**
   * 处理请求的抽象方法
   * @param request - JSON-RPC 请求对象
   * @param peer - WebSocket 连接
   */
  public abstract handleRequest(
    request: JsonRpcRequest,
    peer: Peer,
  ): Promise<void> | void;
}

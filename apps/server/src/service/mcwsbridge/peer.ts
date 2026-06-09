import type { ServerWebSocket } from "bun";

/**
 * MC 桥连接的对端抽象。
 *
 * 只暴露代码实际用到的成员（id / request.headers / send / close),
 * 这样 `ConnectionManager`、`ServerSession` 等无需感知底层是 Bun 原生
 * WebSocket 还是其它实现。
 */
export interface Peer {
  readonly id: string;
  readonly request: { readonly headers: Headers };
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/** 附加在 Bun `ServerWebSocket` 上的每连接数据（在 upgrade 阶段写入）。 */
export interface PeerData {
  readonly id: string;
  readonly headers: Headers;
  readonly serverId: number;
  /** 客户端版本过低时的警告，open 时随 welcome 一起回传。 */
  readonly warning?: string;
  /** 缓存的 Peer 适配器，供 message/close 复用同一实例（同一 id）。 */
  peer?: Peer;
}

/** 把 Bun 的 `ServerWebSocket` 适配成 {@link Peer}。 */
export const createPeer = (ws: ServerWebSocket<PeerData>): Peer => {
  ws.data.peer ??= {
    close: (code, reason) => {
      ws.close(code, reason);
    },
    id: ws.data.id,
    request: { headers: ws.data.headers },
    send: (data) => {
      ws.send(data);
    },
  };
  return ws.data.peer;
};

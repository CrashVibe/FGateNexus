import type { Server, WebSocketHandler } from "bun";
import { eq } from "drizzle-orm";

import { db } from "#server/db/client";
import { serverTable } from "#server/db/schema";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import type { PeerData } from "#server/service/mcwsbridge/peer";
import { createPeer } from "#server/service/mcwsbridge/peer";
import { logger } from "#server/utils/logger";
import {
  checkClientVersion,
  CURRENT_API_VERSION,
  isValidVersion,
} from "#server/utils/version";

/** MC 桥 WebSocket 的挂载路径。 */
export const MC_BRIDGE_PATH = "/api";

const unauthorized = (message: string, status = 401): Response =>
  new Response(message, { status });

/**
 * 在 HTTP 升级阶段对 MC 客户端做鉴权。
 *
 * 校验通过则 `server.upgrade` 并返回 undefined（表示已升级）;
 * 否则返回 HTTP 响应拒绝握手。
 */
export const handleMcBridgeUpgrade = async (
  req: Request,
  server: Server<PeerData>,
): Promise<Response | undefined> => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const clientVersion = req.headers.get("x-api-version");

  if (!token || !clientVersion) {
    logger.warn({ clientVersion, token }, "WebSocket 请求缺失 Token 或 版本号");
    return unauthorized("Unauthorized: Missing authorization token");
  }

  if (!isValidVersion(clientVersion)) {
    logger.warn({ clientVersion }, "WebSocket 请求版本格式无效");
    return unauthorized("Bad Request: Invalid version format", 400);
  }

  const versionWarning = checkClientVersion(clientVersion);
  if (versionWarning) {
    logger.warn(
      { clientVersion, warning: versionWarning.warning },
      "客户端版本过低",
    );
  }

  const rows = await db
    .select()
    .from(serverTable)
    .where(eq(serverTable.token, token))
    .limit(1);
  const [serverRecord] = rows;
  if (!serverRecord) {
    logger.warn({ token }, "WebSocket 请求 Token 无效");
    return unauthorized("Unauthorized: Invalid authorization token");
  }

  if (connectionManager.hasConnection(undefined, serverRecord.id)) {
    logger.warn(
      { serverId: serverRecord.id },
      "WebSocket 接受的对应连接已存在",
    );
    return unauthorized("Conflict: Connection already exists", 409);
  }

  const data: PeerData = {
    headers: req.headers,
    id: crypto.randomUUID(),
    serverId: serverRecord.id,
    warning: versionWarning?.warning,
  };

  if (!server.upgrade(req, { data })) {
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
  return undefined;
};

/** Bun.serve 的 websocket 处理器。 */
export const mcBridgeWebSocket: WebSocketHandler<PeerData> = {
  close(ws) {
    const peer = createPeer(ws);
    if (connectionManager.hasConnection(peer)) {
      const removed = connectionManager.onClose(peer);
      logger.info(
        { peerId: removed?.peer.id, serverId: removed?.serverId },
        "WebSocket 连接已移除",
      );
      return;
    }
    logger.info({ peerId: peer.id }, "WebSocket 连接已关闭");
  },

  async message(ws, message) {
    const peer = createPeer(ws);
    if (!connectionManager.hasConnection(peer)) {
      peer.close(1008, "Unauthorized: 该连接未授权或不存在");
      return;
    }
    const session = connectionManager.getConnectionByPeer(peer);
    if (!session) {
      logger.error({ peerId: peer.id }, "该连接从未被登记！");
      return;
    }
    const text = typeof message === "string" ? message : message.toString();
    try {
      await session.handleMessage(text);
    } catch (error) {
      logger.error(error, "处理 WebSocket 消息时发生未捕获的错误");
    }
  },

  async open(ws) {
    const peer = createPeer(ws);
    const { serverId, warning } = ws.data;
    try {
      await connectionManager.addConnection(peer, serverId);
      peer.send(
        JSON.stringify({
          api_version: CURRENT_API_VERSION,
          message: "连接成功，欢迎使用 FGATE",
          type: "welcome",
          ...(warning && { warning }),
        }),
      );
      logger.info({ serverId }, "WebSocket 接受请求成功：");
    } catch (error) {
      // addConnection 内部已记录并清理连接，此处兜底关闭。
      logger.error(error, "建立 MC 桥会话失败");
      peer.close(1011, "Failed to initialize session");
    }
  },
};

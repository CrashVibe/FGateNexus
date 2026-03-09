import { eq } from "drizzle-orm";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { pluginBridge } from "~~/server/service/mcwsbridge/mcws-bridge";
import {
  checkClientVersion,
  CURRENT_API_VERSION,
  isValidVersion,
} from "~~/server/utils/version";

export default defineWebSocketHandler({
  close(peer) {
    if (pluginBridge.connectionManager.hasConnection(peer)) {
      const data = pluginBridge.connectionManager.removeConnection(peer);
      logger.info(
        {
          peerId: peer.id,
          serverId: data.serverId,
        },
        "WebSocket 连接已移除",
      );
      return;
    }
    logger.info(
      {
        peerId: peer.id,
      },
      "WebSocket 连接已关闭",
    );
  },

  async message(peer, message) {
    if (!pluginBridge.connectionManager.hasConnection(peer)) {
      peer.close(1008, "Unauthorized: 该连接未授权或不存在");
      return;
    }
    try {
      await pluginBridge.messageHandler.handleMessage(peer, message.text());
    } catch (error) {
      logger.error(error, "处理 WebSocket 消息时发生未捕获的错误");
    }
  },
  async open(peer) {
    const token = peer.request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const clientVersion = peer.request.headers.get("x-api-version");

    if (
      token === undefined ||
      token === "" ||
      clientVersion === null ||
      clientVersion === ""
    ) {
      peer.close(1008, "Unauthorized: Missing authorization token");
      logger.warn(
        {
          clientVersion,
          token,
        },
        "WebSocket 请求缺失 Token 或 版本号",
      );
      return;
    }

    if (!isValidVersion(clientVersion)) {
      peer.close(1008, "Bad Request: Invalid version format");
      logger.warn(
        {
          clientVersion,
        },
        "WebSocket 请求版本格式无效",
      );
      return;
    }

    const versionWarning = checkClientVersion(clientVersion);
    if (versionWarning) {
      logger.warn(
        {
          clientVersion,
          warning: versionWarning.warning,
        },
        "客户端版本过低",
      );
    }

    const db_token = await db
      .select()
      .from(servers)
      .where(eq(servers.token, token))
      .limit(1);
    if (db_token.length === 0) {
      peer.close(1008, "Unauthorized: Invalid authorization token");
      logger.warn({ token }, "WebSocket 请求 Token 无效");
      return;
    }

    const [server] = db_token;
    if (!server) {
      peer.close(1008, "Unauthorized: Invalid server data");
      logger.warn("WebSocket 请求服务器数据无效");
      return;
    }

    if (pluginBridge.connectionManager.hasConnection(undefined, server.id)) {
      peer.close(1008, "Unauthorized: Connection already exists");
      logger.warn(
        {
          serverId: server.id,
        },
        "WebSocket 接受的对应连接连接已存在",
      );
      return;
    }

    try {
      await pluginBridge.connectionManager.addConnection(peer, server.id);
    } catch {
      return;
    }
    peer.send(
      JSON.stringify({
        api_version: CURRENT_API_VERSION,
        message: "连接成功，欢迎使用 FGATE",
        type: "welcome",
        ...(versionWarning && { warning: versionWarning.warning }),
      }),
    );

    logger.info(
      {
        clientVersion,
        serverId: server.id,
      },
      "WebSocket 接受请求成功：",
    );
  },
});

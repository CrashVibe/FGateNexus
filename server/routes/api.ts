import type { AdapterInternal, Peer } from "crossws";
import { eq } from "drizzle-orm";
import { getDatabase } from "~~/server/db/client";

import { servers } from "../db/schema";
import { pluginBridge } from "../service/mcwsbridge/MCWSBridge";
import { checkClientVersion, CURRENT_API_VERSION, isValidVersion } from "../utils/version";

export default defineWebSocketHandler({
  async open(peer) {
    const token = peer.request.headers.get("authorization")?.replace("Bearer ", "");
    const clientVersion = peer.request.headers.get("x-api-version");

    if (!token || !clientVersion) {
      peer.close(1008, "Unauthorized: Missing authorization token");
      logger.warn(
        {
          token,
          clientVersion
        },
        "WebSocket 请求缺失 Token 或 版本号"
      );
      return;
    }

    if (!isValidVersion(clientVersion)) {
      peer.close(1008, "Bad Request: Invalid version format");
      logger.warn(
        {
          clientVersion
        },
        "WebSocket 请求版本格式无效"
      );
      return;
    }

    const versionWarning = checkClientVersion(clientVersion);
    if (versionWarning) {
      logger.warn(
        {
          clientVersion,
          warning: versionWarning.warning
        },
        "客户端版本过低"
      );
    }

    const database = await getDatabase();
    const db_token = await database.select().from(servers).where(eq(servers.token, token)).limit(1);
    if (db_token.length === 0) {
      peer.close(1008, "Unauthorized: Invalid authorization token");
      logger.warn({ token }, "WebSocket 请求 Token 无效");
      return;
    }

    const server = db_token[0];
    if (!server) {
      peer.close(1008, "Unauthorized: Invalid server data");
      logger.warn("WebSocket 请求服务器数据无效");
      return;
    }

    if (pluginBridge.connectionManager.hasConnection(undefined, server.id)) {
      peer.close(1008, "Unauthorized: Connection already exists");
      logger.warn(
        {
          serverId: server.id
        },
        "WebSocket 接受的对应连接连接已存在"
      );
      return;
    }

    pluginBridge.connectionManager.addConnection(peer as unknown as Peer<AdapterInternal>, server.id);

    peer.send(
      JSON.stringify({
        type: "welcome",
        message: "连接成功，欢迎使用 FGATE",
        api_version: CURRENT_API_VERSION,
        ...(versionWarning && { warning: versionWarning.warning })
      })
    );

    logger.info(
      {
        serverId: server.id,
        clientVersion
      },
      "WebSocket 接受请求成功："
    );
  },

  async close(peer) {
    if (pluginBridge.connectionManager.hasConnection(peer as unknown as Peer<AdapterInternal>)) {
      const data = pluginBridge.connectionManager.removeConnection(peer as unknown as Peer<AdapterInternal>);
      logger.info(
        {
          peerId: peer.id,
          serverId: data.serverId
        },
        "WebSocket 连接已移除"
      );
      return;
    }
    logger.info(
      {
        peerId: peer.id
      },
      "WebSocket 连接已关闭"
    );
  },
  async message(peer, message) {
    if (!pluginBridge.connectionManager.hasConnection(peer as unknown as Peer<AdapterInternal>)) {
      throw new Error("Unauthorized: 该连接未授权或不存在");
    }
    await pluginBridge.messageHandler.handleMessage(peer as unknown as Peer<AdapterInternal>, message.text());
  }
});

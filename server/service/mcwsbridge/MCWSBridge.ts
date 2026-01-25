import type { CommandResult } from "./types";
import type { AdapterInternal, Peer } from "crossws";
import { eq } from "drizzle-orm";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";

import { ConnectionManager, type GetClientInfoResult } from "./ConnectionManager";
import { MessageHandler } from "./MessageHandler";

/**
 * Minecraft WebSocket 桥接器
 * 作为协调器，统一管理连接和消息处理
 */
export class MCWSBridge {
  static instance: MCWSBridge | null = null;

  public readonly connectionManager: ConnectionManager;
  public readonly messageHandler: MessageHandler;

  private constructor() {
    this.messageHandler = new MessageHandler();
    this.connectionManager = new ConnectionManager(this);
  }

  /**
   * 获取 MCWSBridge 实例
   */
  public static getInstance(): MCWSBridge {
    if (!MCWSBridge.instance) {
      MCWSBridge.instance = new MCWSBridge();
    }
    return MCWSBridge.instance;
  }

  /**
   * 更新客户端信息
   */
  public async updateClientInfo(peer: Peer<AdapterInternal>, serverID: number): Promise<GetClientInfoResult> {
    const result = await this.messageHandler.sendRequest<{
      minecraft_version: string;
      minecraft_software: string;
      supports_papi: boolean;
      supports_command: boolean;
      player_count: number;
    }>(peer, "get.client.info");
    if (
      typeof result.minecraft_version !== "string" ||
      typeof result.minecraft_software !== "string" ||
      typeof result.supports_papi !== "boolean" ||
      typeof result.supports_command !== "boolean" ||
      typeof result.player_count !== "number"
    ) {
      this.messageHandler.sendError(peer, null, -32603, "Invalid client info response", result);
      throw new Error(`[WARNING] 客户端信息不完整：${peer.id}`);
    }

    this.connectionManager.setConnectionData(serverID, { peer, serverId: serverID, data: result });
    // 更新数据库中的服务器信息
    const database = await getDatabase();
    await database
      .update(servers)
      .set({
        minecraft_version: result.minecraft_version,
        minecraft_software: result.minecraft_software
      })
      .where(eq(servers.id, serverID))
      .execute();

    return result;
  }

  /**
   * 根据服务器 ID 踢出玩家
   *
   * @param serverId - 服务器 ID
   * @param playerUUID - 玩家 UUID
   * @param reason - 踢出原因
   * @returns 操作结果
   */
  public async kickPlayer(
    serverId: number,
    playerUUID: string,
    reason: string = "You have been kicked"
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.messageHandler.sendRequest<{ success: boolean; message: string }>(
      this.connectionManager.getConnection(serverId).peer,
      "kick.player",
      { playerUUID, reason }
    );
    return { success: result.success, message: result.message };
  }

  /**
   * 广播消息到指定服务器
   */
  public async broadcastMessageToServer(serverId: number, message: string): Promise<void> {
    this.messageHandler.sendNotification(this.connectionManager.getConnection(serverId).peer, "chat.broadcast", {
      message
    });
  }

  /**
   * 执行指令
   */
  public async executeCommand(serverId: number, command: string): Promise<CommandResult> {
    return this.messageHandler.sendRequest<CommandResult>(
      this.connectionManager.getConnection(serverId).peer,
      "execute.command",
      { command }
    );
  }
}

export const pluginBridge = MCWSBridge.getInstance();

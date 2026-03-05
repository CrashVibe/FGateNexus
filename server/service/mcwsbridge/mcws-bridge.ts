import type { Peer } from "crossws";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";

import { ConnectionManager } from "./connection-manager";
import type { GetClientInfoResult } from "./connection-manager";
import { MessageHandler } from "./message-handler";

// Response schemas
const clientInfoSchema = z.object({
  minecraft_software: z.string(),
  minecraft_version: z.string(),
  player_count: z.number(),
  supports_command: z.boolean(),
  supports_papi: z.boolean(),
});

const kickPlayerSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

const executeCommandSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

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
    MCWSBridge.instance ??= new MCWSBridge();
    return MCWSBridge.instance;
  }

  /**
   * 更新客户端信息
   */
  public async updateClientInfo(
    peer: Peer,
    serverID: number,
  ): Promise<GetClientInfoResult> {
    const result = await this.messageHandler.sendRequest(
      peer,
      "get.client.info",
    );

    const parsed = clientInfoSchema.safeParse(result);
    if (!parsed.success) {
      MessageHandler.sendError(
        peer,
        null,
        -32_603,
        "Invalid client info response",
        result,
      );
      throw new Error(`[WARNING] 客户端信息不完整：${peer.id}`);
    }

    const clientInfo = parsed.data;
    this.connectionManager.setConnectionData(serverID, {
      data: clientInfo,
      peer,
      serverId: serverID,
    });
    // 更新数据库中的服务器信息
    await db
      .update(servers)
      .set({
        minecraft_software: clientInfo.minecraft_software,
        minecraft_version: clientInfo.minecraft_version,
      })
      .where(eq(servers.id, serverID))
      .execute();

    return clientInfo;
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
    reason = "You have been kicked",
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.messageHandler.sendRequest(
      this.connectionManager.getConnection(serverId).peer,
      "kick.player",
      {
        playerUUID,
        reason,
      },
    );

    const parsed = kickPlayerSchema.safeParse(result);
    if (!parsed.success) {
      throw new Error("Invalid kick player response", { cause: parsed.error });
    }

    return parsed.data;
  }

  /**
   * 广播消息到指定服务器
   */
  public broadcastMessageToServer(serverId: number, message: string): void {
    MessageHandler.sendNotification(
      this.connectionManager.getConnection(serverId).peer,
      "chat.broadcast",
      {
        message,
      },
    );
  }

  /**
   * 执行指令
   */
  public async executeCommand(
    serverId: number,
    command: string,
  ): Promise<z.infer<typeof executeCommandSchema>> {
    const result = await this.messageHandler.sendRequest(
      this.connectionManager.getConnection(serverId).peer,
      "execute.command",
      { command },
    );

    const parsed = executeCommandSchema.safeParse(result);
    if (!parsed.success) {
      throw new Error("Invalid command result", { cause: parsed.error });
    }

    return parsed.data;
  }
}

export const pluginBridge = MCWSBridge.getInstance();

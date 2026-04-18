import type { Peer } from "crossws";
import { eq } from "drizzle-orm";

import { db } from "#server/db/client";
import { servers } from "#server/db/schema";
import { clientInfoSchema } from "#server/service/mcwsbridge/model";
import ServerSession from "#server/service/mcwsbridge/server-session";

/**
 * 连接管理器
 * 负责管理所有 WebSocket 连接的生命周期
 */
class ConnectionManager {
  private readonly byServerId = new Map<number, ServerSession>();
  private readonly byPeerId = new Map<string, ServerSession>();

  /**
   * 添加一个连接
   */
  public async addConnection(peer: Peer, serverId: number): Promise<void> {
    if (this.byServerId.has(serverId)) {
      throw new Error(`连接已存在，无法重复添加：serverId=${serverId}`);
    }

    const session = new ServerSession(peer, serverId);
    this.add(session);
    logger.info(`[CONNECTION] 已添加：serverId=${serverId}`);

    try {
      await ConnectionManager.initSession(session);
    } catch (error) {
      logger.error(error, `[ERROR] 更新客户端信息失败：peerId=${peer.id}`);
      this.removeConnection(session);
      throw new Error(`更新客户端信息失败 (已关闭连接): peerId=${peer.id}`, {
        cause: error,
      });
    }
  }

  /**
   * 根据 serverId 或 peer 判断连接是否存在
   */
  public hasConnection(peer?: Peer, serverId?: number): boolean {
    if (serverId !== undefined) {
      return this.byServerId.has(serverId);
    }
    if (peer) {
      return this.byPeerId.has(peer.id);
    }
    throw new Error("必须提供 peer 或 serverId 参数之一");
  }

  /**
   * 在连接关闭时执行
   */
  public onClose(
    peer: Peer,
  ): ReturnType<typeof this.removeConnection> | undefined {
    const session = this.byPeerId.get(peer.id);
    if (!session) {
      return undefined;
    }
    return this.removeConnection(session);
  }

  /** 根据 serverId 取 session */
  public getConnectionByServerId(serverId: number): ServerSession | undefined {
    return this.byServerId.get(serverId);
  }

  /** 根据 peer 取 session */
  public getConnectionByPeer(peer: Peer): ServerSession | undefined {
    return this.byPeerId.get(peer.id);
  }

  public removeConnection(session: ServerSession): {
    peer: Peer;
    serverId: number;
  } {
    this.delete(session);

    try {
      session.peer.close(1000, "Connection closed by server");
    } catch (error) {
      logger.warn(
        { error },
        `[CONNECTION] 关闭 peer 时出错：serverId=${session.serverId}`,
      );
    }

    logger.info(`[CONNECTION] 已移除：serverId=${session.serverId}`);
    session.cleanup();
    return { peer: session.peer, serverId: session.serverId };
  }

  private add(session: ServerSession): void {
    this.byServerId.set(session.serverId, session);
    this.byPeerId.set(session.peer.id, session);
  }

  private delete(session: ServerSession): void {
    this.byServerId.delete(session.serverId);
    this.byPeerId.delete(session.peer.id);
  }

  /**
   * 初始化服务器会话
   * @param session 服务器会话
   */
  private static async initSession(session: ServerSession): Promise<void> {
    const result = await session.sendRequest("get.client.info");

    const parsed = clientInfoSchema.safeParse(result);
    if (!parsed.success) {
      session.sendError(null, -32_603, "Invalid client info response", result);
      throw new Error(`[WARNING] 客户端信息不完整：${session.peer.id}`);
    }

    const {
      minecraft_software,
      minecraft_version,
      supports_command,
      supports_papi,
    } = parsed.data;

    session.supports_command = supports_command;
    session.supports_papi = supports_papi;

    await db
      .update(servers)
      .set({ minecraft_software, minecraft_version })
      .where(eq(servers.id, session.serverId))
      .execute();
  }
}

export const connectionManager = new ConnectionManager();

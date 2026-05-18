import { and, eq, isNull, sql } from "drizzle-orm";
import type { Session } from "koishi";
import { db } from "~~/server/db/client";
import {
  playerTable,
  serverTable,
  socialAccountTable,
  targetTable,
} from "~~/server/db/schema";
import type { Target } from "~~/server/db/schema";
import {
  renderBindFail,
  renderBindRenameName,
  renderBindSuccess,
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess,
} from "~~/shared/utils/template/binding";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { PlatformType } from "#shared/model/bot/types";
import { generateVerificationCode } from "#shared/utils/binding";

import type { PlatformSender } from "../chatbridge/sender/types";
import { getConfig } from "./config";

const platformTypeSet = new Set<string>(Object.values(PlatformType));

const isPlatformType = (value: string): value is PlatformType =>
  platformTypeSet.has(value);

interface PendingBinding {
  /**
   * 服务器 ID
   */
  serverID: number;
  /**
   * 玩家 UID
   */
  playerUID: string;
  /**
   * Bot 实例 ID
   */
  botID: number;
  /**
   * 玩家昵称
   *
   * 用于发送信息提示
   */
  playerNickname: string;
  /**
   * 匹配的信息
   *
   * 用于匹配请求
   */
  message: string;
  /**
   * 过期时间
   */
  expiresAt: Date;
}

export class BindingService {
  private static instance: BindingService;
  // Bot ID -> PendingBinding
  private readonly pendingBindings: Map<number, Set<PendingBinding>>;
  private constructor() {
    this.pendingBindings = new Map();
  }

  public static getInstance(): BindingService {
    BindingService.instance ??= new BindingService();
    return BindingService.instance;
  }

  /**
   * 添加待处理绑定
   */
  public async addPendingBinding(
    serverID: number,
    playerUID: string,
    playerNickname: string,
  ): Promise<{ has: boolean; message: string; expiresAt: Date }> {
    const bindingConfig = await getConfig(serverID);
    const serversWithBots = await db.query.serverTable.findFirst({
      where: eq(serverTable.id, serverID),
      with: {
        bot: true,
      },
    });
    if (!serversWithBots) {
      throw new Error("服务器未找到");
    } else if (!serversWithBots.bot) {
      throw new Error("服务器 Bot 配置未找到");
    }

    const { bot } = serversWithBots;

    this.cleanUpExpiredBindings();

    // 确保 serverID playerUID 唯一性 PendingBinding
    const existingBindings = this.pendingBindings.get(bot.id) ?? new Set();
    const pendingBinding = [...existingBindings].find(
      (binding) =>
        binding.serverID === serverID && binding.playerUID === playerUID,
    );
    if (pendingBinding) {
      return {
        expiresAt: pendingBinding.expiresAt,
        has: true,
        message: pendingBinding.message,
      };
    }

    const message =
      bindingConfig.prefix +
      generateVerificationCode(
        bindingConfig.codeMode,
        bindingConfig.codeLength,
      );
    const expiresAt = new Date(
      Date.now() + bindingConfig.codeExpire * 60 * 1000,
    );

    const newBinding: PendingBinding = {
      botID: bot.id,
      expiresAt,
      message,
      playerNickname,
      playerUID,
      serverID,
    };

    existingBindings.add(newBinding);
    this.pendingBindings.set(bot.id, existingBindings);

    return { expiresAt, has: false, message };
  }

  /**
   * 清理过期的待处理绑定
   */
  public cleanUpExpiredBindings(): void {
    const now = new Date();
    for (const [botID, bindings] of this.pendingBindings.entries()) {
      for (const binding of bindings) {
        if (binding.expiresAt < now) {
          bindings.delete(binding);
        }
      }
      if (bindings.size === 0) {
        this.pendingBindings.delete(botID);
      }
    }
  }

  /**
   * 处理消息
   */
  public async processMessage(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    this.cleanUpExpiredBindings();

    const bindings = this.pendingBindings.get(connection.botId);
    let hit = false;
    if (bindings) {
      for (const binding of bindings) {
        if (binding.message !== session.content) {
          continue;
        }
        const { userId, channelId } = session;
        if (!userId || !channelId) {
          continue;
        }

        const target = await db.query.targetTable.findFirst({
          where: and(
            eq(targetTable.serverId, binding.serverID),
            eq(targetTable.channelId, channelId),
            session.guildId
              ? eq(targetTable.guildId, session.guildId)
              : isNull(targetTable.guildId),
          ),
          with: {
            server: true,
          },
        });
        if (!target?.server) {
          continue;
        }

        const bindingConfig = await getConfig(binding.serverID);
        try {
          await BindingService.performBinding(
            userId,
            session.username,
            connection,
            target,
            binding,
            bindingConfig,
          );
          // 删除已处理的 pending binding
          bindings.delete(binding);
          await session.send(
            renderBindSuccess(
              bindingConfig.bindSuccessMsg,
              binding.playerNickname,
            ),
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error({ errorMessage }, "无法处理绑定");
          await session.send(
            renderBindFail(
              bindingConfig.bindFailMsg,
              binding.playerNickname,
              errorMessage,
            ),
          );
        }

        hit = true;
      }
    }
    if (await BindingService.processUnbindMessage(connection, session)) {
      return true;
    }
    return hit;
  }

  public static async performBinding(
    socialUid: string,
    socialNickname: string | null,
    connection: PlatformSender,
    target: Target,
    pendingBinding: PendingBinding,
    bindingConfig: Awaited<ReturnType<typeof getConfig>>,
  ): Promise<void> {
    let socialAccountRecord = await db.query.socialAccountTable.findFirst({
      where: and(
        eq(socialAccountTable.uid, socialUid),
        eq(socialAccountTable.platform, connection.platformType),
      ),
    });

    if (!socialAccountRecord) {
      const [newAccount] = await db
        .insert(socialAccountTable)
        .values({
          nickname: socialNickname,
          platform: connection.platformType,
          uid: socialUid,
        })
        .returning();
      if (!newAccount) {
        throw new Error(`社交账号 ${socialUid} 创建失败`);
      }
      socialAccountRecord = newAccount;
    }

    const [updatedPlayer] = await db
      .update(playerTable)
      .set({
        socialAccountId: socialAccountRecord.id,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(playerTable.uuid, pendingBinding.playerUID))
      .returning();

    if (!updatedPlayer) {
      throw new Error(`Player with UUID ${pendingBinding.playerUID} not found`);
    }

    // 这个不着急所以放在最后
    await BindingService.performAutoRename(
      socialUid,
      updatedPlayer.name,
      socialNickname,
      connection,
      target,
      bindingConfig,
    );
  }

  private static async performAutoRename(
    socialUid: string,
    playerName: string,
    socialNickname: string | null,
    connection: PlatformSender,
    target: Target,
    bindingConfig: Awaited<ReturnType<typeof getConfig>>,
  ): Promise<void> {
    if (!bindingConfig.autoRenameEnabled) {
      return;
    }

    const resolvedNickname = socialNickname?.trim() ?? socialUid;
    const newName = renderBindRenameName(bindingConfig.autoRenameNameTemplate, {
      platform: connection.platformType,
      playerName,
      socialNickname: resolvedNickname,
      socialUid,
    }).trim();

    if (newName.length === 0) {
      logger.error("自动改名失败：改名模板渲染结果为空");
      return;
    }

    try {
      await connection.setGroupCard(target, socialUid, newName);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error({ errorMessage }, "自动改名失败：调用群名片接口失败");
    }
  }

  public static async handleGroupLeave(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    const { platform, userId, guildId } = session;
    console.log("handleGroupLeave", { guildId, platform, userId });
    if (!isPlatformType(platform) || !userId || !guildId) {
      return false;
    }

    const serversWithBindingConfig = await db.query.targetTable.findMany({
      where: and(eq(targetTable.guildId, guildId)),
      with: {
        server: {
          with: {
            playerServers: true,
          },
        },
      },
    });

    const matchingServers = serversWithBindingConfig
      .filter(
        (entry) =>
          entry.server.botId === connection.botId &&
          entry.server.bindingConfig.allowGroupUnbind,
      )
      .map((t) => t.server);

    if (matchingServers.length === 0) {
      return false;
    }

    const socialAccountRecord = await db.query.socialAccountTable.findFirst({
      where: and(
        eq(socialAccountTable.uid, userId),
        eq(socialAccountTable.platform, platform),
      ),
      with: {
        players: true,
      },
    });
    if (!socialAccountRecord) {
      return false;
    }

    const [playerRecord] = socialAccountRecord.players;
    if (!playerRecord) {
      return false;
    }

    const unbindPromises = matchingServers.map(async (s) => {
      try {
        const { playerUUID, socialUID } = await BindingService.performUnbind(
          platform,
          userId,
          playerRecord.name,
        );
        logger.info(
          {
            playerUUID,
            socialUID,
          },
          "玩家解绑成功",
        );

        const server_session = connectionManager.getConnectionByServerId(s.id);

        if (server_session) {
          await server_session.kickPlayer(
            playerUUID,
            renderUnbindKick(s.bindingConfig.unbindkickMsg, socialUID),
          );
        } else {
          logger.warn(
            `服务器 ${s.name} 不在线，无法踢出玩家 ${playerRecord.name}`,
          );
        }
        await session.send(
          renderUnbindSuccess(
            s.bindingConfig.unbindSuccessMsg,
            playerRecord.name,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error({ errorMessage }, "无法处理解绑");
        await session.send(
          renderUnbindFail(
            s.bindingConfig.unbindFailMsg,
            playerRecord.name,
            errorMessage,
          ),
        );
      }
    });

    await Promise.all(unbindPromises);
    return true;
  }

  private static async processUnbindMessage(
    connection: PlatformSender,
    ctx: Session,
  ): Promise<boolean> {
    const { platform, userId, channelId } = ctx;
    if (!isPlatformType(platform) || !userId || !channelId) {
      return false;
    }

    const targets = await db.query.targetTable.findMany({
      where: and(eq(targetTable.channelId, channelId)),
      with: {
        server: {
          with: {
            playerServers: true,
          },
        },
      },
    });

    const matchingServers = targets
      .filter((entry) => entry.server.botId === connection.botId)
      .map((entry) => entry.server)
      .filter(
        ({ bindingConfig }) =>
          bindingConfig.allowUnbind &&
          ctx.content?.startsWith(bindingConfig.unbindPrefix) === true,
      );

    if (matchingServers.length === 0) {
      return false;
    }

    const unbindPromises = matchingServers.map(async (server) => {
      const { content } = ctx;
      if (content === undefined) {
        return;
      }
      const playerName = content
        .slice(server.bindingConfig.unbindPrefix.length)
        .trim();
      if (!playerName) {
        return;
      }

      try {
        const { playerUUID, socialUID } = await BindingService.performUnbind(
          platform,
          userId,
          playerName,
        );
        logger.info(
          {
            playerUUID,
            socialUID,
          },
          "玩家解绑成功",
        );

        const server_session = connectionManager.getConnectionByServerId(
          server.id,
        );
        if (server_session) {
          await server_session.kickPlayer(
            playerUUID,
            renderUnbindKick(server.bindingConfig.unbindkickMsg, socialUID),
          );
        } else {
          logger.warn(
            `服务器 ${server.name} 不在线，无法踢出玩家 ${playerName}`,
          );
        }
        await ctx.send(
          renderUnbindSuccess(
            server.bindingConfig.unbindSuccessMsg,
            playerName,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error({ errorMessage }, "无法处理解绑");
        await ctx.send(
          renderUnbindFail(
            server.bindingConfig.unbindFailMsg,
            playerName,
            errorMessage,
          ),
        );
      }
    });

    await Promise.all(unbindPromises);
    return true;
  }

  private static async performUnbind(
    platformType: PlatformType,
    socialUid: string,
    playerName: string,
  ): Promise<{
    playerUUID: string;
    socialUID: string;
  }> {
    const socialAccountRecord = await db.query.socialAccountTable.findFirst({
      where: and(
        eq(socialAccountTable.uid, socialUid),
        eq(socialAccountTable.platform, platformType),
      ),
      with: {
        players: true,
      },
    });

    if (!socialAccountRecord) {
      throw new Error("未找到关联的社交账号");
    }

    const playerRecord = socialAccountRecord.players.find(
      (p) => p.name === playerName,
    );
    if (!playerRecord) {
      throw new Error("未找到匹配的玩家");
    }

    await db
      .update(playerTable)
      .set({
        socialAccountId: null,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(playerTable.id, playerRecord.id));

    return {
      playerUUID: playerRecord.uuid,
      socialUID: socialAccountRecord.uid,
    };
  }
}

export const bindingService = BindingService.getInstance();

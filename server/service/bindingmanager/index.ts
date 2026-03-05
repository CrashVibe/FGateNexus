import { and, eq, sql } from "drizzle-orm";
import type { Session } from "koishi";
import { db } from "~~/server/db/client";
import { players, servers, socialAccounts, targets } from "~~/server/db/schema";
import type { BotConnection } from "~~/server/service/chatbridge";
import { pluginBridge } from "~~/server/service/mcwsbridge/mcws-bridge";
import { AdapterType } from "~~/shared/schemas/adapter";
import {
  renderBindFail,
  renderBindSuccess,
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess,
} from "~~/shared/utils/template/binding";

import { generateVerificationCode } from "#shared/utils/binding";

import { getConfig } from "./config";

const isAdapterType = (
  value: string | null | undefined,
): value is AdapterType =>
  value !== null &&
  value !== undefined &&
  (Object.values(AdapterType) as string[]).includes(value);

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
  private pendingBindings: Map<number, Set<PendingBinding>>;
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
    const serversWithAdapters = await db.query.servers.findFirst({
      where: eq(servers.id, serverID),
      with: {
        adapter: true,
      },
    });
    if (!serversWithAdapters) {
      throw new Error("服务器未找到");
    } else if (!serversWithAdapters.adapter) {
      throw new Error("服务器适配器配置未找到");
    }

    const { adapter } = serversWithAdapters;

    this.cleanUpExpiredBindings();

    // 确保 serverID playerUID 唯一性 PendingBinding
    const existingBindings = this.pendingBindings.get(adapter.id) ?? new Set();
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
      botID: adapter.id,
      expiresAt,
      message: message,
      playerNickname,
      playerUID,
      serverID,
    };

    existingBindings.add(newBinding);
    this.pendingBindings.set(adapter.id, existingBindings);

    return { expiresAt, has: false, message: message };
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
    connection: BotConnection,
    ctx: Session,
  ): Promise<boolean> {
    this.cleanUpExpiredBindings();

    const bindings = this.pendingBindings.get(connection.adapterID);
    let hit = false;
    if (bindings) {
      for (const binding of bindings) {
        if (binding.message !== ctx.content) {
          continue;
        }
        const { platform, userId, channelId } = ctx;
        if (
          !isAdapterType(platform) ||
          userId === undefined ||
          userId === "" ||
          channelId === undefined ||
          channelId === ""
        ) {
          continue;
        }

        const server_list = await db.query.targets.findFirst({
          where: and(
            eq(targets.serverId, binding.serverID),
            eq(targets.targetId, channelId),
          ),
          with: {
            server: true,
          },
        });
        if (!server_list?.server) {
          continue;
        }

        const bindingConfig = await getConfig(binding.serverID);
        try {
          await BindingService.performBinding(
            binding,
            platform,
            userId,
            ctx.username,
          );
          // 删除已处理的 pending binding
          bindings.delete(binding);
          await ctx.send(
            renderBindSuccess(
              bindingConfig.bindSuccessMsg,
              binding.playerNickname,
            ),
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error({ errorMessage }, "无法处理绑定");
          await ctx.send(
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
    if (await BindingService.processUnbindMessage(connection, ctx)) {
      return true;
    }
    return hit;
  }

  public static async performBinding(
    pendingBinding: PendingBinding,
    adapterType: AdapterType,
    socialUid: string,
    socialNickname: string | null,
  ): Promise<void> {
    let socialAccount = await db.query.socialAccounts.findFirst({
      where: and(
        eq(socialAccounts.uid, socialUid),
        eq(socialAccounts.adapterType, adapterType),
      ),
    });

    if (!socialAccount) {
      const [newAccount] = await db
        .insert(socialAccounts)
        .values({
          adapterType,
          nickname: socialNickname,
          uid: socialUid,
        })
        .returning();
      if (!newAccount) {
        throw new Error(`社交账号 ${socialUid} 创建失败`);
      }
      socialAccount = newAccount;
    }

    const [updatedPlayer] = await db
      .update(players)
      .set({
        socialAccountId: socialAccount.id,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(players.uuid, pendingBinding.playerUID))
      .returning();

    if (!updatedPlayer) {
      throw new Error(`Player with UUID ${pendingBinding.playerUID} not found`);
    }
  }

  private static async processUnbindMessage(
    connection: BotConnection,
    ctx: Session,
  ): Promise<boolean> {
    const { platform, userId, channelId } = ctx;
    if (
      !isAdapterType(platform) ||
      userId === undefined ||
      userId === "" ||
      channelId === undefined ||
      channelId === ""
    ) {
      return false;
    }

    const serversWithBindingConfig = await db.query.targets.findMany({
      where: and(eq(targets.targetId, channelId)),
      with: {
        server: {
          with: {
            playerServers: true,
          },
        },
      },
    });

    const matchingServers = serversWithBindingConfig
      .filter((target) => target.server.adapterId === connection.adapterID)
      .map((target) => target.server)
      .filter(
        (server) =>
          server.bindingConfig.allowUnbind &&
          ctx.content?.startsWith(server.bindingConfig.unbindPrefix) === true,
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
        await pluginBridge.kickPlayer(
          server.id,
          playerUUID,
          renderUnbindKick(server.bindingConfig.unbindkickMsg, socialUID),
        );
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

  public static async handleGroupLeave(
    connection: BotConnection,
    ctx: Session,
  ): Promise<boolean> {
    const { platform, userId, channelId } = ctx;
    if (
      !isAdapterType(platform) ||
      userId === undefined ||
      userId === "" ||
      channelId === undefined ||
      channelId === ""
    ) {
      return false;
    }

    const serversWithBindingConfig = await db.query.targets.findMany({
      where: and(eq(targets.targetId, channelId)),
      with: {
        server: {
          with: {
            playerServers: true,
          },
        },
      },
    });

    const matchingServers = serversWithBindingConfig
      .filter((target) => target.server.adapterId === connection.adapterID)
      .map((target) => target.server)
      .filter((server) => server.bindingConfig.allowGroupUnbind);

    if (matchingServers.length === 0) {
      return false;
    }

    const socialAccount = await db.query.socialAccounts.findFirst({
      where: and(
        eq(socialAccounts.uid, userId),
        eq(socialAccounts.adapterType, platform),
      ),
      with: {
        players: true,
      },
    });
    if (!socialAccount) {
      return false;
    }

    const [player] = socialAccount.players;
    if (!player) {
      return false;
    }

    const unbindPromises = matchingServers.map(async (server) => {
      try {
        const { playerUUID, socialUID } = await BindingService.performUnbind(
          platform,
          userId,
          player.name,
        );
        logger.info(
          {
            playerUUID,
            socialUID,
          },
          "玩家解绑成功",
        );
        await pluginBridge.kickPlayer(
          server.id,
          playerUUID,
          renderUnbindKick(server.bindingConfig.unbindkickMsg, socialUID),
        );
        await ctx.send(
          renderUnbindSuccess(
            server.bindingConfig.unbindSuccessMsg,
            player.name,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error({ errorMessage }, "无法处理解绑");
        await ctx.send(
          renderUnbindFail(
            server.bindingConfig.unbindFailMsg,
            player.name,
            errorMessage,
          ),
        );
      }
    });

    await Promise.all(unbindPromises);
    return true;
  }

  private static async performUnbind(
    adapterType: AdapterType,
    socialUid: string,
    playerName: string,
  ): Promise<{
    playerUUID: string;
    socialUID: string;
  }> {
    const socialAccount = await db.query.socialAccounts.findFirst({
      where: and(
        eq(socialAccounts.uid, socialUid),
        eq(socialAccounts.adapterType, adapterType),
      ),
      with: {
        players: true,
      },
    });

    if (!socialAccount) {
      throw new Error("未找到关联的社交账号");
    }

    const player = socialAccount.players.find((p) => p.name === playerName);
    if (!player) {
      throw new Error("未找到匹配的玩家");
    }

    await db
      .update(players)
      .set({
        socialAccountId: null,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(players.id, player.id));

    return {
      playerUUID: player.uuid,
      socialUID: socialAccount.uid,
    };
  }
}

export const bindingService = BindingService.getInstance();

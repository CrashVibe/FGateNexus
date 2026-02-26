import { generateVerificationCode } from "#shared/utils/binding";
import type { BotConnection } from "../chatbridge/chatbridge";
import { and, eq, sql } from "drizzle-orm";
import type { Session } from "koishi";
import { db } from "~~/server/db/client";
import { players, servers, socialAccounts, targets } from "~~/server/db/schema";
import { AdapterType } from "~~/shared/schemas/adapter";
import {
  renderBindFail,
  renderBindSuccess,
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess
} from "~~/shared/utils/template/binding";

import { pluginBridge } from "../mcwsbridge/MCWSBridge";

import { getConfig } from "./config";

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

class BindingService {
  private static instance: BindingService;
  private pendingBindings: Map<number, Set<PendingBinding>>; // Bot ID -> PendingBinding
  private constructor() {
    this.pendingBindings = new Map();
  }

  public static getInstance(): BindingService {
    if (!BindingService.instance) {
      BindingService.instance = new BindingService();
    }
    return BindingService.instance;
  }

  /**
   * 添加待处理绑定
   */
  public async addPendingBinding(
    serverID: number,
    playerUID: string,
    playerNickname: string
  ): Promise<{ has: boolean; message: string; expiresAt: Date }> {
    const bindingConfig = await getConfig(serverID);
    const serversWithAdapters = await db.query.servers.findFirst({
      with: {
        adapter: true
      },
      where: eq(servers.id, serverID)
    });
    if (!serversWithAdapters) {
      throw new Error("服务器未找到");
    } else if (!serversWithAdapters.adapter) {
      throw new Error("服务器适配器配置未找到");
    }

    const { adapter } = serversWithAdapters;

    this.cleanUpExpiredBindings();

    // 确保 serverID playerUID 唯一性 PendingBinding
    const existingBindings = this.pendingBindings.get(adapter.id) || new Set();
    const pendingBinding = Array.from(existingBindings).find(
      (binding) => binding.serverID === serverID && binding.playerUID === playerUID
    );
    if (pendingBinding) {
      return { has: true, message: pendingBinding.message, expiresAt: pendingBinding.expiresAt };
    }

    const message = bindingConfig.prefix + generateVerificationCode(bindingConfig.codeMode, bindingConfig.codeLength);
    const expiresAt = new Date(Date.now() + bindingConfig.codeExpire * 60 * 1000);

    const newBinding: PendingBinding = {
      serverID,
      playerUID,
      botID: adapter.id,
      playerNickname,
      message: message,
      expiresAt
    };

    existingBindings.add(newBinding);
    this.pendingBindings.set(adapter.id, existingBindings);

    return { has: false, message: message, expiresAt };
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
  public async processMessage(connection: BotConnection, ctx: Session): Promise<boolean> {
    this.cleanUpExpiredBindings();

    const bindings = this.pendingBindings.get(connection.adapterID);
    let hit = false;
    if (bindings) {
      for (const binding of bindings) {
        if (binding.message !== ctx.content) continue;
        if (!Object.values(AdapterType).includes(ctx.platform as AdapterType) || !ctx.userId || !ctx.channelId) {
          continue;
        }

        const server_list = await db.query.targets.findFirst({
          where: and(eq(targets.serverId, binding.serverID), eq(targets.targetId, ctx.channelId)),
          with: {
            server: true
          }
        });
        if (!server_list?.server) continue;

        const bindingConfig = await getConfig(binding.serverID);
        try {
          await this.performBinding(binding, ctx.platform as AdapterType, ctx.userId, ctx.username);
          // 删除已处理的 pending binding
          bindings.delete(binding);
          await ctx.send(renderBindSuccess(bindingConfig.bindSuccessMsg, binding.playerNickname));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error({ errorMessage }, "无法处理绑定");
          await ctx.send(renderBindFail(bindingConfig.bindFailMsg, binding.playerNickname, errorMessage));
        }

        hit = true;
      }
    }
    if (await this.processUnbindMessage(connection, ctx)) return true;
    return hit;
  }

  public async performBinding(
    pendingBinding: PendingBinding,
    adapterType: AdapterType,
    socialUid: string,
    socialNickname: string | null
  ): Promise<void> {
    let socialAccount = await db.query.socialAccounts.findFirst({
      where: and(eq(socialAccounts.uid, socialUid), eq(socialAccounts.adapterType, adapterType))
    });

    if (!socialAccount) {
      const [newAccount] = await db
        .insert(socialAccounts)
        .values({
          uid: socialUid,
          adapterType,
          nickname: socialNickname
        })
        .returning();
      if (!newAccount) {
        throw new Error(`社交账号 ${socialUid} 创建失败`);
      }
      socialAccount = newAccount;
    }
    if (!socialAccount) {
      throw new Error(`社交账号 ${socialUid} 创建失败`);
    }

    const [updatedPlayer] = await db
      .update(players)
      .set({
        socialAccountId: socialAccount.id,
        updatedAt: sql`(unixepoch())`
      })
      .where(eq(players.uuid, pendingBinding.playerUID))
      .returning();

    if (!updatedPlayer) {
      throw new Error(`Player with UUID ${pendingBinding.playerUID} not found`);
    }
  }

  private async processUnbindMessage(connection: BotConnection, ctx: Session): Promise<boolean> {
    if (!Object.values(AdapterType).find((key) => key === ctx.platform) || !ctx.userId || !ctx.channelId) {
      return false;
    }

    const serversWithBindingConfig = await db.query.targets.findMany({
      where: and(eq(targets.targetId, ctx.channelId)),
      with: {
        server: {
          with: {
            playerServers: true
          }
        }
      }
    });

    const matchingServers = serversWithBindingConfig
      .filter((target) => target.server && target.server.adapterId === connection.adapterID)
      .map((target) => target.server!)
      .filter(
        (server) => server.bindingConfig.allowUnbind && ctx.content?.startsWith(server.bindingConfig.unbindPrefix)
      );

    if (matchingServers.length === 0) {
      return false;
    }

    const unbindPromises = matchingServers.map(async (server) => {
      try {
        const playerName = ctx.content!.slice(server.bindingConfig.unbindPrefix.length).trim();
        if (!playerName) {
          return;
        }

        const { playerUUID, socialUID } = await this.performUnbind(
          ctx.platform as AdapterType,
          ctx.userId!,
          playerName
        );
        logger.info(
          {
            playerUUID,
            socialUID
          },
          "玩家解绑成功"
        );
        await pluginBridge.kickPlayer(
          server.id,
          playerUUID,
          renderUnbindKick(server.bindingConfig.unbindkickMsg, socialUID)
        );
        await ctx.send(renderUnbindSuccess(server.bindingConfig.unbindSuccessMsg, playerName));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ errorMessage }, "无法处理解绑");
        const playerName = ctx.content!.slice(server.bindingConfig.unbindPrefix.length).trim();
        await ctx.send(renderUnbindFail(server.bindingConfig.unbindFailMsg, playerName, errorMessage));
      }
    });

    await Promise.all(unbindPromises);
    return true;
  }

  public async handleGroupLeave(connection: BotConnection, ctx: Session): Promise<boolean> {
    if (!Object.values(AdapterType).find((key) => key === ctx.platform) || !ctx.userId || !ctx.channelId) {
      return false;
    }

    const serversWithBindingConfig = await db.query.targets.findMany({
      where: and(eq(targets.targetId, ctx.channelId)),
      with: {
        server: {
          with: {
            playerServers: true
          }
        }
      }
    });

    const matchingServers = serversWithBindingConfig
      .filter((target) => target.server && target.server.adapterId === connection.adapterID)
      .map((target) => target.server!)
      .filter((server) => server.bindingConfig.allowGroupUnbind);

    if (matchingServers.length === 0) {
      return false;
    }

    const socialAccount = await db.query.socialAccounts.findFirst({
      where: and(eq(socialAccounts.uid, ctx.userId), eq(socialAccounts.adapterType, ctx.platform as AdapterType)),
      with: {
        players: true
      }
    });
    if (!socialAccount) {
      return false;
    }

    const player = socialAccount.players[0];
    if (!player) {
      return false;
    }

    const unbindPromises = matchingServers.map(async (server) => {
      try {
        const { playerUUID, socialUID } = await this.performUnbind(
          ctx.platform as AdapterType,
          ctx.userId!,
          player.name
        );
        logger.info(
          {
            playerUUID,
            socialUID
          },
          "玩家解绑成功"
        );
        await pluginBridge.kickPlayer(
          server.id,
          playerUUID,
          renderUnbindKick(server.bindingConfig.unbindkickMsg, socialUID)
        );
        await ctx.send(renderUnbindSuccess(server.bindingConfig.unbindSuccessMsg, player.name));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ errorMessage }, "无法处理解绑");
        await ctx.send(renderUnbindFail(server.bindingConfig.unbindFailMsg, player.name, errorMessage));
      }
    });

    await Promise.all(unbindPromises);
    return true;
  }

  private async performUnbind(
    adapterType: AdapterType,
    socialUid: string,
    playerName: string
  ): Promise<{
    playerUUID: string;
    socialUID: string;
  }> {
    const socialAccount = await db.query.socialAccounts.findFirst({
      where: and(eq(socialAccounts.uid, socialUid), eq(socialAccounts.adapterType, adapterType)),
      with: {
        players: true
      }
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
        updatedAt: sql`(unixepoch())`
      })
      .where(eq(players.id, player.id));

    return {
      playerUUID: player.uuid,
      socialUID: socialAccount.uid
    };
  }
}

export const bindingService = BindingService.getInstance();

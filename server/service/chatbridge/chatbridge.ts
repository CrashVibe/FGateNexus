import type { AdapterConfig } from "#shared/schemas/adapter";
import type { OneBotConfig } from "#shared/schemas/adapter/onebot.ts";
import type { Bot, ForkScope, Session } from "koishi";

import { HTTP } from "@koishijs/plugin-http";
import { Server } from "@koishijs/plugin-server";
import { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import { Context, Logger as klog } from "koishi";
import { db } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { getConfigManager } from "~~/server/utils/config";
import { AdapterType } from "~~/shared/schemas/adapter";

import { bindingService } from "../bindingmanager";
import { messageRouter } from "../messageRouter";

/**
 * Bot 连接信息
 */
export type BotConnection = {
  /**
   * bot 的实例
   */
  pluginInstance: ForkScope;
  /**
   * 适配器 ID
   */
  adapterID: number;
  /**
   * 适配器类型
   */
  adapterType: AdapterType;
  /**
   * 配置
   */
  config: AdapterConfig;
};

/**
 * 聊天桥接
 */
export class ChatBridge {
  static instance: ChatBridge | null = null;
  private connectionMap = new Map<number, BotConnection>(); // Bot ID -> Bot Connection
  private app: Context;
  private pluginsContext: ForkScope[] = [];

  private constructor() {
    this.app = new Context();
  }

  public static getInstance(): ChatBridge {
    if (!ChatBridge.instance) {
      ChatBridge.instance = new ChatBridge();
    }
    return ChatBridge.instance;
  }

  public async init(): Promise<void> {
    const config = (await getConfigManager()).getConfig();
    klog.levels.base = 1;
    this.pluginsContext.push(
      this.app.plugin(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Server as any,
        Server.Config({
          host: config.koishi.host,
          port: config.koishi.port
        })
      )
    );
    logger.info(`Koishi 服务启动 http://${config.koishi.host}:${config.koishi.port}`);
    this.pluginsContext.push(this.app.plugin(HTTP));
    await this.app.start();
    const result = await db.select().from(adapters);
    for (const adapter of result) {
      if (!adapter.enabled) {
        continue;
      }
      this.addBot(adapter.id, adapter.type, adapter.config);
    }
    this.app.on("message", async (session) => {
      const connection = Array.from(this.connectionMap.values()).find(
        (conn) => conn.config.selfId === session.bot.selfId
      );
      if (connection && session.content) {
        await this.receiveMessage(connection, session);
      }
    });
    this.app.on("guild-member-removed", async (session) => {
      const connection = Array.from(this.connectionMap.values()).find(
        (conn) => conn.config.selfId === session.bot.selfId
      );
      if (connection) {
        await this.handleGroupLeave(connection, session);
      }
    });
  }

  public async close(): Promise<void> {
    for (const pluginContext of this.pluginsContext) {
      pluginContext.dispose();
    }
    for (const connection of this.connectionMap.values()) {
      connection.pluginInstance.dispose();
    }
    this.connectionMap.clear();
    await this.app.stop();
  }

  /**
   * 创建 Onebot Bot 实例
   */
  public createOnebot(config: OneBotConfig): ForkScope {
    logger.debug({ config }, "创建 Onebot Bot 实例");
    if (config.protocol === "ws-reverse") {
      return this.app.plugin(OneBot, {
        ...config,
        responseTimeout: 5000
      });
    } else {
      return this.app.plugin(OneBot, {
        ...config
      });
    }
  }

  /**
   * 移除 Bot 连接
   */
  public removeBot(adapterID: number): void {
    const connection = this.connectionMap.get(adapterID);
    if (connection) {
      connection.pluginInstance.dispose();
      this.connectionMap.delete(adapterID);
      logger.info(`已移除 Bot 连接：${adapterID}`);
      return;
    }
    throw new Error(`找不到 Bot 连接：${adapterID}`);
  }

  /**
   * 添加 Bot 连接
   */
  public addBot(adapterID: number, adapterType: AdapterType, config: OneBotConfig): void {
    if (this.connectionMap.has(adapterID)) {
      throw new Error(`Bot 连接已存在：${adapterID}`);
    }
    if (adapterType === AdapterType.Onebot) {
      const bot = this.createOnebot(config);
      this.connectionMap.set(adapterID, { pluginInstance: bot, adapterID: adapterID, adapterType, config });
      logger.info(`已添加 Bot 连接：${adapterID}`);
    } else {
      throw new Error(`不支持的适配器类型 (可能版本太低了吧？): ${String(adapterType)}`);
    }
  }

  /**
   * 获取 Bot 连接数据
   */
  public getConnectionData(adapterID: number): BotConnection | undefined {
    return this.connectionMap.get(adapterID);
  }

  /**
   * 检查 Bot 是否在线
   */
  public isOnline(adapterID: number): boolean {
    const bot = this.findBot(adapterID);
    return bot.status === 1; // 1 - 在线状态
  }

  /**
   * 查找 Bot 实例
   */
  public findBot(adapterID: number): Bot {
    const connection = this.connectionMap.get(adapterID);
    if (!connection) {
      throw new Error(`找不到 Bot 连接：${adapterID}`);
    }
    let bot: Bot | undefined;

    if (connection.adapterType === AdapterType.Onebot) {
      bot = this.app.bots.find((bot) => bot.selfId === connection.config.selfId);
    } else {
      throw new Error(`不支持的适配器类型 (可能版本太低了吧？): ${String(connection.adapterType)}`);
    }

    if (!bot) {
      throw new Error(`找不到 Bot 实例：${connection.config.selfId}`);
    }
    return bot;
  }

  /**
   * 更新 Bot 配置
   */
  public updateConfig(adapterID: number, config: OneBotConfig): Promise<void> {
    const connection = this.connectionMap.get(adapterID);
    if (!connection) {
      throw new Error(`找不到 Bot 连接：${adapterID}`);
    }
    connection.config = config;
    connection.pluginInstance.update(config, true);
    return Promise.resolve();
  }

  /**
   * 接收消息
   */
  public async receiveMessage(connection: BotConnection, session: Session): Promise<void> {
    if (await bindingService.processMessage(connection, session)) {
      return; // 绑定服务已经处理它了，这条消息已经没有它的利用价值了哈哈
    }
    await Promise.all([messageRouter.handlePlatformMessage(connection, session)]);
  }

  /**
   * 处理离群事件
   */
  private async handleGroupLeave(connection: BotConnection, ctx: Session): Promise<void> {
    if (await bindingService.handleGroupLeave(connection, ctx)) {
      return;
    }
  }

  /**
   * 发送消息到指定目标
   */
  public async sendToTarget(
    botConnection: BotConnection,
    targetId: string,
    targetType: "group" | "private",
    message: string
  ): Promise<void> {
    try {
      const bot = this.findBot(botConnection.adapterID);

      if (targetType === "group") {
        await bot.sendMessage(targetId, message);
      } else if (targetType === "private") {
        await bot.sendPrivateMessage(targetId, message);
      }
    } catch (error) {
      logger.error({ error, targetType, targetId }, `[MessageRouter] 发送消息失败`);
    }
  }
}

export const chatBridge = ChatBridge.getInstance();

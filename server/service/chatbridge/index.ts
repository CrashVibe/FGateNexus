import { HTTP } from "@koishijs/plugin-http";
import { Server } from "@koishijs/plugin-server";
import { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import type { Element, ForkScope, Session } from "koishi";
import { Context, Logger as log } from "koishi";
import { db } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import {
  bindingService,
  BindingService,
} from "~~/server/service/bindingmanager";
import { handlePlatformMessage } from "~~/server/service/message-router";
import { configManager } from "~~/server/utils/config";

import type { AdapterConfig } from "#shared/model/adapter/schema";
import { AdapterType } from "#shared/model/adapter/schema";
import type { OneBotConfig } from "#shared/model/adapter/schema/onebot";

/**
 * Bot 连接信息
 */
export interface BotConnection {
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
}

type AdapterBot = Session["bot"];

interface SetGroupCardHandlerContext {
  bot: AdapterBot;
  groupId: number;
  userId: number;
  card: string;
}

type SetGroupCardHandler = (
  context: SetGroupCardHandlerContext,
) => Promise<void>;

/**
 * 聊天桥接
 */
class ChatBridge {
  static instance: ChatBridge | null = null;
  // Bot ID -> Bot Connection
  private readonly connectionMap = new Map<number, BotConnection>();
  private readonly setGroupCardHandlers: Partial<
    Record<AdapterType, SetGroupCardHandler>
  > = {
    [AdapterType.Onebot]: async ({ bot, groupId, userId, card }) => {
      if (!(bot instanceof OneBot)) {
        throw new Error("OneBot 机器人实例类型不匹配，无法修改群名片");
      }
      await bot.internal.setGroupCard(groupId, userId, card);
    },
  };
  private readonly app: Context;
  private readonly pluginsContext: ForkScope[] = [];

  private constructor() {
    this.app = new Context();
  }

  public static getInstance(): ChatBridge {
    ChatBridge.instance ??= new ChatBridge();
    return ChatBridge.instance;
  }

  public async init(): Promise<void> {
    const { config } = configManager;
    log.levels.base = 1;
    this.pluginsContext.push(
      // @ts-expect-error -- @cordisjs/plugin-server 与 Koishi plugin() 重载存在 Function.prototype.apply 结构性误匹配
      this.app.plugin(Server, {
        host: config.koishi.host,
        port: config.koishi.port,
      }),
    );
    logger.info(
      `Koishi 服务启动 http://${config.koishi.host}:${config.koishi.port}`,
    );
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
      const connection = [...this.connectionMap.values()].find(
        (conn) => conn.config.selfId === session.bot.selfId,
      );
      if (
        connection &&
        session.content !== undefined &&
        session.content !== ""
      ) {
        await ChatBridge.receiveMessage(connection, session);
      }
    });
    this.app.on("guild-member-removed", async (session) => {
      const connection = [...this.connectionMap.values()].find(
        (conn) => conn.config.selfId === session.bot.selfId,
      );
      if (connection) {
        await ChatBridge.handleGroupLeave(connection, session);
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
        responseTimeout: 5000,
      });
    }
    return this.app.plugin(OneBot, {
      ...config,
    });
  }

  /**
   * 移除 Bot 连接
   */
  public removeBot(botID: number): void {
    const connection = this.connectionMap.get(botID);
    if (connection) {
      connection.pluginInstance.dispose();
      this.connectionMap.delete(botID);
      logger.info(`已移除 Bot 连接：${botID}`);
      return;
    }
    throw new Error(`找不到 Bot 连接：${botID}`);
  }

  /**
   * 添加 Bot 连接
   */
  public addBot(
    botID: number,
    adapterType: AdapterType,
    config: OneBotConfig,
  ): void {
    if (this.connectionMap.has(botID)) {
      throw new Error(`Bot 连接已存在：${botID}`);
    }
    if (adapterType === AdapterType.Onebot) {
      const bot = this.createOnebot(config);
      this.connectionMap.set(botID, {
        adapterID: botID,
        adapterType,
        config,
        pluginInstance: bot,
      });
      logger.info(`已添加 Bot 连接：${botID}`);
    } else {
      throw new Error(
        `不支持的适配器类型 (可能版本太低了吧？): ${String(adapterType)}`,
      );
    }
  }

  /**
   * 获取 Bot 连接数据
   */
  public getConnectionData(botID: number): BotConnection | undefined {
    return this.connectionMap.get(botID);
  }

  /**
   * 检查 Bot 是否在线
   */
  public isOnline(botID: number): boolean {
    const bot = this.findBot(botID);
    return bot.status === 1;
  }

  /**
   * 查找 Bot 实例
   */
  public findBot(botID: number): (typeof this.app.bots)[0] {
    const connection = this.connectionMap.get(botID);
    if (!connection) {
      throw new Error(`找不到 Bot 连接：${botID}`);
    }
    let bot: (typeof this.app.bots)[0] | undefined;

    if (connection.adapterType === AdapterType.Onebot) {
      bot = this.app.bots.find((b) => b.selfId === connection.config.selfId);
    } else {
      throw new Error(
        `不支持的适配器类型 (可能版本太低了吧？): ${String(connection.adapterType)}`,
      );
    }

    if (!bot) {
      throw new Error(`找不到 Bot 实例：${connection.config.selfId}`);
    }
    return bot;
  }

  /**
   * 更新 Bot 配置
   */
  public updateConfig(adapterID: number, config: OneBotConfig): void {
    const connection = this.connectionMap.get(adapterID);
    if (!connection) {
      throw new Error(`找不到 Bot 连接：${adapterID}`);
    }
    connection.config = config;
    connection.pluginInstance.update(config, true);
  }

  /**
   * 接收消息
   */
  public static async receiveMessage(
    connection: BotConnection,
    session: Session,
  ): Promise<void> {
    if (await bindingService.processMessage(connection, session)) {
      // 绑定服务已经处理它了，这条消息已经没有它的利用价值了哈哈
      return;
    }
    await handlePlatformMessage(connection, session);
  }

  /**
   * 处理离群事件
   */
  private static async handleGroupLeave(
    connection: BotConnection,
    ctx: Session,
  ): Promise<void> {
    await BindingService.handleGroupLeave(connection, ctx);
  }

  /**
   * 发送消息到指定目标
   */
  public async sendToTarget(
    botConnection: BotConnection,
    targetId: string,
    targetType: "group" | "private",
    message: Element.Fragment,
  ): Promise<void> {
    try {
      const bot = this.findBot(botConnection.adapterID);

      if (targetType === "group") {
        await bot.sendMessage(targetId, message);
      } else if (targetType === "private") {
        await bot.sendPrivateMessage(targetId, message);
      }
    } catch (error) {
      logger.error(
        { error, targetId, targetType },
        `[MessageRouter] 发送消息失败`,
      );
    }
  }

  /**
   * 修改群成员名片
   */
  public async setGroupCard(
    botID: number,
    groupId: number,
    userId: number,
    card: string,
  ): Promise<void> {
    const connection = this.getConnectionData(botID);
    if (!connection) {
      throw new Error(`找不到 Bot 连接：${botID}`);
    }

    const handler = this.setGroupCardHandlers[connection.adapterType];
    if (!handler) {
      throw new Error(
        `当前适配器不支持修改群名片：${String(connection.adapterType)}`,
      );
    }

    const bot = this.findBot(botID);
    await handler({ bot, card, groupId, userId });
  }
}

export const chatBridge = ChatBridge.getInstance();

import { HTTP } from "@koishijs/plugin-http";
import { Server } from "@koishijs/plugin-server";
import type { ForkScope, Session } from "koishi";
import { Context, Logger as log } from "koishi";
import { db } from "~~/server/db/client";
import { getServerByIdWithBotAndTargets } from "~~/server/db/queries/server";
import { botTable } from "~~/server/db/schema";
import type { Target } from "~~/server/db/schema";
import { bindingService } from "~~/server/service/bindingmanager";
import { handlePlatformMessage } from "~~/server/service/chatbridge/message-router";
import { configManager } from "~~/server/utils/config";

import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import type { MCEvent, MCEventType } from "../mcwsbridge/types";
import { BotFactory } from "./bot-factory";
import { ConnectionStore } from "./connection-store";
import { eventConfigMap } from "./sender/event-config-map";
import type { PlatformSender } from "./sender/types";

type EventHandlerMap = {
  [K in MCEventType]: (
    sender: PlatformSender,
    event: MCEvent<K>,
    target: Target,
  ) => Promise<void>;
};

const handlerMap: EventHandlerMap = {
  "execute.command": async (s, e, t) => s.onCommand(e, t),
  "player.chat": async (s, e, t) => s.onChat(e, t),
  "player.death": async (s, e, t) => s.onDeath(e, t),
  "player.join": async (s, e, t) => s.onJoin(e, t),
  "player.leave": async (s, e, t) => s.onLeave(e, t),
  "system.notify": async (s, e, t) => s.onNotify(e, t),
};

/**
 * 聊天桥接
 */
class ChatBridge {
  static instance: ChatBridge | null = null;
  // Bot ID → Bot Connection
  private readonly connections = new ConnectionStore();
  private readonly app: Context;
  private readonly pluginsContext: ForkScope[] = [];
  private readonly botFactory: BotFactory;

  private readonly logger = logger.child({}, { msgPrefix: "[ChatBridge] " });

  private constructor() {
    this.app = new Context();
    this.botFactory = new BotFactory(this.app);
  }

  static getInstance(): ChatBridge {
    ChatBridge.instance ??= new ChatBridge();
    return ChatBridge.instance;
  }

  async init(): Promise<void> {
    const { config } = configManager;
    log.levels.base = 1;

    this.pluginsContext.push(
      // @ts-expect-error -- @cordisjs/plugin-server 与 Koishi plugin() 重载存在 Function.prototype.apply 结构性误匹配
      this.app.plugin(Server, {
        host: config.koishi.host,
        port: config.koishi.port,
      }),
    );
    this.pluginsContext.push(this.app.plugin(HTTP));

    this.logger.info(
      `Koishi 服务启动 http://${config.koishi.host}:${config.koishi.port}`,
    );

    await this.app.start();

    const result = await db.select().from(botTable);

    for (const bot of result) {
      if (!bot.enabled) {
        continue;
      }
      this.addBot(bot.id, bot.platform, bot.config);
    }

    this.app.on("message", async (session) => {
      const connection = this.connections.findBySession(session);
      if (connection && !session.content) {
        await ChatBridge.receiveMessage(connection, session);
      }
    });
    this.app.on("guild-member-removed", async (session) => {
      const connection = this.connections.findBySession(session);
      if (connection) {
        await ChatBridge.handleGroupLeave(connection, session);
      }
    });
  }

  async close(): Promise<void> {
    for (const pluginContext of this.pluginsContext) {
      pluginContext.dispose();
    }
    for (const connection of this.connections.values()) {
      connection.pluginInstance.dispose();
    }
    this.connections.clear();
    await this.app.stop();
  }

  /**
   * 移除 Bot 连接
   */
  removeBot(botID: number): void {
    const connection = this.connections.remove(botID);
    connection.pluginInstance.dispose();
    this.logger.debug(`已移除 Bot 连接：${botID}`);
  }

  /**
   * 添加 Bot 连接
   */
  addBot(
    botID: number,
    platformType: PlatformType,
    config: PlatformConfig,
  ): void {
    if (this.connections.has(botID)) {
      throw new Error(`Bot 连接已存在：${botID}`);
    }
    const connection = this.botFactory.createConnection(
      botID,
      platformType,
      config,
    );
    this.connections.add(connection);
    this.logger.debug(`已添加 Bot 连接：${botID}`);
  }

  /**
   * 获取 Bot 连接数据
   */
  get(botID: number): PlatformSender | undefined {
    return this.connections.get(botID);
  }

  /**
   * 更新 Bot 配置
   */
  updateConfig(senderId: number, config: PlatformConfig): void {
    this.logger.debug(`正在更新 Bot 配置：${senderId}`);
    const connection = this.get(senderId);
    if (!connection) {
      throw new Error(`Bot 连接不存在：${senderId}`);
    }
    const { platformType } = connection;
    this.removeBot(senderId);
    this.addBot(senderId, platformType, config);
    this.logger.debug(`已更新 Bot 配置：${senderId}`);
  }

  /**
   * 接收消息
   */
  private static async receiveMessage(
    connection: PlatformSender,
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
    connection: PlatformSender,
    ctx: Session,
  ): Promise<void> {
    await bindingService.handleGroupLeave(connection, ctx);
  }

  async dispatch<T extends MCEventType>(event: MCEvent<T>): Promise<void> {
    const checker = eventConfigMap[event.type];

    const server = await getServerByIdWithBotAndTargets(event.serverId);

    if (!server?.botId) {
      this.logger.warn(
        `服务器 ${event.serverId} 无配置机器人，无法处理事件：${event.type}`,
      );
      return;
    }

    for (const target of server?.targets ?? []) {
      if (!checker(target.config)) {
        continue;
      }
      const connection = this.connections.get(server?.botId);
      if (!connection) {
        this.logger.warn({ target }, `找不到 Bot 连接，无法发送消息`);
        continue;
      }
      const handler = handlerMap[event.type];
      try {
        await handler(connection, event, target);
      } catch (error) {
        this.logger.error(
          { error, event, target },
          `处理事件时发生错误：${event.type}`,
        );
      }
    }
  }
}

export const chatBridge = ChatBridge.getInstance();

import { HTTP } from "@koishijs/plugin-http";
import { Server } from "@koishijs/plugin-server";
import type { ForkScope, Session } from "koishi";
import { Context, Logger as log } from "koishi";

import { db } from "#server/db/client";
import { getServerByIdWithBotAndTargets } from "#server/db/queries/server";
import type { ServerWithBotAndTargets } from "#server/db/queries/server";
import { botTable } from "#server/db/schema";
import type { Target } from "#server/db/schema";
import { bindingService } from "#server/service/bindingmanager";
import { handlePlatformMessage } from "#server/service/chatbridge/message-router";
import { recordMcEvent } from "#server/service/event-log";
import { configManager } from "#server/utils/config";
import { logger } from "#server/utils/logger";
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
    server: ServerWithBotAndTargets,
  ) => Promise<void>;
};

const handlerMap: EventHandlerMap = {
  "execute.command": async (s, e, t, srv) => {
    await s.onCommand(e, t, srv.commandConfig);
  },
  "player.chat": async (s, e, t, srv) => {
    await s.onChat(e, t, srv.chatSyncConfig, srv.name);
  },
  "player.death": async (s, e, t, srv) => {
    await s.onDeath(e, t, srv.notifyConfig);
  },
  "player.join": async (s, e, t, srv) => {
    await s.onJoin(e, t, srv.notifyConfig);
  },
  "player.leave": async (s, e, t, srv) => {
    await s.onLeave(e, t, srv.notifyConfig);
  },
  "system.notify": async (s, e, t) => {
    await s.onNotify(e, t);
  },
  "system.template": async (s, e, t) => {
    await s.onTemplate(e, t);
  },
};

class ChatBridge {
  static instance: ChatBridge | null = null;
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
      if (connection && session.content) {
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

  removeBot(botID: number): void {
    const connection = this.connections.remove(botID);
    connection.pluginInstance.dispose();
    this.logger.debug(`已移除 Bot 连接：${botID}`);
  }

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

  get(botID: number): PlatformSender | undefined {
    return this.connections.get(botID);
  }

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

  private static async receiveMessage(
    connection: PlatformSender,
    session: Session,
  ): Promise<void> {
    if (await bindingService.processMessage(connection, session)) {
      return;
    }
    await handlePlatformMessage(connection, session);
  }

  private static async handleGroupLeave(
    connection: PlatformSender,
    ctx: Session,
  ): Promise<void> {
    await bindingService.handleGroupLeave(connection, ctx);
  }

  async dispatch<T extends MCEventType>(event: MCEvent<T>): Promise<void> {
    // 落库不影响转发，无 bot 配置也记录
    void recordMcEvent(event);

    const checker = eventConfigMap[event.type];

    const server = await getServerByIdWithBotAndTargets(event.serverId);

    if (!server?.botId) {
      this.logger.warn(
        `服务器 ${event.serverId} 无配置机器人，无法处理事件：${event.type}`,
      );
      return;
    }

    const connection = this.connections.get(server.botId);
    if (!connection) {
      this.logger.warn(
        { botId: server.botId },
        `找不到 Bot 连接，无法发送消息`,
      );
      return;
    }

    const targets = server.targets.filter((t) => checker(t.config));
    const handler = handlerMap[event.type];
    await Promise.all(
      targets.map(async (target) => {
        try {
          await handler(connection, event, target, server);
        } catch (error) {
          this.logger.error(
            { error, event, target },
            `处理事件时发生错误：${event.type}`,
          );
        }
      }),
    );
  }
}

export const chatBridge = ChatBridge.getInstance();

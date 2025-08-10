import type { Bot, ForkScope } from "koishi";
import { Context } from "koishi";
import { Server } from "@koishijs/plugin-server";
import { OneBotBot } from "koishi-plugin-adapter-onebot";
import { HTTP } from "@koishijs/plugin-http";
import type { AdapterConfig } from "../../../shared/schemas/adapters";
import type { OneBotConfig } from "../../../shared/schemas/adapters/onebot";
import { configManager } from "../../../shared/config";
import { getDatabase } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { AdapterType } from "~~/shared/schemas/adapters";

/**
 * Bot 连接信息
 */
type BotConnection = {
    /**
     * bot 的实例
     */
    bot: ForkScope;
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
    private connectionMap = new Map<number, BotConnection>();
    private app: Context;

    private constructor() {
        this.app = new Context();
        this.start();
    }

    public static getInstance(): ChatBridge {
        if (!ChatBridge.instance) {
            ChatBridge.instance = new ChatBridge();
        }
        return ChatBridge.instance;
    }

    public async start(): Promise<void> {
        const config = configManager.getConfig();
        this.app.plugin(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Server as any,
            Server.Config({
                host: config.koishi.host,
                port: config.koishi.port
            })
        );
        this.app.plugin(HTTP);
        await this.app.start();
        const database = await getDatabase();
        const result = await database.select().from(adapters);
        for (const adapter of result) {
            if (adapter.type === AdapterType.Onebot) {
                this.connectionMap.set(adapter.id, {
                    bot: await this.createOnebot(adapter.config),
                    adapterID: adapter.id,
                    adapterType: adapter.type,
                    config: adapter.config
                });
            } else {
                throw new Error(`不支持的适配器类型(可能版本太低了吧?): ${adapter.type}`);
            }
        }
    }

    public async createOnebot(config: OneBotConfig): Promise<ForkScope> {
        console.info("创建 Onebot Bot 实例:", config);
        if (config.protocol === "ws-reverse") {
            return this.app.plugin(OneBotBot, {
                ...config,
                responseTimeout: 5000
            });
        } else {
            return this.app.plugin(OneBotBot, {
                ...config
            });
        }
    }

    public removeBot(adapterID: number): void {
        const connection = this.connectionMap.get(adapterID);
        if (connection) {
            connection.bot.dispose();
            this.connectionMap.delete(adapterID);
            console.info(`已移除 Bot 连接: ${adapterID}`);
            return;
        }
        throw new Error(`找不到 Bot 连接: ${adapterID}`);
    }

    public async addBot(adapterID: number, adapterType: AdapterType, config: OneBotConfig): Promise<void> {
        if (this.connectionMap.has(adapterID)) {
            throw new Error(`Bot 连接已存在: ${adapterID}`);
        }
        if (adapterType === AdapterType.Onebot) {
            const bot = await this.createOnebot(config);
            this.connectionMap.set(adapterID, { bot, adapterID, adapterType, config });
            console.info(`已添加 Bot 连接: ${adapterID}`);
        } else {
            throw new Error(`不支持的适配器类型(可能版本太低了吧?): ${adapterType}`);
        }
    }

    public getConnectionData(adapterID: number): BotConnection | undefined {
        return this.connectionMap.get(adapterID);
    }

    public isOnline(adapterID: number): boolean {
        const connection = this.connectionMap.get(adapterID);
        if (!connection) {
            return false;
        }
        let bot: Bot | undefined;

        if (connection.adapterType === AdapterType.Onebot) {
            bot = this.app.bots.find((bot) => bot.selfId === connection.config.selfId);
        } else {
            throw new Error(`不支持的适配器类型(可能版本太低了吧?): ${connection.adapterType}`);
        }

        if (!bot) {
            throw new Error(`找不到 Bot 实例: ${connection.config.selfId}`);
        }
        console.info(`检查 Bot 在线状态: ${connection.config.selfId}, 状态: ${bot?.status}`);
        return bot.status === 1; // 1 - 在线状态
    }

    public updateConfig(adapterID: number, config: OneBotConfig): Promise<void> {
        const connection = this.connectionMap.get(adapterID);
        if (!connection) {
            throw new Error(`找不到 Bot 连接: ${adapterID}`);
        }
        connection.config = config;
        connection.bot.update(config, true);
        return Promise.resolve();
    }
}

export const chatBridge = ChatBridge.getInstance();

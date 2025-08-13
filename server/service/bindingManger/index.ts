import { getConfig } from "./config";
import { getDatabase } from "~~/server/db/client";
import { players, servers, socialAccounts } from "~~/server/db/schema";
import { eq, sql, and } from "drizzle-orm";
import {
    generateVerificationCode,
    replaceBindFailMsgPlaceholders,
    replaceBindSuccessMsgPlaceholders
} from "#shared/utils/binding";
import type { BotConnection } from "../chatbridge/chatbridge";
import type { Session } from "koishi";
import { AdapterType } from "~~/shared/schemas/adapter";

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
        const database = await getDatabase();
        const serversWithAdapters = await database.query.servers.findFirst({
            with: {
                adapter: true
            },
            where: eq(servers.id, serverID)
        });
        if (!serversWithAdapters) {
            throw new Error("服务器未找到");
        } else if (!!!serversWithAdapters.adapter) {
            throw new Error("服务器适配器配置未找到");
        }

        const adapter = serversWithAdapters.adapter;

        this.cleanUpExpiredBindings();

        // 确保 serverID playerUID 唯一性 PendingBinding
        const existingBindings = this.pendingBindings.get(adapter.id) || new Set();
        const pendingBinding = Array.from(existingBindings).find(
            (binding) => binding.serverID === serverID && binding.playerUID === playerUID
        );
        if (pendingBinding) {
            return { has: true, message: pendingBinding.message, expiresAt: pendingBinding.expiresAt };
        }

        const message =
            bindingConfig.prefix + generateVerificationCode(bindingConfig.codeMode, bindingConfig.codeLength);
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
    public async processMessage(connection: BotConnection, ctx: Session): Promise<void> {
        this.cleanUpExpiredBindings();
        for (const binding of this.pendingBindings.get(connection.adapterID) || []) {
            if (binding.message === ctx.content) {
                if (Object.values(AdapterType).find((key) => key === ctx.platform) && ctx.userId) {
                    const bindingConfig = await getConfig(binding.serverID);
                    try {
                        await this.performBinding(binding, ctx.platform as AdapterType, ctx.userId, ctx.username);
                        await ctx.send(
                            replaceBindSuccessMsgPlaceholders(bindingConfig.bindSuccessMsg, binding.playerNickname)
                        );
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error("无法处理绑定:", errorMessage);
                        await ctx.send(
                            replaceBindFailMsgPlaceholders(
                                bindingConfig.bindFailMsg,
                                binding.playerNickname,
                                errorMessage
                            )
                        );
                    }
                }
            }
        }
    }

    public async performBinding(
        pendingBinding: PendingBinding,
        adapterType: AdapterType,
        socialUid: string,
        socialNickname: string | null
    ): Promise<void> {
        const database = await getDatabase();
        let socialAccount = await database
            .select()
            .from(socialAccounts)
            .where(and(eq(socialAccounts.uid, socialUid), eq(socialAccounts.adapterType, adapterType)))
            .limit(1);

        if (socialAccount.length === 0) {
            // 创建新的社交账号
            const [newAccount] = await database
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
            socialAccount = [newAccount];
        }
        if (!socialAccount[0]) {
            throw new Error(`社交账号 ${socialUid} 创建失败`);
        }

        const [updatedPlayer] = await database
            .update(players)
            .set({
                socialAccountId: socialAccount[0].id,
                updatedAt: sql`(unixepoch())`
            })
            .where(eq(players.uuid, pendingBinding.playerUID))
            .returning();

        if (!updatedPlayer) {
            throw new Error(`Player with UUID ${pendingBinding.playerUID} not found`);
        }
    }
}

export const bindingService = BindingService.getInstance();

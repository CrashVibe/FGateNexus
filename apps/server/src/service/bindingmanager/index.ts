import { eq } from "drizzle-orm";
import type { Session } from "koishi";

import { db } from "#server/db/client";
import { serverTable } from "#server/db/schema";
import { registerCleanup } from "#server/utils/cleanup-registry";
import { generateVerificationCode } from "#shared/utils/binding";

import type { PlatformSender } from "../chatbridge/sender/types";
import { getConfig } from "./config";
import { BindCodeHandler } from "./handlers/bind-code-handler";
import { GroupLeaveHandler } from "./handlers/group-leave-handler";
import { UnbindCommandHandler } from "./handlers/unbind-command-handler";
import { PendingBindingStore } from "./pending-store";
import type { BindingHandler, BindingTrigger } from "./types";

/**
 * 绑定服务门面
 *
 * 只负责：维护待处理绑定（委托 PendingBindingStore）、按触发来源把 session
 * 分发给已注册的处理器。具体绑定/解绑逻辑见 handlers/ 与 domain.ts。
 */
export class BindingService {
  private static instance: BindingService;

  private readonly store = new PendingBindingStore();
  private readonly handlers: readonly BindingHandler[];

  private constructor() {
    this.handlers = [
      new BindCodeHandler(this.store),
      new UnbindCommandHandler(),
      new GroupLeaveHandler(),
    ];

    registerCleanup("过期绑定清理", () => {
      this.cleanUpExpiredBindings();
    });
  }

  public static getInstance(): BindingService {
    BindingService.instance ??= new BindingService();
    return BindingService.instance;
  }

  /**
   * 清理过期的待处理绑定
   */
  public cleanUpExpiredBindings(): void {
    this.store.cleanupExpired();
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
    const serverWithBot = await db.query.serverTable.findFirst({
      where: eq(serverTable.id, serverID),
      with: { bot: true },
    });
    if (!serverWithBot) {
      throw new Error("服务器未找到");
    }
    if (!serverWithBot.bot) {
      throw new Error("服务器 Bot 配置未找到");
    }

    const { id: botID } = serverWithBot.bot;

    const existing = this.store.find(botID, serverID, playerUID);
    if (existing) {
      return {
        expiresAt: existing.expiresAt,
        has: true,
        message: existing.message,
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

    this.store.add({
      botID,
      expiresAt,
      message,
      playerNickname,
      playerUID,
      serverID,
    });

    return { expiresAt, has: false, message };
  }

  /**
   * 处理聊天平台消息（绑定验证码、解绑指令）
   */
  public async processMessage(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    this.store.cleanupExpired();
    return this.dispatch("message", connection, session);
  }

  /**
   * 处理成员退群事件（自动解绑）
   */
  public async handleGroupLeave(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    return this.dispatch("group-leave", connection, session);
  }

  /**
   * 把 session 依次交给匹配 trigger 的处理器，任一处理器消费则短路返回
   */
  private async dispatch(
    trigger: BindingTrigger,
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    let handled = false;
    for (const handler of this.handlers) {
      if (handler.trigger !== trigger) {
        continue;
      }
      if (await handler.handle(connection, session)) {
        handled = true;
      }
    }
    return handled;
  }
}

export const bindingService = BindingService.getInstance();

import type { Session } from "koishi";

import type { PlatformSender } from "../chatbridge/sender/types";

export interface PendingBinding {
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

/**
 * 处理器响应的触发来源
 *
 * - `message`：聊天平台消息（绑定验证码、解绑指令）
 * - `group-leave`：成员退群事件
 */
export type BindingTrigger = "message" | "group-leave";

/**
 * 绑定相关处理器接口
 *
 * 借鉴 mcwsbridge 的 RequestHandler 范式：用 `trigger` 声明响应的事件类型，
 * 由 BindingService 按 trigger 分发，新增意图只需新增一个处理器。
 */
export interface BindingHandler {
  /**
   * 该处理器响应的触发来源
   */
  readonly trigger: BindingTrigger;

  /**
   * 处理 session；不匹配时返回 false，匹配并消费时返回 true
   *
   * 供 BindingService 决定是否阻断后续处理器
   */
  handle: (connection: PlatformSender, session: Session) => Promise<boolean>;
}

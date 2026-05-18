import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import type OneBot from "@mrlingxd/koishi-plugin-adapter-onebot";

/**
 *  Bot 机器人实例类型
 */
export type AdapterBot = OneBot | DiscordBot;

/**
 * 设置群名片上下文
 */
export interface SetGroupCardHandlerContext {
  bot: AdapterBot;
  groupId: string;
  userId: string;
  card: string;
}

/**
 * 设置昵称处理函数类型
 */
export type SetGroupCardHandler = (
  context: SetGroupCardHandlerContext,
) => Promise<void>;

import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import type OneBot from "@mrlingxd/koishi-plugin-adapter-onebot";

/**
 *  Bot 机器人实例类型
 */
export type AdapterBot = OneBot | DiscordBot;

import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import type { KookBot } from "@koishijs/plugin-adapter-kook";
import type OneBot from "@mrlingxd/koishi-plugin-adapter-onebot";
import type MilkyBot from "koishi-plugin-adapter-milky";

/**
 *  Bot 机器人实例类型
 */
export type AdapterBot = OneBot | DiscordBot | KookBot | MilkyBot;

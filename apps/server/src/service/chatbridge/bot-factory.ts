import { DiscordBot } from "@koishijs/plugin-adapter-discord";
import { KookBot } from "@koishijs/plugin-adapter-kook";
import { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import type { Context, Plugin } from "koishi";
import { Time } from "koishi";
import MilkyBot from "koishi-plugin-adapter-milky";

import { logger } from "#server/utils/logger";
import type { DiscordConfig } from "#shared/model/bot/schema/discord";
import { DiscordConfigSchema } from "#shared/model/bot/schema/discord";
import type { KookConfig } from "#shared/model/bot/schema/kook";
import { KookConfigSchema } from "#shared/model/bot/schema/kook";
import type { MilkyConfig } from "#shared/model/bot/schema/milky";
import { MilkyConfigSchema } from "#shared/model/bot/schema/milky";
import type { OneBotConfig } from "#shared/model/bot/schema/onebot";
import { OneBotConfigSchema } from "#shared/model/bot/schema/onebot";
import type { PlatformConfig } from "#shared/model/bot/types";
import { PlatformType } from "#shared/model/bot/types";

import type { BaseSender } from "./sender/platform/base";
import DiscordSender from "./sender/platform/discord";
import KookSender from "./sender/platform/kook";
import MilkySender from "./sender/platform/milky";
import OneBotSender from "./sender/platform/onebot";
import type { PlatformSender } from "./sender/types";

export class BotFactory {
  private readonly app: Context;

  constructor(app: Context) {
    this.app = app;
  }

  public createConnection(
    botId: number,
    platformType: PlatformType,
    config: PlatformConfig,
  ): BaseSender {
    if (platformType === PlatformType.Onebot) {
      const parsedConfig = OneBotConfigSchema.parse(config);
      const pluginInstance = this.createOnebot(parsedConfig);
      const bot = pluginInstance.parent.bots.at(-1);
      if (!bot || !(bot instanceof OneBot)) {
        throw new Error("Failed to create OneBot instance");
      }
      return new OneBotSender(
        platformType,
        botId,
        parsedConfig,
        bot,
        pluginInstance,
      );
    }
    if (platformType === PlatformType.Discord) {
      const parsedConfig = DiscordConfigSchema.parse(config);
      const pluginInstance = this.createDiscord(parsedConfig);
      const bot = pluginInstance.parent.bots.at(-1);
      if (!bot || !(bot instanceof DiscordBot)) {
        throw new Error("Failed to create Discord Bot instance");
      }
      return new DiscordSender(
        platformType,
        botId,
        parsedConfig,
        bot,
        pluginInstance,
      );
    }
    if (platformType === PlatformType.Kook) {
      const parsedConfig = KookConfigSchema.parse(config);
      const pluginInstance = this.createKook(parsedConfig);
      const bot = pluginInstance.parent.bots.at(-1);
      if (!bot || !(bot instanceof KookBot)) {
        throw new Error("Failed to create Kook Bot instance");
      }
      return new KookSender(
        platformType,
        botId,
        parsedConfig,
        bot,
        pluginInstance,
      );
    }
    if (platformType === PlatformType.Milky) {
      const parsedConfig = MilkyConfigSchema.parse(config);
      const pluginInstance = this.createMilky(parsedConfig);
      const bot = pluginInstance.parent.bots.at(-1);
      if (!bot || !(bot instanceof MilkyBot)) {
        throw new Error("Failed to create Milky Bot instance");
      }
      return new MilkySender(
        platformType,
        botId,
        parsedConfig,
        bot,
        pluginInstance,
      );
    }
    throw new Error(
      `不支持的 Bot 类型 (可能版本太低了吧？): ${String(platformType)}`,
    );
  }

  private createOnebot(config: OneBotConfig): PlatformSender["pluginInstance"] {
    logger.debug({ config }, "创建 Onebot Bot 实例");

    const processedConfig = {
      ...config,
      // 转换一下，因为插件不识别空字符串和 undefined 的区别
      token: config.token === "" ? undefined : config.token,
    };

    if (config.protocol === "ws-reverse") {
      return this.app.plugin(OneBot, {
        ...processedConfig,
        responseTimeout: 5000,
      });
    }
    return this.app.plugin(OneBot, {
      ...processedConfig,
    });
  }

  private createDiscord(
    config: DiscordConfig,
  ): PlatformSender["pluginInstance"] {
    logger.debug({ config }, "创建 Discord Bot 实例");
    return this.app.plugin(DiscordBot, {
      /*
      intents:
        - GUILDS
        - GUILD_MEMBERS
        - GUILD_INTEGRATIONS
        - GUILD_PRESENCES
        - GUILD_MESSAGES
        - DIRECT_MESSAGES
        - MESSAGE_CONTENT
      */
      intents: 37_651,
      retryInterval: 5 * Time.second,
      retryLazy: 6,
      retryTimes: 5 * Time.second,
      slash: false,
      token: config.token,
      type: "bot",
    });
  }

  private createKook(config: KookConfig): PlatformSender["pluginInstance"] {
    logger.debug({ config }, "创建 Kook Bot 实例");
    return this.app.plugin<KookBot.Config>(KookBot, config);
  }

  private createMilky(config: MilkyConfig): PlatformSender["pluginInstance"] {
    logger.debug({ config }, "创建 Milky Bot 实例");
    // koishi-plugin-adapter-milky 的 static inject 用了当前 @cordisjs/core
    // 类型定义还不认识的 { required: string[] } 写法，纯类型不兼容，运行时无影响
    const milkyPlugin = MilkyBot as unknown as Plugin.Constructor<
      Context,
      MilkyBot.Config
    >;
    return this.app.plugin(milkyPlugin, {
      ...config,
      // 转换一下，因为插件不识别空字符串和 undefined 的区别
      token: config.token === "" ? undefined : config.token,
    });
  }
}

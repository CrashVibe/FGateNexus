import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { z } from "zod";

import { logger } from "./logger";
import { applyDefaults } from "./zod";

const AppConfigSchema = z.object({
  koishi: z
    .object({
      host: z.ipv4().nonempty("koishi.host 不能为空").default("127.0.0.1"),
      port: z.number().int().positive("koishi.port 必须是正整数").default(5140),
    })
    .default({
      host: "127.0.0.1",
      port: 5140,
    }),
  nitro: z
    .object({
      host: z.ipv4().nonempty("nitro.host 不能为空").default("127.0.0.1"),
      port: z.number().int().positive("nitro.port 必须是正整数").default(3000),
    })
    .default({
      host: "127.0.0.1",
      port: 3000,
    }),
  session: z
    .object({
      password: z
        .string()
        .min(32, "session.password 必须至少 32 个字符")
        .default(() => crypto.randomBytes(32).toString("hex")),
    })
    .default(() => ({
      password: crypto.randomBytes(32).toString("hex"),
    })),
});

type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * 合并用户配置与默认配置
 * @param userConfig 用户提供的配置（可能不完整）
 * @returns 合并后的完整配置和是否有变化的标志
 */
const mergeWithDefaults = (
  userConfig: unknown = {},
): {
  config: AppConfig;
  changed: boolean;
} => {
  const validatedConfig = AppConfigSchema.partial().parse(userConfig);
  const merged = applyDefaults(AppConfigSchema, validatedConfig);
  const changed = JSON.stringify(merged) !== JSON.stringify(validatedConfig);
  return { changed, config: merged };
};

class AppConfigManager {
  private static instance: AppConfigManager | null = null;
  private _config: AppConfig;

  private constructor(config: AppConfig) {
    this._config = config;
  }

  public static getInstance(): AppConfigManager {
    if (!AppConfigManager.instance) {
      const config = AppConfigManager.loadConfig();
      AppConfigManager.instance = new AppConfigManager(config);
    }
    return AppConfigManager.instance;
  }

  private static loadConfig(): AppConfig {
    const configPath = path.resolve(process.cwd(), "config/appsettings.json");
    const configDir = path.dirname(configPath);
    logger.info(`配置文件路径：${configPath}`);

    let config: AppConfig;

    const fileExists = fs.existsSync(configPath);
    if (fileExists) {
      // 文件存在，读取配置
      try {
        const fileContent = fs.readFileSync(configPath, "utf8");

        const parsedConfig: unknown = JSON.parse(fileContent);

        const { config: merged, changed } = mergeWithDefaults(parsedConfig);
        config = merged;
        if (changed) {
          logger.info("配置文件已补充缺失的默认值");
          fs.writeFileSync(configPath, JSON.stringify(merged, null, 4), "utf8");
        }
      } catch (error) {
        logger.error({ error }, "配置文件读取或校验失败");
        process.exit(1);
      }
    } else {
      // 文件不存在，创建默认配置
      logger.info("配置文件不存在，创建默认配置...");
      fs.mkdirSync(configDir, { recursive: true });
      ({ config } = mergeWithDefaults({}));
      fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");
    }
    process.env.NUXT_SESSION_PASSWORD = config.session.password;
    return config;
  }

  get config(): AppConfig {
    return this._config;
  }

  /**
   * 重新加载配置文件
   */
  reloadConfig(): void {
    const configPath = path.resolve(process.cwd(), "config/appsettings.json");
    try {
      const fileContent = fs.readFileSync(configPath, "utf8");

      const parsedConfig: unknown = JSON.parse(fileContent);

      this._config = mergeWithDefaults(parsedConfig).config;
      logger.info("配置已重新加载");
    } catch (error) {
      logger.error({ error }, "重新加载配置文件失败");
      throw error;
    }
  }
}

export const configManager = AppConfigManager.getInstance();
export { mergeWithDefaults };

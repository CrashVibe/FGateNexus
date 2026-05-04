import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { mergeWith } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { logger } from "./logger";
import { applyDefaults } from "./zod";

const AppConfigSchema = z.object({
  browser: z
    .object({
      executablePath: z
        .string()
        .nonempty("browser.executablePath 不能为空")
        .optional(),
    })
    .default({}),
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
  sentry: z
    .object({
      enabled: z.boolean().nullable().default(null),
      instanceId: z
        .string()
        .nonempty("sentry.instanceId 不能为空")
        .default(uuidv4()),
    })
    .default({
      enabled: null,
      instanceId: uuidv4(),
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
 */
const mergeWithDefaults = (userConfig: unknown = {}): AppConfig => {
  const validatedConfig = AppConfigSchema.partial().parse(userConfig);
  return applyDefaults(AppConfigSchema, validatedConfig);
};

class AppConfigManager {
  private static instance: AppConfigManager | null = null;
  private _config: AppConfig | null = null;

  private constructor() {
    /* empty */
  }

  public static getInstance(): AppConfigManager {
    AppConfigManager.instance ??= new AppConfigManager();
    return AppConfigManager.instance;
  }

  public init(): void {
    if (this._config) {
      return;
    }
    this._config = AppConfigManager.loadConfig();
  }

  private static loadConfig(): AppConfig {
    const configPath = path.resolve(process.cwd(), "config/appsettings.json");
    const configDir = path.dirname(configPath);
    logger.info(`配置文件路径：${configPath}`);

    if (!fs.existsSync(configPath)) {
      logger.info("配置文件不存在，创建默认配置...");
      fs.mkdirSync(configDir, { recursive: true });
      const config = mergeWithDefaults({});
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      process.env.NUXT_SESSION_PASSWORD = config.session.password;
      return config;
    }

    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const config = mergeWithDefaults(parsed);

      // 与原始文件内容对比，检测是否真正补充了默认值
      if (JSON.stringify(config, null, 2) !== JSON.stringify(parsed, null, 2)) {
        logger.info("配置文件已补充缺失的默认值");
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      }

      process.env.NUXT_SESSION_PASSWORD = config.session.password;
      return config;
    } catch (error) {
      logger.error(error, "配置文件读取或校验失败");
      return mergeWithDefaults({});
    }
  }

  get config(): AppConfig {
    if (!this._config) {
      throw new Error("配置未初始化");
    }
    return this._config;
  }

  /**
   * 重新加载配置文件
   */
  reloadConfig(): void {
    const configPath = path.resolve(process.cwd(), "config/appsettings.json");
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      this._config = mergeWithDefaults(JSON.parse(raw));
      logger.info("配置已重新加载");
    } catch (error) {
      logger.error(error, "重新加载配置文件失败");
      throw error;
    }
  }

  /**
   * 更新配置并保存到文件
   */
  updateConfig(updates: Partial<AppConfig>): void {
    const newConfig = mergeWith({}, this.config, updates, (_, srcVal) =>
      srcVal === null ? null : undefined,
    );

    this._config = newConfig;
    logger.info({ newConfig }, "准备更新配置");

    const configPath = path.resolve(process.cwd(), "config/appsettings.json");
    try {
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
      logger.info("配置已更新并保存到文件");
    } catch (error) {
      logger.error(error, "保存配置文件失败");
      throw error;
    }
  }
}

export const configManager = AppConfigManager.getInstance();

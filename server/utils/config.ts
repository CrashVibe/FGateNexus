import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { logger } from "./logger";
import { applyDefaults } from "./zod";

/**
 * 合并用户配置与默认配置
 * @param userConfig 用户提供的配置（可能不完整）
 * @returns 合并后的完整配置和是否有变化的标志
 */
function mergeWithDefaults(userConfig: Partial<AppConfig> = {}): { config: AppConfig; changed: boolean } {
    const merged = applyDefaults(AppConfigSchema, userConfig);
    const changed = JSON.stringify(merged) !== JSON.stringify(userConfig);
    return { config: merged, changed };
}

const AppConfigSchema = z.object({
    koishi: z
        .object({
            host: z.ipv4().nonempty("koishi.host 不能为空").default("127.0.0.1"),
            port: z.number().int().positive("koishi.port 必须是正整数").default(5140)
        })
        .default({
            host: "127.0.0.1",
            port: 5140
        }),
    nitro: z
        .object({
            host: z.ipv4().nonempty("nitro.host 不能为空").default("127.0.0.1"),
            port: z.number().int().positive("nitro.port 必须是正整数").default(3000)
        })
        .default({
            host: "127.0.0.1",
            port: 3000
        })
});

type AppConfig = z.infer<typeof AppConfigSchema>;

class AppConfigManager {
    private static instance: AppConfigManager | null = null;
    private config: AppConfig;

    private constructor(config: AppConfig) {
        this.config = config;
    }

    public static async getInstance(): Promise<AppConfigManager> {
        if (!AppConfigManager.instance) {
            const config = await AppConfigManager.loadConfig();
            AppConfigManager.instance = new AppConfigManager(config);
        }
        return AppConfigManager.instance;
    }

    private static async loadConfig(): Promise<AppConfig> {
        const configPath = path.resolve(process.cwd(), "config/appsettings.json");
        const configDir = path.dirname(configPath);
        logger.info(`配置文件路径: ${configPath}`);

        let config: AppConfig;

        try {
            await fs.access(configPath);
            // 文件存在，读取配置
            try {
                const fileContent = await fs.readFile(configPath, "utf-8");
                const parsedConfig = JSON.parse(fileContent);
                const { config: merged, changed } = mergeWithDefaults(parsedConfig);
                config = merged;
                if (changed) {
                    logger.info("配置文件已补充缺失的默认值");
                    await fs.writeFile(configPath, JSON.stringify(merged, null, 4), "utf-8");
                }
            } catch (error) {
                logger.error({ error }, "配置文件读取或校验失败");
                process.exit(1);
            }
        } catch {
            // 文件不存在，创建默认配置
            logger.info("配置文件不存在，创建默认配置...");
            await fs.mkdir(configDir, { recursive: true });
            config = mergeWithDefaults({}).config;
            await fs.writeFile(configPath, JSON.stringify(config, null, 4), "utf-8");
        }
        return config;
    }

    getConfig(): AppConfig {
        return this.config;
    }

    /**
     * 重新加载配置文件
     */
    async reloadConfig(): Promise<void> {
        const configPath = path.resolve(process.cwd(), "config/appsettings.json");
        try {
            await fs.access(configPath);
            const fileContent = await fs.readFile(configPath, "utf-8");
            const parsedConfig = JSON.parse(fileContent);
            this.config = mergeWithDefaults(parsedConfig).config;
            logger.info("配置已重新加载");
        } catch (error) {
            logger.error({ error }, "重新加载配置文件失败");
            throw error;
        }
    }
}

export const getConfigManager = AppConfigManager.getInstance;
export { mergeWithDefaults };

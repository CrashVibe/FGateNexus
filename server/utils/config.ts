import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { applyDefaults } from "./zod";

/**
 * 合并用户配置与默认配置
 * @param userConfig 用户提供的配置（可能不完整）
 * @returns 合并后的完整配置
 */
function mergeWithDefaults(userConfig: Partial<AppConfig> = {}): AppConfig {
    return applyDefaults(AppConfigSchema, userConfig);
}

const AppConfigSchema = z.object({
    koishi: z
        .object({
            host: z.string().nonempty("koishi.host 不能为空").default("127.0.0.1"),
            port: z.number().int().positive("koishi.port 必须是正整数").default(5140)
        })
        .default({
            host: "127.0.0.1",
            port: 5140
        }),
    nitro: z
        .object({
            host: z.string().nonempty("nitro.host 不能为空").default("127.0.0.1"),
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
        console.info("配置文件路径:", configPath);

        let config: AppConfig;

        try {
            await fs.access(configPath);
            // 文件存在，读取配置
            try {
                const fileContent = await fs.readFile(configPath, "utf-8");
                const parsedConfig = JSON.parse(fileContent);
                config = mergeWithDefaults(parsedConfig);
            } catch (error) {
                console.error("配置文件读取或校验失败:", error);
                process.exit(1);
            }
        } catch {
            // 文件不存在，创建默认配置
            console.info("配置文件不存在，创建默认配置...");
            await fs.mkdir(configDir, { recursive: true });
            config = mergeWithDefaults({});
            await fs.writeFile(configPath, JSON.stringify(config, null, 4), "utf-8");
        }

        return config;
    }

    getConfig(): AppConfig {
        return this.config;
    }

    /**
     * 更新配置并保存到文件
     * @param updates 要更新的配置项
     */
    async updateConfig(updates: Partial<AppConfig>): Promise<void> {
        const mergedConfig = mergeWithDefaults({ ...this.config, ...updates });
        this.config = mergedConfig;

        const configPath = path.resolve(process.cwd(), "config/appsettings.json");
        try {
            await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 4), "utf-8");
            console.info("配置已更新并保存");
        } catch (error) {
            console.error("保存配置失败:", error);
            throw error;
        }
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
            this.config = mergeWithDefaults(parsedConfig);
            console.info("配置已重新加载");
        } catch (error) {
            console.error("重新加载配置失败:", error);
            throw error;
        }
    }
}

export const getConfigManager = AppConfigManager.getInstance;
export { mergeWithDefaults };

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

interface AppConfig {
    koishi: {
        host: string;
        port: number;
    };
    nitro: {
        host: string;
        port: number;
    };
}
function applyDefaults<T>(schema: z.ZodType<T>, config: Partial<T>): T {
    return schema.parse(config);
}

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

class AppConfigManager {
    private static instance: AppConfigManager | null = null;
    private config: AppConfig;

    private constructor() {
        const configPath = path.resolve(process.cwd(), "config/appsettings.json");
        const configDir = path.dirname(configPath);
        console.log("配置文件路径:", configPath);

        let config: AppConfig;

        if (!fs.existsSync(configPath)) {
            console.log("配置文件不存在，正在创建默认配置文件...");
            const defaultConfig = mergeWithDefaults({});

            try {
                if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true });
                }
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4), "utf-8");
                console.log("默认配置文件已创建:", configPath);

                config = defaultConfig;
            } catch (writeError) {
                console.error("创建配置文件失败:", writeError);
                process.exit(1);
            }
        } else {
            try {
                const fileContent = fs.readFileSync(configPath, "utf-8");
                const parsedConfig = JSON.parse(fileContent);
                config = mergeWithDefaults(parsedConfig);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    console.error("配置文件校验失败:", error.issues);
                } else {
                    console.error("读取配置文件失败:", error);
                }
                process.exit(1);
            }
        }

        this.config = config;
    }

    public static getInstance(): AppConfigManager {
        if (!AppConfigManager.instance) {
            AppConfigManager.instance = new AppConfigManager();
        }
        return AppConfigManager.instance;
    }

    getConfig(): AppConfig {
        return this.config;
    }

    /**
     * 更新配置并保存到文件
     * @param updates 要更新的配置项
     */
    updateConfig(updates: Partial<AppConfig>): void {
        const mergedConfig = mergeWithDefaults({ ...this.config, ...updates });
        this.config = mergedConfig;

        const configPath = path.resolve(process.cwd(), "config/appsettings.json");
        try {
            fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 4), "utf-8");
            console.log("配置已更新并保存");
        } catch (error) {
            console.error("保存配置失败:", error);
            throw error;
        }
    }

    /**
     * 重新加载配置文件
     */
    reloadConfig(): void {
        const configPath = path.resolve(process.cwd(), "config/appsettings.json");
        if (fs.existsSync(configPath)) {
            try {
                const fileContent = fs.readFileSync(configPath, "utf-8");
                const parsedConfig = JSON.parse(fileContent);
                this.config = mergeWithDefaults(parsedConfig);
                console.log("配置已重新加载");
            } catch (error) {
                console.error("重新加载配置失败:", error);
                throw error;
            }
        }
    }
}

export const configManager = AppConfigManager.getInstance();
export { applyDefaults, mergeWithDefaults };

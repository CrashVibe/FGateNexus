import { type BindingConfig, BindingConfigSchema } from "../../shared/schemas/server/binding";
import { applyDefaults } from "./zod";

/**
 * 合并服务器配置并应用默认值
 * 将当前服务器配置与更新配置合并，确保所有字段都有默认值
 * @param currentServerConfig 当前的服务器配置
 * @param configUpdates 要更新的配置项（可选，部分更新）
 * @returns 合并后的完整服务器配置，包含所有默认值
 */

export function mergeServerConfig(
    currentServerConfig: BindingConfig,
    configUpdates?: Partial<BindingConfig>
): BindingConfig {
    return applyDefaults(BindingConfigSchema, { ...currentServerConfig, ...configUpdates });
}

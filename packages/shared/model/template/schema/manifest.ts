import { z } from "zod";

/** 作为目录名，故仅允许小写字母数字与 - _ */
export const TemplateIdSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-_]{1,63}$/u,
    "模板 id 仅允许小写字母、数字、- 与 _，长度 2-64",
  );

/** 用作 JS 对象 key */
const IdentifierSchema = z
  .string()
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/u,
    "标识符仅允许字母、数字、_，且不能以数字开头",
  );

/** 封闭枚举，关键安全边界。required=true 时不支持则无法启用/渲染中止；false 时降级为 null/[] */
export const TemplateDataSourceSchema = z.discriminatedUnion("type", [
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("online_players"),
  }),
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("server_status"),
  }),
  z.object({
    id: IdentifierSchema,
    /** self 聊天发起者；online_players 在线玩家；known_players 已知玩家 */
    limit: z.number().int().positive().max(200).optional(),
    placeholders: z.array(z.string().min(1)).min(1).max(20),
    /** 引用 configSchema 中 type:"placeholders" 字段的 key，与 placeholders 合并 */
    placeholdersFrom: IdentifierSchema.optional(),
    required: z.boolean().default(true),
    target: z.enum(["self", "online_players", "known_players"]),
    type: z.literal("placeholder"),
  }),
  // 不依赖 MC 端能力
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("player_profile"),
  }),
  // 不依赖 MC 端能力
  z.object({
    id: IdentifierSchema,
    /** 默认 10 */
    limit: z.number().int().positive().max(50).optional(),
    required: z.boolean().default(true),
    type: z.literal("recent_joins"),
    /** 仅统计最近 N 天内首次加入 */
    withinDays: z.number().int().positive().max(365).optional(),
  }),
  // 不依赖 MC 端能力
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("binding_stats"),
  }),
  // 需 PlaceholderAPI
  z.object({
    id: IdentifierSchema,
    /** 参与排名的玩家池上限，默认 100 */
    limit: z.number().int().positive().max(200).optional(),
    /** desc 数值越大名次越高（默认），asc 反之 */
    order: z.enum(["asc", "desc"]).default("desc"),
    placeholder: z.string().min(1).max(100),
    required: z.boolean().default(true),
    type: z.literal("placeholder_rank"),
  }),
  // 不依赖 MC 端实时能力
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("server_status_history"),
    /** 默认 60 */
    windowMinutes: z.number().int().positive().max(720).optional(),
  }),
  z.object({
    event: z.enum(["player.death", "player.join", "player.leave"]),
    id: IdentifierSchema,
    /** 默认 10 */
    limit: z.number().int().positive().max(25).optional(),
    required: z.boolean().default(true),
    type: z.literal("event_leaderboard"),
    /** 默认 7 */
    windowDays: z.number().int().positive().max(90).optional(),
  }),
  // 需 FGateClient statistics 能力
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    /** Bukkit Statistic 枚举名，如 DEATHS / PLAYER_KILLS */
    statistics: z.array(z.string().min(1)).min(1).max(20),
    type: z.literal("player_statistics"),
  }),
  // 需 FGateClient advancements 能力；仅在线玩家有数据
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("player_advancements"),
  }),
  // 需 FGateClient equipment 能力；仅在线玩家有数据
  z.object({
    id: IdentifierSchema,
    required: z.boolean().default(true),
    type: z.literal("player_equipment"),
  }),
]);

export const PlaceholderListEntrySchema = z.object({
  label: z.string().min(1).max(40),
  placeholder: z.string().min(1).max(100),
});

/** 驱动前端动态表单 */
export const TemplateConfigFieldSchema = z.discriminatedUnion("type", [
  z.object({
    default: z.string().optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    maxLength: z.number().int().positive().optional(),
    type: z.literal("string"),
  }),
  z.object({
    default: z.number().optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    max: z.number().optional(),
    min: z.number().optional(),
    type: z.literal("number"),
  }),
  z.object({
    default: z.boolean().optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    type: z.literal("boolean"),
  }),
  z.object({
    default: z.string().optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    type: z.literal("color"),
  }),
  z.object({
    default: z.string().optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    options: z
      .array(z.object({ label: z.string().min(1), value: z.string() }))
      .min(1),
    type: z.literal("select"),
  }),
  z.object({
    default: z.string().optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    type: z.literal("placeholder"),
  }),
  z.object({
    default: z.array(PlaceholderListEntrySchema).max(20).optional(),
    description: z.string().optional(),
    key: IdentifierSchema,
    label: z.string().min(1),
    max: z.number().int().positive().max(20).optional(),
    type: z.literal("placeholders"),
  }),
]);

/** auto 按 body 包围盒 */
export const TemplateViewportSchema = z.union([
  z.object({
    height: z.number().int().positive(),
    width: z.number().int().positive(),
  }),
  z.literal("auto"),
]);

/** 默认沙箱仅放行 file:/data:；声明的来源会在安装时连同 reason 提示给管理员 */
export const TemplateNetworkPermissionSchema = z.object({
  origin: z
    .string()
    .regex(
      /^https:\/\/[a-zA-Z0-9.-]+(?<port>:\d+)?$/u,
      "origin 须为 https://host[:port] 格式，不含路径",
    ),
  reason: z.string().min(1).max(200),
});

/** entry 固定为 dist/index.html，避免路径穿越 */
export const TemplateManifestSchema = z.object({
  author: z.string().optional(),
  configSchema: z.array(TemplateConfigFieldSchema).max(50).default([]),
  dataSources: z.array(TemplateDataSourceSchema).max(10).default([]),
  description: z.string().optional(),
  id: TemplateIdSchema,
  name: z.string().min(1),
  networkPermissions: z
    .array(TemplateNetworkPermissionSchema)
    .max(10)
    .default([]),
  version: z.string().min(1),
  viewport: TemplateViewportSchema.default("auto"),
});

export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;
export type TemplateDataSource = z.infer<typeof TemplateDataSourceSchema>;
export type TemplateConfigField = z.infer<typeof TemplateConfigFieldSchema>;
export type TemplateViewport = z.infer<typeof TemplateViewportSchema>;
export type TemplateNetworkPermission = z.infer<
  typeof TemplateNetworkPermissionSchema
>;
export type PlaceholderListEntry = z.infer<typeof PlaceholderListEntrySchema>;

/** 数据源类型 → 中文展示名 */
export const TEMPLATE_DATA_SOURCE_LABELS: Record<
  TemplateDataSource["type"],
  string
> = {
  binding_stats: "绑定统计",
  event_leaderboard: "事件排行",
  online_players: "在线玩家",
  placeholder: "PlaceholderAPI",
  placeholder_rank: "PAPI 排名",
  player_advancements: "玩家成就",
  player_equipment: "玩家装备",
  player_profile: "玩家档案",
  player_statistics: "玩家统计",
  recent_joins: "新加入玩家",
  server_status: "服务器状态",
  server_status_history: "性能历史",
};

/*
 * FGate 图片模板开发 SDK（包名 "@fgate/template-sdk"）。
 *
 * 模板（任意前端框架打包出的静态页面）在 FGate 渲染环境中运行时，宿主会在
 * 页面加载前注入全局对象 window.__FGATE_TEMPLATE__。本 SDK 是对该对象的
 * 类型安全封装。
 *
 * 典型用法：用 defineDataSources / defineConfigSchema 各声明一次（与
 * manifest.json 的 dataSources / configSchema 一一对应），getData() /
 * getConfig() 的返回类型自动推导，无需手写数据接口、也不会出现 unknown：
 *
 *   import {
 *     getData,
 *     getConfig,
 *     getMeta,
 *     ready,
 *     defineDataSources,
 *     defineConfigSchema,
 *   } from "@fgate/template-sdk";
 *   import type {
 *     InferTemplateData,
 *     InferTemplateConfig,
 *   } from "@fgate/template-sdk";
 *
 *   // 与 manifest.json 中的 dataSources 一一对应
 *   export const dataSources = defineDataSources([
 *     { id: "onlinePlayers", type: "online_players", required: true },
 *     { id: "status", type: "server_status", required: true },
 *   ]);
 *
 *   // 与 manifest.json 中的 configSchema 一一对应
 *   export const configSchema = defineConfigSchema([
 *     { key: "title", label: "标题", type: "string", default: "在线玩家" },
 *     {
 *       key: "theme",
 *       label: "配色",
 *       type: "select",
 *       options: [
 *         { label: "浅色", value: "light" },
 *         { label: "深色", value: "dark" },
 *       ],
 *       default: "dark",
 *     },
 *   ]);
 *
 *   type TemplateData = InferTemplateData<typeof dataSources>;
 *   type TemplateConfig = InferTemplateConfig<typeof configSchema>;
 *
 *   const { onlinePlayers, status } = getData<TemplateData>();
 *   // onlinePlayers: OnlinePlayer[]，status: ServerStatus | null
 *   const { title, theme } = getConfig<TemplateConfig>();
 *   // title: string，theme: "light" | "dark"
 *   render(onlinePlayers, status, title, theme);
 *   ready(); // 通知宿主可以截图
 */

import type {
  PlaceholderListEntry,
  TemplateConfigField,
  TemplateDataSource,
} from "@fgate/shared/model/template/schema/manifest";

/** 渲染元信息 */
export interface TemplateMeta {
  instanceName: string;
  serverName: string;
  templateId: string;
  version: string;
}

/**
 * `dataSources[].type === "online_players"` 的数组元素。
 * 对应 FGateClient `get.players` 响应，所有 Paper/Bukkit 平台均提供 name/uuid；
 * displayName/gameMode/world/ping 取决于客户端实现，可能缺省。
 */
export interface OnlinePlayer {
  name: string;
  uuid: string;
  displayName?: string;
  gameMode?: string;
  world?: string;
  ping?: number;
}

/** 单个世界的在线人数统计 */
export interface WorldStatus {
  name: string;
  playerCount: number;
}

/**
 * `dataSources[].type === "server_status"` 的解析结果；服务器不支持该能力时为 null。
 * 对应 FGateClient `get.server_status` 响应；tps/mspt 为 Paper 专有指标，
 * 在纯 Bukkit/Spigot 等平台上可能缺省。
 */
export interface ServerStatus {
  online: number;
  max: number;
  tps?: number;
  mspt?: number;
  worlds: WorldStatus[];
}

/**
 * `dataSources[].type === "placeholder"` 的解析结果。
 * target 为 "online_players" / "known_players" 时为该类型数组；
 * target 为 "self" 时为单个对象或 null（聊天发起者未绑定时）。
 * values 的 key 为 manifest 中声明的 placeholders 字符串，由 PlaceholderAPI 解析。
 */
export interface PlaceholderEntry {
  name: string;
  uuid: string;
  values: Record<string, string>;
}

/** `player_profile` 数据源中绑定的平台账号信息 */
export interface PlayerProfileSocialBinding {
  /** 平台标识，如 "onebot" / "discord" */
  platform: string;
  uid: string;
  /** 可能为 null */
  nickname: string | null;
  /** ISO 8601 字符串 */
  boundAt: string;
}

/**
 * `dataSources[].type === "player_profile"` 的解析结果。
 * 指聊天发起者绑定的玩家；聊天发起者未绑定玩家或该玩家未知时整体为 null。
 * 时间字段为 ISO 8601 字符串（模板可用 `new Date(...)` 解析）。
 */
export interface PlayerProfile {
  name: string;
  uuid: string;
  /** 在当前服务器的首次加入时间；从未加入过该服时为 null */
  firstJoinedAt: string | null;
  /** 绑定的平台账号；未绑定时为 null */
  social: PlayerProfileSocialBinding | null;
}

/** `dataSources[].type === "recent_joins"` 的数组元素 */
export interface RecentJoinEntry {
  name: string;
  uuid: string;
  /** 首次加入本服的时间（ISO 8601 字符串） */
  joinedAt: string;
}

/** `binding_stats` 中某平台的绑定数量 */
export interface BindingPlatformCount {
  /** 平台标识，如 "onebot" / "discord" */
  platform: string;
  count: number;
}

/**
 * `dataSources[].type === "binding_stats"` 的解析结果：本服账号绑定统计。
 */
export interface BindingStats {
  /** 该服已知玩家总数 */
  total: number;
  /** 已绑定平台账号的玩家数 */
  bound: number;
  /** 未绑定的玩家数 */
  unbound: number;
  /** 按平台细分的绑定数量 */
  byPlatform: BindingPlatformCount[];
}

/**
 * `dataSources[].type === "placeholder_rank"` 的解析结果：
 * 聊天发起者在某 PAPI 占位符上的全服排名。未绑定玩家时整体为 null。
 */
export interface PlaceholderRank {
  name: string;
  uuid: string;
  /** 占位符原始字符串值 */
  value: string;
  /** 解析出的数值；无法解析为数字时为 null */
  numeric: number | null;
  /** 名次（从 1 开始）；自身值无法参与排名时为 null */
  rank: number | null;
  /** 参与排名的有效玩家总数 */
  total: number;
}

/**
 * `dataSources[].type === "server_status_history"` 的数组元素：一条状态历史采样。
 * 按时间升序排列；tps / mspt 为 Paper 专有指标，缺失时为 null。
 */
export interface ServerStatusSample {
  /** 采样时间（ISO 8601 字符串） */
  t: string;
  online: number;
  tps: number | null;
  mspt: number | null;
}

/**
 * `dataSources[].type === "event_leaderboard"` 的数组元素：事件排行榜一项。
 * 按 count 降序排列。lastData 为该玩家最近一条该类事件的 payload
 * （如死亡事件为 `{ message }`），结构随事件类型而定。
 */
export interface EventLeaderboardEntry {
  playerUuid: string;
  /** 最近一条事件中的名字快照 */
  playerName: string | null;
  count: number;
  /** 最近一条匹配事件的发生时间（ISO 8601 字符串） */
  lastAt: string;
  /** 最近一条匹配事件的 payload；无则 null */
  lastData: Record<string, unknown> | null;
}

/**
 * `dataSources[].type === "player_statistics"` 的解析结果：指令发起者本人的
 * Vanilla 统计。未绑定玩家时整体为 null。values 的 key 为请求的 Bukkit 统计名
 * （UNTYPED），值为对应计数；注意 PLAY_ONE_MINUTE 单位为 tick（20 tick/秒）。
 */
export interface PlayerStatistics {
  name: string;
  uuid: string;
  values: Record<string, number>;
}

/** `player_advancements` 中的单条成就 */
export interface AdvancementEntry {
  /** 命名空间键，如 "minecraft:story/mine_stone" */
  key: string;
  done: boolean;
  /** 成就标题（服务器默认语言解析后的纯文本），无展示信息时为 null */
  name: string | null;
  /** 展示图标的 Material 名（小写），可映射到物品贴图；无展示信息时为 null */
  icon: string | null;
  /** 图标是否为方块（决定贴图路径 block 还是 item） */
  block: boolean;
}

/**
 * `dataSources[].type === "player_advancements"` 的解析结果：指令发起者本人的成就进度。
 * 未绑定玩家时整体为 null。受 Bukkit API 限制仅在线玩家有数据：online=false 时
 * total/completed=0、advancements 为空，模板应提示「需在线」。
 */
export interface PlayerAdvancements {
  name: string;
  uuid: string;
  /** 玩家是否在线（离线则无成就数据） */
  online: boolean;
  /** 非配方成就总数 */
  total: number;
  /** 已完成数 */
  completed: number;
  advancements: AdvancementEntry[];
}

/** `player_equipment` 中的附魔 */
export interface ItemEnchant {
  /** 附魔键（无命名空间），如 "sharpness" */
  name: string;
  level: number;
}

/** `player_equipment` 中的单件装备 */
export interface EquipmentItem {
  /** helmet / chestplate / leggings / boots / mainHand / offHand */
  slot: string;
  /** Material 枚举名，如 DIAMOND_CHESTPLATE */
  type: string;
  amount: number;
  enchantments: ItemEnchant[];
}

/**
 * `dataSources[].type === "player_equipment"` 的解析结果：指令发起者本人的当前装备。
 * 未绑定玩家时整体为 null。受 Bukkit API 限制仅在线玩家有数据：online=false 时
 * items 为空，模板应提示「需在线」。空槽位不会出现在 items 中。
 */
export interface PlayerEquipment {
  name: string;
  uuid: string;
  /** 玩家是否在线（离线则无装备数据） */
  online: boolean;
  items: EquipmentItem[];
}

/** 单个数据源声明（manifest.json 的 `dataSources[]` 元素）→ getData() 中对应字段的结果类型 */
export type DataSourceResult<D extends TemplateDataSource> = D extends {
  type: "online_players";
}
  ? OnlinePlayer[]
  : D extends { type: "server_status" }
    ? ServerStatus | null
    : D extends { type: "placeholder"; target: "self" }
      ? PlaceholderEntry | null
      : D extends { type: "placeholder" }
        ? PlaceholderEntry[]
        : D extends { type: "player_profile" }
          ? PlayerProfile | null
          : D extends { type: "recent_joins" }
            ? RecentJoinEntry[]
            : D extends { type: "binding_stats" }
              ? BindingStats | null
              : D extends { type: "placeholder_rank" }
                ? PlaceholderRank | null
                : D extends { type: "server_status_history" }
                  ? ServerStatusSample[]
                  : D extends { type: "event_leaderboard" }
                    ? EventLeaderboardEntry[]
                    : D extends { type: "player_statistics" }
                      ? PlayerStatistics | null
                      : D extends { type: "player_advancements" }
                        ? PlayerAdvancements | null
                        : D extends { type: "player_equipment" }
                          ? PlayerEquipment | null
                          : never;

/** 由 dataSources 声明数组推导出 getData() 的整体返回类型 */
export type InferTemplateData<DS extends readonly TemplateDataSource[]> = {
  [D in DS[number] as D["id"]]: DataSourceResult<D>;
};

/**
 * 声明 dataSources（与 manifest.json 的 dataSources 字段一一对应）。
 * 仅在类型层保留字面量信息供 InferTemplateData 推导，运行时原样返回。
 */
export const defineDataSources = <
  const DS extends readonly TemplateDataSource[],
>(
  dataSources: DS,
): DS => dataSources;

/** 单个配置项声明（manifest.json 的 `configSchema[]` 元素）→ getConfig() 中对应字段的结果类型 */
export type ConfigFieldResult<F extends TemplateConfigField> = F extends {
  type: "number";
}
  ? number
  : F extends { type: "boolean" }
    ? boolean
    : F extends { type: "select" }
      ? F["options"][number]["value"]
      : F extends { type: "placeholders" }
        ? PlaceholderListEntry[]
        : string;

/** 由 configSchema 声明数组推导出 getConfig() 的整体返回类型 */
export type InferTemplateConfig<CS extends readonly TemplateConfigField[]> = {
  [F in CS[number] as F["key"]]: ConfigFieldResult<F>;
};

/**
 * 声明 configSchema（与 manifest.json 的 configSchema 字段一一对应）。
 * 仅在类型层保留字面量信息供 InferTemplateConfig 推导，运行时原样返回。
 */
export const defineConfigSchema = <
  const CS extends readonly TemplateConfigField[],
>(
  configSchema: CS,
): CS => configSchema;

/** 宿主注入的上下文结构 */
interface FGateTemplateContext {
  data: Record<string, unknown>;
  config: Record<string, unknown>;
  meta: TemplateMeta;
  ready: boolean;
}

const getContext = (): FGateTemplateContext => {
  const ctx = (globalThis as { __FGATE_TEMPLATE__?: FGateTemplateContext })
    .__FGATE_TEMPLATE__;
  if (!ctx) {
    throw new Error(
      "[@fgate/template-sdk] 未检测到 __FGATE_TEMPLATE__，请在 FGate 渲染环境中运行",
    );
  }
  return ctx;
};

/**
 * 读取数据源解析结果。key 为 manifest `dataSources[].id`；
 * 不可用的数据源（required:false 且平台不支持）为 null/[]。
 * 配合 defineDataSources / InferTemplateData 可获得完整类型推导。
 */
export const getData = <T = Record<string, unknown>>(): T =>
  getContext().data as T;

/**
 * 读取管理员配置。key 为 manifest `configSchema[].key`。
 * 配合 defineConfigSchema / InferTemplateConfig 可获得完整类型推导。
 */
export const getConfig = <T = Record<string, unknown>>(): T =>
  getContext().config as T;

/** 读取渲染元信息。 */
export const getMeta = (): TemplateMeta => getContext().meta;

/** configSchema "placeholders" 字段的一项，附带解析出的占位符值 */
export interface ResolvedPlaceholderField extends PlaceholderListEntry {
  value: string;
}

/**
 * 将 configSchema "placeholders" 类型字段的 {label, placeholder}[] 与 placeholder 数据源的
 * values 关联，得到可直接渲染的 {label, placeholder, value}[]。
 */
export const resolvePlaceholderFields = (
  entries: PlaceholderListEntry[] | undefined,
  values: Record<string, string> | undefined,
): ResolvedPlaceholderField[] =>
  (entries ?? []).map((entry) => ({
    ...entry,
    value: values?.[entry.placeholder] ?? "",
  }));

/** 通知宿主页面已渲染完成、可以截图。 */
export const ready = (): void => {
  getContext().ready = true;
};

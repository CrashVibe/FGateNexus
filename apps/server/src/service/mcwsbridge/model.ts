// Response model
import { z } from "zod";

/** 旧客户端缺字段，默认全 false */
export const capabilitiesSchema = z
  .object({
    advancements: z.boolean().default(false),
    equipment: z.boolean().default(false),
    players: z.boolean().default(false),
    server_status: z.boolean().default(false),
    statistics: z.boolean().default(false),
  })
  .default({
    advancements: false,
    equipment: false,
    players: false,
    server_status: false,
    statistics: false,
  });

export type Capabilities = z.infer<typeof capabilitiesSchema>;

export const clientInfoSchema = z.object({
  capabilities: capabilitiesSchema,
  minecraft_software: z.string(),
  minecraft_version: z.string(),
  player_count: z.number(),
  supports_command: z.boolean(),
  supports_papi: z.boolean(),
});
export const kickPlayerSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});
export const executeCommandSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

/** get.players 响应 */
export const getPlayersSchema = z.object({
  players: z.array(
    z.object({
      displayName: z.string().optional(),
      gameMode: z.string().optional(),
      name: z.string(),
      ping: z.number().optional(),
      uuid: z.string(),
      world: z.string().optional(),
    }),
  ),
});

export type PlayerInfo = z.infer<typeof getPlayersSchema>["players"][number];

/** get.server_status 响应 */
export const getServerStatusSchema = z.object({
  max: z.number(),
  mspt: z.number().optional(),
  online: z.number(),
  tps: z.number().optional(),
  worlds: z.array(
    z.object({
      name: z.string(),
      playerCount: z.number(),
    }),
  ),
});

export type ServerStatus = z.infer<typeof getServerStatusSchema>;

/** get.placeholders 请求项（params: { requests: PlaceholderRequest[] }） */
export interface PlaceholderRequest {
  player: { name: string; uuid: string };
  placeholders: string[];
}

/** get.placeholders 响应 */
export const getPlaceholdersResponseSchema = z.object({
  results: z.array(
    z.object({
      player: z.string(),
      values: z.record(z.string(), z.string()),
    }),
  ),
});

export type PlaceholderResult = z.infer<
  typeof getPlaceholdersResponseSchema
>["results"][number];

/** get.statistics 请求项（params: { requests: StatisticsRequest[] }） */
export interface StatisticsRequest {
  player: { name: string; uuid: string };
  /** Bukkit Statistic 枚举名，如 DEATHS/PLAYER_KILLS */
  statistics: string[];
}

/** get.statistics 响应（values 为统计名→数值，缺失的统计名不返回） */
export const getStatisticsResponseSchema = z.object({
  results: z.array(
    z.object({
      player: z.string(),
      values: z.record(z.string(), z.number()),
    }),
  ),
});

export type StatisticResult = z.infer<
  typeof getStatisticsResponseSchema
>["results"][number];

/** get.advancements 请求项（params: { requests: AdvancementsRequest[] }） */
export interface AdvancementsRequest {
  player: { name: string; uuid: string };
}

/** get.advancements 响应（仅在线玩家） */
export const getAdvancementsResponseSchema = z.object({
  results: z.array(
    z.object({
      advancements: z.array(
        z.object({
          block: z.boolean().default(false),
          done: z.boolean(),
          icon: z.string().nullable().default(null),
          key: z.string(),
          name: z.string().nullable().default(null),
        }),
      ),
      completed: z.number(),
      online: z.boolean(),
      player: z.string(),
      total: z.number(),
    }),
  ),
});

export type AdvancementsResult = z.infer<
  typeof getAdvancementsResponseSchema
>["results"][number];

/** get.equipment 请求项（params: { requests: EquipmentRequest[] }） */
export interface EquipmentRequest {
  player: { name: string; uuid: string };
}

/** get.equipment 响应（仅在线玩家，否则 items 为空） */
export const getEquipmentResponseSchema = z.object({
  results: z.array(
    z.object({
      items: z.array(
        z.object({
          amount: z.number(),
          // kotlinx 不编码空集合默认值，无附魔时缺省
          enchantments: z
            .array(z.object({ level: z.number(), name: z.string() }))
            .default([]),
          slot: z.string(),
          type: z.string(),
        }),
      ),
      online: z.boolean(),
      player: z.string(),
    }),
  ),
});

export type EquipmentResult = z.infer<
  typeof getEquipmentResponseSchema
>["results"][number];

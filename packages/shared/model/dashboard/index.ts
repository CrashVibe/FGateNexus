import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

const EventDataSchema = z.record(z.string(), z.unknown()).nullable();

export const RelayEntrySchema = z.object({
  direction: z.enum(["mc_to_platform", "platform_to_mc"]),
  from: z.string(),
  /** 不转发 / 失败的原因 */
  reason: z.string().optional(),
  serverId: z.number(),
  status: z.enum(["sent", "filtered", "skipped", "failed"]),
  t: z.number(),
  /** 群聊 channelId */
  target: z.string().optional(),
  text: z.string(),
});
export type RelayEntry = z.infer<typeof RelayEntrySchema>;

export const DashboardAPI = {
  EVENTS: {
    description: "获取最近事件流（全部服务器）",
    request: z.void(),
    response: z.array(
      z.object({
        createdAt: z.coerce.date(),
        data: EventDataSchema,
        id: z.number(),
        playerName: z.string().nullable(),
        serverId: z.number(),
        serverName: z.string(),
        type: z.string(),
      }),
    ),
  },
  LEADERBOARD: {
    description: "获取今日死亡排行榜（全部服务器）",
    request: z.void(),
    response: z.array(
      z.object({
        count: z.number(),
        lastAt: z.coerce.date(),
        lastData: EventDataSchema,
        playerName: z.string().nullable(),
        playerUuid: z.string(),
      }),
    ),
  },
  RELAYS: {
    description: "最近的聊天转发记录（内存，重启即清空）",
    request: z.void(),
    response: z.array(RelayEntrySchema),
  },
  SERVERS: {
    description: "获取首页服务器状态列表（含在线人数与近期 TPS 走势）",
    request: z.void(),
    response: z.array(
      z.object({
        id: z.number(),
        isOnline: z.boolean(),
        name: z.string(),
        onlinePlayers: z.number().nullable(),
        recentTps: z.array(
          z.object({ t: z.coerce.date(), tps: z.number().nullable() }),
        ),
        software: z.string().nullable(),
        version: z.string().nullable(),
      }),
    ),
  },
  STATUS_HISTORY: {
    description: "获取单个服务器的 TPS/MSPT 趋势",
    request: z.void(),
    response: z.object({
      samples: z.array(
        z.object({
          mspt: z.number().nullable(),
          online: z.number(),
          t: z.coerce.date(),
          tps: z.number().nullable(),
        }),
      ),
      serverId: z.number(),
      serverName: z.string(),
    }),
  },
  SUMMARY: {
    description: "获取首页统计概览",
    request: z.void(),
    response: z.object({
      bindings: z.object({ bound: z.number(), total: z.number() }),
      bots: z.object({ online: z.number(), total: z.number() }),
      /** 开启了消息互通的群聊数，用于上手清单 */
      chatSyncTargets: z.number(),
      eventsToday: z.object({
        death: z.number(),
        join: z.number(),
        leave: z.number(),
      }),
      players: z.object({ online: z.number() }),
      servers: z.object({ online: z.number(), total: z.number() }),
    }),
  },
} satisfies ApiSchemaRegistry;

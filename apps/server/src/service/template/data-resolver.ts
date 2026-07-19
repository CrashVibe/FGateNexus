import {
  getBindingStats,
  getKnownPlayers,
  getPlayerProfile,
  getRecentJoins,
} from "#server/db/queries/player";
import type { MinimalPlayer } from "#server/db/queries/player";
import { getEventLeaderboard } from "#server/db/queries/player-event";
import { getStatusHistory } from "#server/db/queries/server-status-history";
import type {
  PlaceholderRequest,
  PlayerInfo,
} from "#server/service/mcwsbridge/model";
import type ServerSession from "#server/service/mcwsbridge/server-session";
import type { TemplateDataShape } from "#server/service/template/data-shapes";
import { resolvePlaceholderIds } from "#server/service/template/dynamic-placeholders";
import { logger } from "#server/utils/logger";
import type { TemplateInstanceConfig } from "#shared/model/template/schema/instance";
import { TEMPLATE_DATA_SOURCE_LABELS } from "#shared/model/template/schema/manifest";
import type {
  TemplateDataSource,
  TemplateManifest,
} from "#shared/model/template/schema/manifest";

const KNOWN_PLAYERS_DEFAULT_LIMIT = 50;
const PLAYERS_HARD_CAP = 200;

const log = logger.child({}, { msgPrefix: "[Template] " });

/** required 数据源不可用时抛出，路由层转错误响应 */
export class DataResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataResolveError";
  }
}

export interface ResolveContext {
  /** target:"self" 用到 */
  contextPlayer?: MinimalPlayer | null;
  /** 合并 placeholdersFrom 用 */
  config?: TemplateInstanceConfig;
  /** render 级玩家列表缓存（内部注入） */
  playerMemo?: PlayerMemo;
}

/** 单次渲染内复用在线/已知玩家列表 */
interface PlayerMemo {
  online: () => Promise<PlayerInfo[]>;
  known: (limit: number) => Promise<MinimalPlayer[]>;
}

const createPlayerMemo = (session: ServerSession): PlayerMemo => {
  let onlinePromise: Promise<PlayerInfo[]> | undefined;
  const knownByLimit = new Map<number, Promise<MinimalPlayer[]>>();
  return {
    async known(limit) {
      let cached = knownByLimit.get(limit);
      if (!cached) {
        cached = getKnownPlayers(session.serverId, limit);
        knownByLimit.set(limit, cached);
      }
      return await cached;
    },
    async online() {
      onlinePromise ??= session.getPlayers();
      return await onlinePromise;
    },
  };
};

const isSupported = (
  ds: TemplateDataSource,
  session: ServerSession,
): boolean => {
  switch (ds.type) {
    case "online_players": {
      return session.capabilities.players;
    }
    case "server_status": {
      return session.capabilities.server_status;
    }
    case "placeholder": {
      return session.supports_papi === true;
    }
    case "placeholder_rank": {
      return session.supports_papi === true;
    }
    case "player_statistics": {
      return session.capabilities.statistics;
    }
    case "player_advancements": {
      return session.capabilities.advancements;
    }
    case "player_equipment": {
      return session.capabilities.equipment;
    }
    case "player_profile":
    case "recent_joins":
    case "binding_stats":
    case "server_status_history":
    case "event_leaderboard": {
      // 纯 Nexus DB，不依赖 MC 能力
      return true;
    }
    default: {
      return false;
    }
  }
};

/** 供启用门控复用 */
export const isDataSourceSupported = isSupported;

const capabilityLabel = (ds: TemplateDataSource): string =>
  TEMPLATE_DATA_SOURCE_LABELS[ds.type];

const emptyFor = (ds: TemplateDataSource): unknown => {
  if (
    ds.type === "server_status" ||
    ds.type === "player_profile" ||
    ds.type === "binding_stats" ||
    ds.type === "placeholder_rank" ||
    ds.type === "player_statistics" ||
    ds.type === "player_advancements" ||
    ds.type === "player_equipment"
  ) {
    return null;
  }
  if (ds.type === "placeholder" && ds.target === "self") {
    return null;
  }
  return [];
};

const resolvePlaceholder = async (
  ds: Extract<TemplateDataSource, { type: "placeholder" }>,
  session: ServerSession,
  ctx: ResolveContext,
): Promise<TemplateDataShape["placeholder"]> => {
  const placeholders = resolvePlaceholderIds(ds, ctx.config);

  if (ds.target === "self") {
    const player = ctx.contextPlayer;
    if (!player) {
      return null;
    }
    if (placeholders.length === 0) {
      return { name: player.name, uuid: player.uuid, values: {} };
    }
    const results = await session.getPlaceholders([{ placeholders, player }]);
    const values = results.find((r) => r.player === player.uuid)?.values ?? {};
    return { name: player.name, uuid: player.uuid, values };
  }

  let players: MinimalPlayer[];
  if (ds.target === "online_players") {
    const online = await (ctx.playerMemo?.online() ?? session.getPlayers());
    players = online.map((p) => ({ name: p.name, uuid: p.uuid }));
  } else {
    const limit = Math.min(
      ds.limit ?? KNOWN_PLAYERS_DEFAULT_LIMIT,
      PLAYERS_HARD_CAP,
    );
    players = await (ctx.playerMemo?.known(limit) ??
      getKnownPlayers(session.serverId, limit));
  }

  const limited = players.slice(
    0,
    Math.min(ds.limit ?? PLAYERS_HARD_CAP, PLAYERS_HARD_CAP),
  );
  if (limited.length === 0) {
    return [];
  }
  if (placeholders.length === 0) {
    return limited.map((p) => ({ name: p.name, uuid: p.uuid, values: {} }));
  }
  const requests: PlaceholderRequest[] = limited.map((player) => ({
    placeholders,
    player,
  }));
  const results = await session.getPlaceholders(requests);
  const byUuid = new Map(results.map((r) => [r.player, r.values]));
  return limited.map((p) => ({
    name: p.name,
    uuid: p.uuid,
    values: byUuid.get(p.uuid) ?? {},
  }));
};

/** 未绑定时为 null */
const resolveProfile = async (
  session: ServerSession,
  ctx: ResolveContext,
): Promise<TemplateDataShape["player_profile"]> => {
  const player = ctx.contextPlayer;
  if (!player) {
    return null;
  }
  const profile = await getPlayerProfile(player.uuid, session.serverId);
  if (!profile) {
    return null;
  }
  return {
    firstJoinedAt: profile.firstJoinedAt?.toISOString() ?? null,
    name: profile.name,
    social: profile.social
      ? {
          boundAt: profile.social.boundAt.toISOString(),
          nickname: profile.social.nickname,
          platform: profile.social.platform,
          uid: profile.social.uid,
        }
      : null,
    uuid: profile.uuid,
  };
};

const RECENT_JOINS_DEFAULT_LIMIT = 10;
const RANK_POOL_DEFAULT_LIMIT = 100;

const resolveRecentJoins = async (
  ds: Extract<TemplateDataSource, { type: "recent_joins" }>,
  session: ServerSession,
): Promise<TemplateDataShape["recent_joins"]> => {
  const limit = Math.min(ds.limit ?? RECENT_JOINS_DEFAULT_LIMIT, 50);
  const joins = await getRecentJoins(session.serverId, limit, ds.withinDays);
  return joins.map((j) => ({
    joinedAt: j.joinedAt.toISOString(),
    name: j.name,
    uuid: j.uuid,
  }));
};

/** 剥离非数字字符；解析失败为 null */
export const parseNumeric = (raw: string): number | null => {
  const n = Number.parseFloat(raw.replaceAll(/[^\d.-]/gu, ""));
  return Number.isFinite(n) ? n : null;
};

/** 未绑定 / 无数据时为 null */
const resolveRank = async (
  ds: Extract<TemplateDataSource, { type: "placeholder_rank" }>,
  session: ServerSession,
  ctx: ResolveContext,
): Promise<TemplateDataShape["placeholder_rank"]> => {
  const self = ctx.contextPlayer;
  if (!self) {
    return null;
  }
  const poolLimit = Math.min(
    ds.limit ?? RANK_POOL_DEFAULT_LIMIT,
    PLAYERS_HARD_CAP,
  );
  const known = await (ctx.playerMemo?.known(poolLimit) ??
    getKnownPlayers(session.serverId, poolLimit));
  const pool = known.some((p) => p.uuid === self.uuid)
    ? known
    : [...known, { name: self.name, uuid: self.uuid }];

  const results = await session.getPlaceholders(
    pool.map((player) => ({ placeholders: [ds.placeholder], player })),
  );
  const byUuid = new Map(results.map((r) => [r.player, r.values]));

  const scored = pool.map((p) => {
    const value = byUuid.get(p.uuid)?.[ds.placeholder] ?? "";
    return { name: p.name, numeric: parseNumeric(value), uuid: p.uuid, value };
  });
  const ranked = scored
    .filter((s): s is typeof s & { numeric: number } => s.numeric !== null)
    .toSorted((a, b) =>
      ds.order === "asc" ? a.numeric - b.numeric : b.numeric - a.numeric,
    );

  const selfEntry = scored.find((s) => s.uuid === self.uuid);
  const rankIdx = ranked.findIndex((s) => s.uuid === self.uuid);
  return {
    name: selfEntry?.name ?? self.name,
    numeric: selfEntry?.numeric ?? null,
    rank: rankIdx === -1 ? null : rankIdx + 1,
    total: ranked.length,
    uuid: self.uuid,
    value: selfEntry?.value ?? "",
  };
};

const STATUS_HISTORY_DEFAULT_WINDOW = 60;
const STATUS_HISTORY_HARD_LIMIT = 1000;

const resolveStatusHistory = async (
  ds: Extract<TemplateDataSource, { type: "server_status_history" }>,
  session: ServerSession,
): Promise<TemplateDataShape["server_status_history"]> => {
  const windowMinutes = Math.min(
    ds.windowMinutes ?? STATUS_HISTORY_DEFAULT_WINDOW,
    720,
  );
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const samples = await getStatusHistory(
    session.serverId,
    since,
    STATUS_HISTORY_HARD_LIMIT,
  );
  return samples.map((s) => ({
    mspt: s.mspt,
    online: s.online,
    t: s.t.toISOString(),
    tps: s.tps,
  }));
};

const EVENT_LB_DEFAULT_WINDOW_DAYS = 7;
const EVENT_LB_DEFAULT_LIMIT = 10;

const resolveEventLeaderboard = async (
  ds: Extract<TemplateDataSource, { type: "event_leaderboard" }>,
  session: ServerSession,
): Promise<TemplateDataShape["event_leaderboard"]> => {
  const windowDays = Math.min(
    ds.windowDays ?? EVENT_LB_DEFAULT_WINDOW_DAYS,
    90,
  );
  const limit = Math.min(ds.limit ?? EVENT_LB_DEFAULT_LIMIT, 25);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const entries = await getEventLeaderboard(
    session.serverId,
    ds.event,
    since,
    limit,
  );
  return entries.map((e) => ({
    count: e.count,
    lastAt: e.lastAt.toISOString(),
    lastData: e.lastData,
    playerName: e.playerName,
    playerUuid: e.playerUuid,
  }));
};

/** 未绑定时为 null */
const resolveStatistics = async (
  ds: Extract<TemplateDataSource, { type: "player_statistics" }>,
  session: ServerSession,
  ctx: ResolveContext,
): Promise<TemplateDataShape["player_statistics"]> => {
  const self = ctx.contextPlayer;
  if (!self) {
    return null;
  }
  const results = await session.getStatistics([
    { player: { name: self.name, uuid: self.uuid }, statistics: ds.statistics },
  ]);
  const values = results.find((r) => r.player === self.uuid)?.values ?? {};
  return { name: self.name, uuid: self.uuid, values };
};

/** 未绑定为 null；离线玩家 online: false */
const resolveAdvancements = async (
  session: ServerSession,
  ctx: ResolveContext,
): Promise<TemplateDataShape["player_advancements"]> => {
  const self = ctx.contextPlayer;
  if (!self) {
    return null;
  }
  const results = await session.getAdvancements([
    { player: { name: self.name, uuid: self.uuid } },
  ]);
  const result = results.find((r) => r.player === self.uuid);
  return {
    advancements: result?.advancements ?? [],
    completed: result?.completed ?? 0,
    name: self.name,
    online: result?.online ?? false,
    total: result?.total ?? 0,
    uuid: self.uuid,
  };
};

/** 未绑定为 null；离线玩家 online: false */
const resolveEquipment = async (
  session: ServerSession,
  ctx: ResolveContext,
): Promise<TemplateDataShape["player_equipment"]> => {
  const self = ctx.contextPlayer;
  if (!self) {
    return null;
  }
  const results = await session.getEquipment([
    { player: { name: self.name, uuid: self.uuid } },
  ]);
  const result = results.find((r) => r.player === self.uuid);
  return {
    items: result?.items ?? [],
    name: self.name,
    online: result?.online ?? false,
    uuid: self.uuid,
  };
};

const callRpc = async (
  ds: TemplateDataSource,
  session: ServerSession,
  ctx: ResolveContext,
): Promise<unknown> => {
  switch (ds.type) {
    case "online_players": {
      return await (ctx.playerMemo?.online() ?? session.getPlayers());
    }
    case "server_status": {
      return await session.getServerStatus();
    }
    case "placeholder": {
      return await resolvePlaceholder(ds, session, ctx);
    }
    case "player_profile": {
      return await resolveProfile(session, ctx);
    }
    case "recent_joins": {
      return await resolveRecentJoins(ds, session);
    }
    case "binding_stats": {
      return await getBindingStats(session.serverId);
    }
    case "placeholder_rank": {
      return await resolveRank(ds, session, ctx);
    }
    case "server_status_history": {
      return await resolveStatusHistory(ds, session);
    }
    case "event_leaderboard": {
      return await resolveEventLeaderboard(ds, session);
    }
    case "player_statistics": {
      return await resolveStatistics(ds, session, ctx);
    }
    case "player_advancements": {
      return await resolveAdvancements(session, ctx);
    }
    case "player_equipment": {
      return await resolveEquipment(session, ctx);
    }
    default: {
      return null;
    }
  }
};

const resolveOne = async (
  ds: TemplateDataSource,
  session: ServerSession,
  ctx: ResolveContext,
): Promise<unknown> => {
  if (!isSupported(ds, session)) {
    if (ds.required) {
      throw new DataResolveError(
        `模板需要『${capabilityLabel(ds)}』能力，但当前服务器不支持`,
      );
    }
    return emptyFor(ds);
  }

  try {
    return await callRpc(ds, session, ctx);
  } catch (error) {
    if (ds.required) {
      if (error instanceof DataResolveError) {
        throw error;
      }
      throw new DataResolveError(
        `数据源 ${ds.id} 获取失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
    log.warn({ error, id: ds.id }, "可选数据源获取失败，降级为空");
    return emptyFor(ds);
  }
};

/** required 不可用即抛错中止；可选则降级 null/[] */
export const resolveDataSources = async (
  manifest: TemplateManifest,
  session: ServerSession,
  ctx: ResolveContext = {},
): Promise<Record<string, unknown>> => {
  const renderCtx: ResolveContext = {
    ...ctx,
    playerMemo: createPlayerMemo(session),
  };
  const entries = await Promise.all(
    manifest.dataSources.map(
      async (ds) => [ds.id, await resolveOne(ds, session, renderCtx)] as const,
    ),
  );
  return Object.fromEntries(entries);
};

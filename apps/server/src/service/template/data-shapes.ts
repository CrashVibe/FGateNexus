import type { BindingStats } from "#server/db/queries/player";
import type {
  AdvancementsResult,
  EquipmentResult,
  PlayerInfo,
  ServerStatus,
} from "#server/service/mcwsbridge/model";

/** 玩家 + 占位符键值 */
export interface PlaceholderEntry {
  name: string;
  uuid: string;
  values: Record<string, string>;
}

export interface PlayerProfileShape {
  firstJoinedAt: string | null;
  name: string;
  social: {
    boundAt: string;
    nickname: string | null;
    platform: string;
    uid: string;
  } | null;
  uuid: string;
}

export interface RecentJoinShape {
  joinedAt: string;
  name: string;
  uuid: string;
}

export interface PlaceholderRankShape {
  name: string;
  numeric: number | null;
  rank: number | null;
  total: number;
  uuid: string;
  value: string;
}

export interface StatusHistoryPoint {
  mspt: number | null;
  online: number;
  t: string;
  tps: number | null;
}

export interface EventLeaderboardEntryShape {
  count: number;
  lastAt: string;
  lastData: Record<string, unknown> | null;
  playerName: string | null;
  playerUuid: string;
}

export interface PlayerStatisticsShape {
  name: string;
  uuid: string;
  values: Record<string, number>;
}

export interface PlayerAdvancementsShape {
  advancements: AdvancementsResult["advancements"];
  completed: number;
  name: string;
  online: boolean;
  total: number;
  uuid: string;
}

export interface PlayerEquipmentShape {
  items: EquipmentResult["items"];
  name: string;
  online: boolean;
  uuid: string;
}

/** 各 dataSource 的渲染输出形状，real/mock 两路径共用 */
export interface TemplateDataShape {
  online_players: PlayerInfo[];
  server_status: ServerStatus | null;
  placeholder: PlaceholderEntry | PlaceholderEntry[] | null;
  player_profile: PlayerProfileShape | null;
  recent_joins: RecentJoinShape[];
  binding_stats: BindingStats;
  placeholder_rank: PlaceholderRankShape | null;
  server_status_history: StatusHistoryPoint[];
  event_leaderboard: EventLeaderboardEntryShape[];
  player_statistics: PlayerStatisticsShape | null;
  player_advancements: PlayerAdvancementsShape | null;
  player_equipment: PlayerEquipmentShape | null;
}

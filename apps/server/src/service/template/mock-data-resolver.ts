import { faker } from "@faker-js/faker";

import { parseNumeric } from "#server/service/template/data-resolver";
import { resolvePlaceholderIds } from "#server/service/template/dynamic-placeholders";
import type { TemplateInstanceConfig } from "#shared/model/template/schema/instance";
import type {
  TemplateDataSource,
  TemplateManifest,
} from "#shared/model/template/schema/manifest";

/** 真实账号，避免头像接口请求失败 */
const MOCK_PLAYERS = [
  // 嘻嘻
  { name: "MrlingXD", uuid: "dc16448a-3c4d-42a9-838e-30f4723f37b9" },
  { name: "Notch", uuid: "069a79f4-44e9-4726-a5be-fca90e38aaf5" },
  { name: "jeb_", uuid: "853c80ef-3c37-49fd-aa49-938b674adae6" },
  { name: "Dinnerbone", uuid: "61699b2e-d327-4a01-9f1e-0ea8c3f06bc6" },
  { name: "Grumm", uuid: "e6b5c088-0680-44df-9e1b-9bf11792291b" },
  { name: "Mojang", uuid: "0bec5711-4316-4a8f-b61b-2a119e652082" },
  { name: "xPeke", uuid: "86b10f4e-9cd4-4fea-aabc-c02411f0de90" },
  { name: "Hypixel", uuid: "f7c77d99-9f15-4a66-a87d-c4a51ef30d19" },
  { name: "Dream", uuid: "ec70bcaf-702f-4bb8-b48d-276fa52a780c" },
  { name: "TommyInnit", uuid: "e80e8194-323e-4142-9851-5e1bcb8a3508" },
  { name: "Technoblade", uuid: "b876ec32-e396-476b-a115-8438d83c67d4" },
  { name: "Tubbo", uuid: "b25efb42-bda6-4413-8da9-4eae3d345746" },
  { name: "PhilzA", uuid: "f327197b-e9dd-4491-82cd-6cef1d59346e" },
  { name: "GeorgeNotFound", uuid: "bd3dd5a4-0438-4699-b2fd-36f518154b41" },
  { name: "Fundy", uuid: "ee72206b-dc8e-4f09-aa10-6911ecd8a299" },
] as const;

/** "self" 的预览主体 */
const [MOCK_SELF] = MOCK_PLAYERS;

const GAME_MODES = ["survival", "creative", "adventure", "spectator"] as const;
const WORLD_NAMES = ["world", "world_nether", "world_the_end"] as const;

const mockOnlinePlayers = (): unknown[] =>
  MOCK_PLAYERS.map((player) => ({
    ...player,
    displayName: player.name,
    gameMode: faker.helpers.arrayElement(GAME_MODES),
    ping: faker.number.int({ max: 120, min: 5 }),
    world: faker.helpers.arrayElement(WORLD_NAMES),
  }));

const mockServerStatus = (): unknown => ({
  max: 100,
  mspt: faker.number.float({ fractionDigits: 2, max: 45, min: 5 }),
  online: MOCK_PLAYERS.length,
  tps: faker.number.float({ fractionDigits: 2, max: 20, min: 18 }),
  worlds: WORLD_NAMES.map((name) => ({
    name,
    playerCount: faker.number.int({ max: MOCK_PLAYERS.length, min: 0 }),
  })),
});

const mockPlaceholderValue = (placeholder: string): string => {
  switch (placeholder) {
    case "vault_eco_balance": {
      return faker.number
        .float({ fractionDigits: 2, max: 200_000, min: 0 })
        .toFixed(2);
    }
    case "player_health": {
      return String(faker.number.int({ max: 20, min: 1 }));
    }
    case "player_max_health": {
      return "20";
    }
    case "player_food_level": {
      return String(faker.number.int({ max: 20, min: 0 }));
    }
    case "player_level": {
      return String(faker.number.int({ max: 100, min: 0 }));
    }
    case "skinsrestorer_texture_id_or_steve": {
      // 模拟未装 SkinsRestorer，触发头像回退
      return "%skinsrestorer_texture_id_or_steve%";
    }
    default: {
      return faker.datatype.boolean()
        ? String(faker.number.int({ max: 9999, min: 0 }))
        : faker.word.sample();
    }
  }
};

const mockPlaceholderEntry = (
  player: (typeof MOCK_PLAYERS)[number],
  placeholders: string[],
): unknown => ({
  name: player.name,
  uuid: player.uuid,
  values: Object.fromEntries(
    placeholders.map((p) => [p, mockPlaceholderValue(p)]),
  ),
});

const mockPlaceholder = (
  ds: Extract<TemplateDataSource, { type: "placeholder" }>,
  config: TemplateInstanceConfig,
): unknown => {
  const placeholders = resolvePlaceholderIds(ds, config);
  if (ds.target === "self") {
    return mockPlaceholderEntry(MOCK_SELF, placeholders);
  }
  const limit = Math.min(ds.limit ?? MOCK_PLAYERS.length, MOCK_PLAYERS.length);
  return MOCK_PLAYERS.slice(0, limit).map((p) =>
    mockPlaceholderEntry(p, placeholders),
  );
};

const mockPlayerProfile = (): unknown => ({
  firstJoinedAt: faker.date.past({ years: 2 }).toISOString(),
  name: MOCK_SELF.name,
  social: {
    boundAt: faker.date.recent({ days: 90 }).toISOString(),
    nickname: faker.internet.username(),
    platform: "onebot",
    uid: faker.string.numeric(9),
  },
  uuid: MOCK_SELF.uuid,
});

const mockRecentJoins = (
  ds: Extract<TemplateDataSource, { type: "recent_joins" }>,
): unknown => {
  const limit = Math.min(ds.limit ?? 10, MOCK_PLAYERS.length);
  return MOCK_PLAYERS.slice(0, limit).map((p, i) => ({
    // 越靠后越早加入，模拟倒序
    joinedAt: faker.date
      .recent({ days: 1 + i * 2, refDate: Date.now() })
      .toISOString(),
    name: p.name,
    uuid: p.uuid,
  }));
};

const mockBindingStats = (): unknown => {
  const onebot = faker.number.int({ max: 90, min: 40 });
  const discord = faker.number.int({ max: 30, min: 5 });
  const bound = onebot + discord;
  const unbound = faker.number.int({ max: 60, min: 10 });
  return {
    bound,
    byPlatform: [
      { count: onebot, platform: "onebot" },
      { count: discord, platform: "discord" },
    ],
    total: bound + unbound,
    unbound,
  };
};

const mockStatisticValue = (stat: string): number => {
  switch (stat) {
    case "DEATHS": {
      return faker.number.int({ max: 200, min: 0 });
    }
    case "PLAYER_KILLS": {
      return faker.number.int({ max: 80, min: 0 });
    }
    case "MOB_KILLS": {
      return faker.number.int({ max: 3000, min: 0 });
    }
    case "PLAY_ONE_MINUTE": {
      // 单位是 tick，20/秒
      return faker.number.int({ max: 6_000_000, min: 12_000 });
    }
    case "WALK_ONE_CM": {
      return faker.number.int({ max: 50_000_000, min: 0 });
    }
    case "JUMP": {
      return faker.number.int({ max: 100_000, min: 0 });
    }
    default: {
      return faker.number.int({ max: 10_000, min: 0 });
    }
  }
};

const mockPlayerStatistics = (
  ds: Extract<TemplateDataSource, { type: "player_statistics" }>,
): unknown => ({
  name: MOCK_SELF.name,
  uuid: MOCK_SELF.uuid,
  values: Object.fromEntries(
    ds.statistics.map((s) => [s, mockStatisticValue(s)]),
  ),
});

/** 各分类成就数 */
const ADV_CATEGORIES: Record<string, number> = {
  adventure: 35,
  end: 9,
  husbandry: 23,
  nether: 24,
  story: 15,
};

/** 均有贴图，避免预览缺图 */
const ADV_ICONS = [
  "iron_pickaxe",
  "diamond",
  "diamond_pickaxe",
  "iron_ingot",
  "gold_ingot",
  "emerald",
  "map",
  "compass",
  "clock",
  "wheat",
  "bread",
  "cooked_beef",
  "ender_pearl",
  "blaze_rod",
  "nether_star",
  "elytra",
  "golden_apple",
  "spyglass",
  "fishing_rod",
  "water_bucket",
  "bone",
  "allay_spawn_egg",
  "book",
  "bow",
  "shield",
  "trident",
  "totem_of_undying",
  "honeycomb",
] as const;

/** 预览占位，真实标题来自 FGateClient */
const titleCase = (s: string): string =>
  s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** 测试 block 贴图回退链 */
const ADV_BLOCK_ICONS = [
  "grass_block",
  "crafting_table",
  "furnace",
  "oak_log",
  "red_bed",
  "bookshelf",
] as const;

const mockPlayerAdvancements = (): unknown => {
  const advancements: {
    block: boolean;
    done: boolean;
    icon: string;
    key: string;
    name: string;
  }[] = [];
  let idx = 0;
  for (const [cat, n] of Object.entries(ADV_CATEGORIES)) {
    for (let i = 0; i < n; i += 1) {
      const isBlock = idx % 4 === 0;
      const icon = isBlock
        ? ADV_BLOCK_ICONS[idx % ADV_BLOCK_ICONS.length]
        : ADV_ICONS[idx % ADV_ICONS.length];
      advancements.push({
        block: isBlock,
        done: faker.datatype.boolean(0.55),
        icon,
        key: `minecraft:${cat}/adv_${i}`,
        name: titleCase(icon),
      });
      idx += 1;
    }
  }
  const completed = advancements.filter((a) => a.done).length;
  return {
    advancements,
    completed,
    name: MOCK_SELF.name,
    online: true,
    total: advancements.length,
    uuid: MOCK_SELF.uuid,
  };
};

const MOCK_EQUIPMENT = [
  {
    enchantments: [{ level: 4, name: "protection" }],
    slot: "helmet",
    type: "DIAMOND_HELMET",
  },
  {
    enchantments: [
      { level: 4, name: "protection" },
      { level: 3, name: "unbreaking" },
    ],
    slot: "chestplate",
    type: "NETHERITE_CHESTPLATE",
  },
  {
    enchantments: [{ level: 2, name: "protection" }],
    slot: "leggings",
    type: "DIAMOND_LEGGINGS",
  },
  {
    enchantments: [{ level: 3, name: "feather_falling" }],
    slot: "boots",
    type: "DIAMOND_BOOTS",
  },
  {
    enchantments: [
      { level: 5, name: "sharpness" },
      { level: 3, name: "looting" },
    ],
    slot: "mainHand",
    type: "NETHERITE_SWORD",
  },
  { enchantments: [], slot: "offHand", type: "SHIELD" },
] as const;

const mockPlayerEquipment = (): unknown => ({
  items: MOCK_EQUIPMENT.map((e) => ({ ...e, amount: 1 })),
  name: MOCK_SELF.name,
  online: true,
  uuid: MOCK_SELF.uuid,
});

const DEATH_MESSAGES = [
  "被苦力怕炸死了",
  "掉进了岩浆里",
  "被僵尸杀死了",
  "从高处摔了下来",
  "被骷髅射杀",
  "淹死了",
] as const;

const mockEventLeaderboard = (
  ds: Extract<TemplateDataSource, { type: "event_leaderboard" }>,
): unknown => {
  const limit = Math.min(ds.limit ?? 10, MOCK_PLAYERS.length);
  return MOCK_PLAYERS.slice(0, limit)
    .map((p, i) => ({
      count: faker.number.int({ max: Math.max(40 - i * 3, 2), min: 1 }),
      lastAt: faker.date.recent({ days: 3 }).toISOString(),
      lastData:
        ds.event === "player.death"
          ? {
              message: `${p.name} ${faker.helpers.arrayElement(DEATH_MESSAGES)}`,
            }
          : null,
      playerName: p.name,
      playerUuid: p.uuid,
    }))
    .toSorted((a, b) => b.count - a.count);
};

const mockStatusHistory = (
  ds: Extract<TemplateDataSource, { type: "server_status_history" }>,
): unknown => {
  const windowMinutes = Math.min(ds.windowMinutes ?? 60, 720);
  const points = Math.min(windowMinutes, 60);
  const now = Date.now();
  const step = (windowMinutes * 60 * 1000) / Math.max(points, 1);
  return Array.from({ length: points }, (_unused, i) => ({
    mspt: faker.number.float({ fractionDigits: 1, max: 45, min: 5 }),
    online: faker.number.int({ max: 60, min: 5 }),
    t: new Date(now - (points - 1 - i) * step).toISOString(),
    tps: faker.number.float({ fractionDigits: 1, max: 20, min: 17 }),
  }));
};

const mockPlaceholderRank = (
  ds: Extract<TemplateDataSource, { type: "placeholder_rank" }>,
): unknown => {
  const total = faker.number.int({ max: 200, min: 30 });
  const value = mockPlaceholderValue(ds.placeholder);
  return {
    name: MOCK_SELF.name,
    numeric: parseNumeric(value),
    rank: faker.number.int({ max: total, min: 1 }),
    total,
    uuid: MOCK_SELF.uuid,
    value,
  };
};

const resolveMockOne = (
  ds: TemplateDataSource,
  config: TemplateInstanceConfig,
): unknown => {
  switch (ds.type) {
    case "online_players": {
      return mockOnlinePlayers();
    }
    case "server_status": {
      return mockServerStatus();
    }
    case "placeholder": {
      return mockPlaceholder(ds, config);
    }
    case "player_profile": {
      return mockPlayerProfile();
    }
    case "recent_joins": {
      return mockRecentJoins(ds);
    }
    case "binding_stats": {
      return mockBindingStats();
    }
    case "placeholder_rank": {
      return mockPlaceholderRank(ds);
    }
    case "server_status_history": {
      return mockStatusHistory(ds);
    }
    case "event_leaderboard": {
      return mockEventLeaderboard(ds);
    }
    case "player_statistics": {
      return mockPlayerStatistics(ds);
    }
    case "player_advancements": {
      return mockPlayerAdvancements();
    }
    case "player_equipment": {
      return mockPlayerEquipment();
    }
    default: {
      return null;
    }
  }
};

/** mock 版 resolveDataSources，不依赖真实连接 */
export const resolveMockDataSources = (
  manifest: TemplateManifest,
  config: TemplateInstanceConfig = {},
): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  for (const ds of manifest.dataSources) {
    data[ds.id] = resolveMockOne(ds, config);
  }
  return data;
};

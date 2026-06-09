import { eq } from "drizzle-orm";

import { db } from "../client";
import { serverTable } from "../schema";

export const getServerByIdWithBotAndTargets = async (serverId: number) =>
  db.query.serverTable.findFirst({
    where: eq(serverTable.id, serverId),
    with: { bot: true, targets: true },
  });

export const getServersByBotIdWithTargets = async (botId: number) =>
  db.query.serverTable.findMany({
    where: eq(serverTable.botId, botId),
    with: { targets: true },
  });

export type ServerWithTargets = Awaited<
  ReturnType<typeof getServersByBotIdWithTargets>
>[number];

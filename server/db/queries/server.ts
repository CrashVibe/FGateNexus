import { eq } from "drizzle-orm";

import { db } from "../client";
import { servers } from "../schema";

export const getServerByIdWithAdapterAndTargets = async (serverId: number) =>
  db.query.servers.findFirst({
    where: eq(servers.id, serverId),
    with: { adapter: true, targets: true },
  });

export const getServersByAdapterIdWithTargets = async (adapterId: number) =>
  db.query.servers.findMany({
    where: eq(servers.adapterId, adapterId),
    with: { targets: true },
  });

export type ServerWithTargets = Awaited<
  ReturnType<typeof getServersByAdapterIdWithTargets>
>[number];

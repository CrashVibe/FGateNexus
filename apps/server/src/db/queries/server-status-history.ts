import { and, asc, eq, gte, lt } from "drizzle-orm";

import { db } from "../client";
import { serverStatusHistoryTable } from "../schema";

export interface StatusSampleInput {
  online: number;
  /** Paper 专有，缺失为 null */
  tps: number | null;
  mspt: number | null;
}

export interface StatusSample {
  t: Date;
  online: number;
  tps: number | null;
  mspt: number | null;
}

export const insertStatusSample = async (
  serverId: number,
  sample: StatusSampleInput,
): Promise<void> => {
  await db.insert(serverStatusHistoryTable).values({
    mspt: sample.mspt,
    online: sample.online,
    serverId,
    tps: sample.tps,
  });
};

export const getStatusHistory = async (
  serverId: number,
  since: Date,
  limit: number,
): Promise<StatusSample[]> =>
  await db
    .select({
      mspt: serverStatusHistoryTable.mspt,
      online: serverStatusHistoryTable.online,
      t: serverStatusHistoryTable.createdAt,
      tps: serverStatusHistoryTable.tps,
    })
    .from(serverStatusHistoryTable)
    .where(
      and(
        eq(serverStatusHistoryTable.serverId, serverId),
        gte(serverStatusHistoryTable.createdAt, since),
      ),
    )
    .orderBy(asc(serverStatusHistoryTable.createdAt))
    .limit(limit);

/** 保留期清理 */
export const deleteStatusBefore = async (cutoff: Date): Promise<void> => {
  await db
    .delete(serverStatusHistoryTable)
    .where(lt(serverStatusHistoryTable.createdAt, cutoff));
};

import type { BindingConfig } from "~~/shared/schemas/server/binding";

import { eq } from "drizzle-orm";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";

export async function getConfig(serverId: number): Promise<BindingConfig> {
  const result = await db.query.servers.findFirst({
    where: eq(servers.id, serverId)
  });
  if (!result) throw new Error("Server not found");

  return result.bindingConfig;
}

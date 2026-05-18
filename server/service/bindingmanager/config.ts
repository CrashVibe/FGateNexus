import { eq } from "drizzle-orm";
import { db } from "~~/server/db/client";
import { serverTable } from "~~/server/db/schema";

import { BindingConfigSchema } from "#shared/model/server/schema/binding";
import type { BindingConfig } from "#shared/model/server/schema/binding";

export const getConfig = async (serverId: number): Promise<BindingConfig> => {
  const result = await db.query.serverTable.findFirst({
    where: eq(serverTable.id, serverId),
  });
  if (!result) {
    throw new Error("Server not found");
  }

  return BindingConfigSchema.parse(result.bindingConfig);
};

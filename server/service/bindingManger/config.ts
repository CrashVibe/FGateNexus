import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import type { BindingConfig } from "~~/shared/schemas/server/config";
import { eq } from "drizzle-orm";

export async function getConfig(serverId: number): Promise<BindingConfig> {
    const database = await getDatabase();
    const result = await database.query.servers.findFirst({
        where: eq(servers.id, serverId)
    });
    if (!result) throw new Error("Server not found");
    const bindingConfig = result.bindingConfig;
    return bindingConfig;
}

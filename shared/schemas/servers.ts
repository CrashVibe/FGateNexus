import { z } from "zod";
import type { servers } from "~~/server/db/schema";
import type { GetClientInfoResult } from "~~/server/utils/pluginbrige/ConnectionManager";

export const serverSchemaRequset = z.object({
    servername: z.string().min(2, "长度至少为 2 个字符").max(24, "长度最多为 24 个字符"),
    token: z.string().min(4, "Token 长度至少为 4 个字符").max(64, "Token 长度最多为 64 个字符")
});

export type serverSchemaRequsetType = z.infer<typeof serverSchemaRequset>;

export type serverSchema = typeof servers.$inferSelect;

export type ServerWithStatus = serverSchema &
    GetClientInfoResult & {
        isOnline: boolean;
    };

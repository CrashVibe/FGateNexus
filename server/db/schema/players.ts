import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { socialAccounts } from "./socialAccounts";

export const players = sqliteTable("players", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull().unique("uuid_idx"),
    name: text("name").notNull(),
    ip: text("ip"),
    socialAccountId: integer("social_account_id").references(() => socialAccounts.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`)
});

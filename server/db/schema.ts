import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const servers = sqliteTable("servers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique("name_idx"),
    token: text("token").notNull().unique("token_idx"),
    minecraft_version: text("software"),
    minecraft_software: text("version")
    // adapter_id: integer('adapter_id').references(() => adapters.id, { onDelete: 'set null' })
});

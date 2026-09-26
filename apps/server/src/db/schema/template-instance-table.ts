import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type {
  TemplateBinding,
  TemplateInstanceConfig,
} from "#shared/model/template/schema/instance";

import { serverTable } from "./server-table";

export const templateInstanceTable = sqliteTable(
  "template_instance",
  {
    binding: text("binding", { mode: "json" }).$type<TemplateBinding | null>(),
    config: text("config", { mode: "json" })
      .notNull()
      .$type<TemplateInstanceConfig>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    id: text("id").primaryKey(),
    name: text("name").notNull().default(""),
    serverId: integer("server_id")
      .notNull()
      .references(() => serverTable.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("uniq_template_per_server").on(t.serverId, t.templateId)],
);

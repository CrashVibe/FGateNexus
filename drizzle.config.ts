import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url: "./data/sqlite.db",
  },
  dialect: "sqlite",
  out: "./migrations",
  schema: "./server/db/schema",
});

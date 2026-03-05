import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url: "sqlite.db",
  },
  dialect: "sqlite",
  out: "./migrations",
  schema: "./server/db/schema",
});

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "sqlite.db"
  }
});

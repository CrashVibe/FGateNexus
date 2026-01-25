import type { Config } from "drizzle-kit";

export default {
  schema: "./server/db/schema",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "sqlite.db"
  }
} satisfies Config;

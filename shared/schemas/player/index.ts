import type { players, servers, socialAccounts } from "~~/server/db/schema";

export type PlayerWithRelations = {
    player: typeof players.$inferSelect;
    socialAccount: typeof socialAccounts.$inferSelect | null;
    servers: (typeof servers.$inferSelect)[];
};

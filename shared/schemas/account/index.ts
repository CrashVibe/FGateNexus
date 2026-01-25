import type { players } from "~~/server/db/schema";

type players = typeof players.$inferSelect;

export type SocialAccountWithPlayers = {
  socialAccount: {
    id: number;
    nickname: string | null;
    uid: string;
    adapterType: string;
    createdAt: Date;
    updatedAt: Date;
  };
  players: players[];
};

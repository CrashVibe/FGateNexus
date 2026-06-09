import type { Session } from "koishi";

import { OneBotConfigSchema } from "#shared/model/bot/schema/onebot";
import { PlatformType } from "#shared/model/bot/types";

import type { PlatformSender } from "./sender/types";

export class ConnectionStore {
  private readonly connectionMap = new Map<number, PlatformSender>();

  public has(botId: number): boolean {
    return this.connectionMap.has(botId);
  }

  public add(connection: PlatformSender): void {
    if (this.connectionMap.has(connection.botId)) {
      throw new Error(`Platform sender already exists: ${connection.botId}`);
    }
    this.connectionMap.set(connection.botId, connection);
  }

  public get(botId: number): PlatformSender | undefined {
    return this.connectionMap.get(botId);
  }

  public remove(botId: number): PlatformSender {
    const connection = this.connectionMap.get(botId);
    if (!connection) {
      throw new Error(`Platform sender not found: ${botId}`);
    }
    this.connectionMap.delete(botId);
    return connection;
  }

  public clear(): void {
    this.connectionMap.clear();
  }

  public values(): IterableIterator<PlatformSender> {
    return this.connectionMap.values();
  }

  public findBySession(session: Session): PlatformSender | undefined {
    return [...this.connectionMap.values()].find((connection) => {
      if (connection.platformType !== session.bot.platform) {
        return false;
      }
      if (connection.platformType === PlatformType.Onebot) {
        const parsed = OneBotConfigSchema.safeParse(connection.config);
        return parsed.success && parsed.data.selfId === session.bot.selfId;
      }
      return connection.platformType === PlatformType.Discord;
    });
  }
}

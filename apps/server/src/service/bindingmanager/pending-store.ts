import type { PendingBinding } from "./types";

/**
 * 待处理绑定的内存存储
 */
export class PendingBindingStore {
  // botID → (serverID:playerUID → PendingBinding)
  private readonly bindings = new Map<number, Map<string, PendingBinding>>();

  private static keyOf(serverID: number, playerUID: string): string {
    return `${serverID}:${playerUID}`;
  }

  /**
   * 取某个 bot 下的全部 pending 绑定
   */
  public getByBot(botID: number): Map<string, PendingBinding> | undefined {
    return this.bindings.get(botID);
  }

  /**
   * 查询某个 server + player 是否已有 pending 绑定
   */
  public find(
    botID: number,
    serverID: number,
    playerUID: string,
  ): PendingBinding | undefined {
    return this.bindings
      .get(botID)
      ?.get(PendingBindingStore.keyOf(serverID, playerUID));
  }

  /**
   * 添加一条 pending 绑定
   */
  public add(binding: PendingBinding): void {
    const bindings =
      this.bindings.get(binding.botID) ?? new Map<string, PendingBinding>();
    bindings.set(
      PendingBindingStore.keyOf(binding.serverID, binding.playerUID),
      binding,
    );
    this.bindings.set(binding.botID, bindings);
  }

  /**
   * 删除一条 pending 绑定
   */
  public delete(botID: number, serverID: number, playerUID: string): void {
    const bindings = this.bindings.get(botID);
    if (!bindings) {
      return;
    }
    bindings.delete(PendingBindingStore.keyOf(serverID, playerUID));
    if (bindings.size === 0) {
      this.bindings.delete(botID);
    }
  }

  /**
   * 清理所有过期的 pending 绑定
   */
  public cleanupExpired(): void {
    const now = new Date();
    for (const [botID, bindings] of this.bindings) {
      for (const [key, binding] of bindings) {
        if (binding.expiresAt < now) {
          bindings.delete(key);
        }
      }
      if (bindings.size === 0) {
        this.bindings.delete(botID);
      }
    }
  }
}

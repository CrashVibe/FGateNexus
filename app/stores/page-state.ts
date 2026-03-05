import { defineStore } from "pinia";

export interface PageState {
  isDirty: () => boolean;
  save: () => Promise<void>;
}

export const usePageStateStore = defineStore("pageState", {
  actions: {
    // 清理
    clearPageState() {
      this.pageState = null;
      this.to = null;
    },
    // 保存
    async savePage() {
      if (this.pageState?.save) {
        await this.pageState.save();
        this.to = null;
      }
    },
    // 注册
    setPageState(state: PageState) {
      this.pageState = state;
    },
    triggerDirty(to: string) {
      if (this.isPageDirty()) {
        this.to = to;
      }
    },
  },
  getters: {
    isPageDirty: (state) => () => state.pageState?.isDirty?.() ?? false,
  },
  state: (): { pageState: PageState | null; to: string | null } => ({
    pageState: null,
    to: null,
  }),
});

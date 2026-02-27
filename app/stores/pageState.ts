import { defineStore } from "pinia";

export interface PageState {
  isDirty: () => boolean;
  save: () => Promise<void>;
}

export const usePageStateStore = defineStore("pageState", {
  state: (): { pageState: PageState | null; to: string | null } => ({
    pageState: null,
    to: null
  }),
  actions: {
    // 注册
    setPageState(state: PageState) {
      this.pageState = state;
    },
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
    triggerDirty(to: string) {
      if (this.isPageDirty()) {
        this.to = to;
      }
    }
  },
  getters: {
    isPageDirty: (state) => () => {
      return state.pageState?.isDirty?.() ?? false;
    }
  }
});

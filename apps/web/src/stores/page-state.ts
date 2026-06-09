import { create } from "zustand";

/** 当前页面注册的脏检测 + 保存 + 取消回调（由各配置页在挂载时注册）。 */
export interface PageState {
  isDirty: () => boolean;
  save: () => Promise<void>;
  cancel?: () => void;
}

interface PageStateStore {
  pageState: PageState | null;
  /** 响应式脏标记：供 ServerHeader 订阅并显示保存/取消按钮。 */
  dirty: boolean;
  /** 触发脏拦截后，待跳转的目标路径（由布局监听弹窗）。 */
  to: string | null;
  setPageState: (state: PageState | null) => void;
  setDirty: (v: boolean) => void;
  clearPageState: () => void;
  isPageDirty: () => boolean;
  triggerDirty: (to: string) => void;
  savePage: () => Promise<void>;
  cancelPage: () => void;
}

export const usePageStateStore = create<PageStateStore>((set, get) => ({
  cancelPage() {
    get().pageState?.cancel?.();
    set({ dirty: false });
  },
  clearPageState() {
    set({ dirty: false, pageState: null, to: null });
  },
  dirty: false,
  isPageDirty() {
    return get().pageState?.isDirty() ?? false;
  },
  pageState: null,
  async savePage() {
    const { pageState } = get();
    if (pageState) {
      await pageState.save();
      set({ to: null });
    }
  },
  setDirty(v) {
    set({ dirty: v });
  },
  setPageState(state) {
    set({ pageState: state });
  },
  to: null,
  triggerDirty(to) {
    if (get().isPageDirty()) {
      set({ to });
    }
  },
}));

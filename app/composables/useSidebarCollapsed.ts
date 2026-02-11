import { isMobile } from "#imports";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function useSidebarCollapsed() {
  const collapsed = ref(isMobile.value);

  /** 从本地存储读取折叠状态 */
  const readStoredCollapsed = (): boolean | null => {
    if (isMobile.value) return null;
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return v === null ? null : v === "true";
  };

  /** 写入本地存储 */
  const writeStoredCollapsed = (v: boolean) => {
    if (!isMobile.value) localStorage.setItem(SIDEBAR_STORAGE_KEY, v ? "true" : "false");
  };

  /**设置折叠状态 */
  const setCollapsed = (v: boolean, persist = true) => {
    if (collapsed.value === v) return;
    collapsed.value = v;
    if (persist) writeStoredCollapsed(v);
  };

  /** 处理窗口大小变化 */
  const handleResize = () => {
    if (isMobile.value) {
      setCollapsed(true, false);
    } else {
      const stored = readStoredCollapsed();
      setCollapsed(stored ?? false, false);
    }
  };

  /** 折叠侧边栏 */
  const handleCollapse = () => {
    setCollapsed(true);
  };

  /** 展开侧边栏 */
  const handleExpand = () => {
    setCollapsed(false);
  };

  onMounted(() => {
    if (!isMobile.value) {
      const stored = readStoredCollapsed();
      if (stored !== null) collapsed.value = stored;
    } else {
      collapsed.value = true;
    }
    window.addEventListener("resize", handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });

  return {
    collapsed,
    handleCollapse,
    handleExpand
  };
}

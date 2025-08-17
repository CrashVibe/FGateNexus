export interface PageState {
    isDirty: () => boolean;
    save: () => Promise<void>;
}

let pageState: PageState | null = null;

export function usePageStateProvider() {
    // 注册
    function setPageState(state: PageState) {
        pageState = state;
    }
    // 清理
    function clearPageState() {
        pageState = null;
    }
    // 是否有未保存
    function isPageDirty() {
        return pageState?.isDirty ? pageState.isDirty() : false;
    }
    // 保存
    async function savePage() {
        if (pageState?.save) {
            await pageState.save();
        }
    }
    return {
        setPageState,
        clearPageState,
        isPageDirty,
        savePage
    };
}

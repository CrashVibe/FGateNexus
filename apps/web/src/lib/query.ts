import { QueryClient } from "@tanstack/react-query";

/** 全局 Query 客户端：默认禁用窗口聚焦重取，失败重试一次。 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

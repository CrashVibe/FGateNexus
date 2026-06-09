import { createContext, useContext } from "react";

import type { MenuColumn } from "@/lib/menu";

interface LayoutContextValue {
  menu: MenuColumn[];
  openMobileSidebar: () => void;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export const useLayout = (): LayoutContextValue => {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayout 必须在 DashboardLayout 内使用");
  }
  return ctx;
};

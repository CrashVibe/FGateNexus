import { useQuery } from "@tanstack/react-query";

import { BrowserData, VersionData } from "@/lib/api";

export const useBrowserConfig = () =>
  useQuery({
    queryFn: async () => await BrowserData.get(),
    queryKey: ["browser-config"],
  });

export const useVersion = () =>
  useQuery({
    queryFn: async () => await VersionData.get(),
    queryKey: ["version"],
  });

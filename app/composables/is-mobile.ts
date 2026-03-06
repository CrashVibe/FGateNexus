import { useBreakpoint } from "vooks";

export const useIsMobile = () => {
  const breakpoint = useBreakpoint();
  return computed(() => breakpoint.value === "xs" || breakpoint.value === "s");
};

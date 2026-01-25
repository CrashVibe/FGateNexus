import { useBreakpoint } from "vooks";

export const isMobile = computed(() => {
  const breakpoint = useBreakpoint();
  return breakpoint.value === "xs" || breakpoint.value === "s";
});

import { useCallback, useRef, useState } from "react";

export const useDragResize = (defaultWidth: number, min = 160, max = 600) => {
  const [width, setWidth] = useState(defaultWidth);
  const widthRef = useRef(width);
  widthRef.current = width;

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (ev: MouseEvent) => {
        setWidth(
          Math.max(min, Math.min(max, startWidth + ev.clientX - startX)),
        );
      };
      const onUp = () => {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [min, max],
  );

  return [width, startResize] as const;
};

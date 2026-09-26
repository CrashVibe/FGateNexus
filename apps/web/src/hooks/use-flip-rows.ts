import { useEffect, useLayoutEffect, useRef } from "react";

const FLIP_MS = 420;
const FLIP_EASE = "cubic-bezier(0.22, 1.24, 0.34, 1)";

type RowKey = string | number;

/**
 * FLIP：列表因插入/排序变化导致某行位置变化时，从旧位置动画到新位置
 * （新出现的行走 CSS 的滑入动画，见 useNewItemIds）。
 * items 只作为"什么时候需要重新测量"的变化信号，本身不被读取。
 */
export const useFlipRows = (items: unknown) => {
  const nodesRef = useRef(new Map<RowKey, HTMLDivElement>());
  const rectsRef = useRef(new Map<RowKey, DOMRect>());

  useLayoutEffect(() => {
    const nextRects = new Map<RowKey, DOMRect>();
    for (const [id, node] of nodesRef.current) {
      const rect = node.getBoundingClientRect();
      nextRects.set(id, rect);
      const prevRect = rectsRef.current.get(id);
      const dy = prevRect ? prevRect.top - rect.top : 0;
      if (!dy) {
        continue;
      }
      node.style.transition = "none";
      node.style.transform = `translateY(${dy}px)`;
      node.getBoundingClientRect(); // 强制回流，让位移先生效再过渡回 0
      requestAnimationFrame(() => {
        node.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
        node.style.transform = "";
      });
    }
    rectsRef.current = nextRects;
  }, [items]);

  return (id: RowKey) => (node: HTMLDivElement | null) => {
    if (node) {
      nodesRef.current.set(id, node);
    } else {
      nodesRef.current.delete(id);
    }
  };
};

/**
 * 返回相对上一次渲染新出现的 id 集合，首屏回填不计入。
 */
export const useNewItemIds = <T>(
  items: T[] | undefined,
  getId: (item: T) => RowKey,
) => {
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<RowKey>>(new Set());
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  useEffect(() => {
    if (items !== undefined) {
      seenIdsRef.current = new Set(items.map((item) => getIdRef.current(item)));
      initializedRef.current = true;
    }
  }, [items]);

  return (id: RowKey): boolean =>
    initializedRef.current && !seenIdsRef.current.has(id);
};

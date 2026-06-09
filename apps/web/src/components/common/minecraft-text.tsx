import { sample } from "lodash-es";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTheme } from "tanstack-theme-kit";

import { parseMinecraftText } from "#shared/utils/minecraft-format";

const OBFUSCATED_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?~`";
const SEGMENTER = new Intl.Segmenter();

const obfuscateText = (text: string): string =>
  [...SEGMENTER.segment(text)]
    .map(({ segment: ch }) =>
      ch === " " ? " " : (sample(OBFUSCATED_CHARS) ?? ch),
    )
    .join("");

/** 渲染 Minecraft 富文本（颜色码、加粗/斜体/混淆动画）。 */
export const MinecraftText = ({ text }: { text: string }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tick, setTick] = useState(0);

  const segments = useMemo(
    () => parseMinecraftText(text, isDark),
    [text, isDark],
  );
  const hasObfuscated = useMemo(
    () => segments.some((s) => s.obfuscated && s.text.length > 0),
    [segments],
  );

  useEffect(() => {
    // 单一返回路径（始终返回清理函数），兼顾 consistent-return 与 no-useless-undefined。
    let rafId = 0;
    if (hasObfuscated) {
      const animate = (): void => {
        setTick((t) => t + 1);
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [hasObfuscated]);

  const animating = hasObfuscated && tick >= 0;

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.lineBreak) {
          return <br key={`br-${i}`} />;
        }
        const style: CSSProperties = { color: seg.color };
        if (seg.bold) {
          style.fontWeight = "bold";
        }
        if (seg.italic) {
          style.fontStyle = "italic";
        }
        if (seg.obfuscated) {
          style.fontFamily = "monospace";
        }
        const decorations = [
          seg.strikethrough ? "line-through" : "",
          seg.underline ? "underline" : "",
        ].filter(Boolean);
        if (decorations.length > 0) {
          style.textDecoration = decorations.join(" ");
        }
        const content =
          seg.obfuscated && animating ? obfuscateText(seg.text) : seg.text;
        return (
          <span key={`${i}-${seg.text}`} style={style}>
            {content}
          </span>
        );
      })}
    </span>
  );
};

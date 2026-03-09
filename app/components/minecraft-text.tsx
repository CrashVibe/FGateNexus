import { sample } from "lodash-es";
import { computed, defineComponent, h, shallowRef, watchEffect } from "vue";
import type { CSSProperties } from "vue";
import { parseMinecraftText } from "~~/shared/utils/minecraft-format";

const OBFUSCATED_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?~`";
const SEGMENTER = new Intl.Segmenter();

const obfuscateText = (text: string): string =>
  [...SEGMENTER.segment(text)]
    .map(({ segment: ch }) =>
      ch === " " ? " " : (sample(OBFUSCATED_CHARS) ?? ch),
    )
    .join("");

export default defineComponent({
  name: "MinecraftText",
  props: {
    text: {
      required: true,
      type: String,
    },
  },
  setup(props) {
    const colorMode = useColorMode();
    const isDark = computed(() => colorMode.value === "dark");
    const tick = shallowRef(0);
    const segments = computed(() =>
      parseMinecraftText(props.text, isDark.value),
    );
    const hasObfuscated = computed(() =>
      segments.value.some((s) => s.obfuscated && s.text.length > 0),
    );

    watchEffect((onCleanup) => {
      if (!hasObfuscated.value) {
        return;
      }
      let rafId: number;
      const animate = () => {
        tick.value += 1;
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
      onCleanup(() => {
        cancelAnimationFrame(rafId);
      });
    });

    return () => {
      const segs = segments.value;
      // 仅在混淆动画运行时 animTick 非 null；读取 tick.value 使其成为响应式依赖，
      // 每帧均会触发重新渲染。
      const animTick = hasObfuscated.value ? tick.value : null;

      return h(
        "span",
        segs.map((seg, i) => {
          if (seg.lineBreak) {
            return h("br", { key: `br-${i}` });
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
            seg.obfuscated && animTick !== null
              ? obfuscateText(seg.text)
              : seg.text;

          return h(
            "span",
            {
              class: seg.obfuscated ? "minecraft-obfuscated" : undefined,
              key: i,
              style,
            },
            content,
          );
        }),
      );
    };
  },
});

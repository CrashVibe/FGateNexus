/**
 * Minecraft 颜色代码映射
 * 注意：'f'（白色）由调用方通过 darkMode 参数动态决定，不在此表中。
 */
export const MINECRAFT_COLORS: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
};

export interface McSegment {
  text: string;
  color: string;
  bold: boolean;
  strikethrough: boolean;
  underline: boolean;
  italic: boolean;
  obfuscated: boolean;
  lineBreak?: true;
}

/** 颜色/格式代码前缀字符集，`&` 与 `§` 均支持。 */
const CODE_PREFIXES = new Set(["&", "\u00A7"]);

/** 格式化代码（k/l/m/n/o）到状态修改函数的映射。 */
const FORMAT_SETTERS: Partial<Record<string, (s: McSegment) => void>> = {
  k: (s) => {
    s.obfuscated = true;
  },
  l: (s) => {
    s.bold = true;
  },
  m: (s) => {
    s.strikethrough = true;
  },
  n: (s) => {
    s.underline = true;
  },
  o: (s) => {
    s.italic = true;
  },
};

/** 匹配 Bungee 的 legacy hex 颜色代码 */
const BUNGEE_HEX_PATTERN = /^&x(&[0-9a-fA-F]){6}$/;

/** Bungee 的 legacy hex 颜色代码字符串长度 */
const HEX_LENGTH = 14;

export const makeSegment = (overrides: Partial<McSegment> = {}): McSegment => ({
  bold: false,
  color: "",
  italic: false,
  obfuscated: false,
  strikethrough: false,
  text: "",
  underline: false,
  ...overrides,
});

/**
 * 处理一个格式/颜色代码，返回应前进的字符数（0 表示未识别）。
 * 副作用：修改 st 状态并调用 flush。
 */
const applyCode = (
  code: string,
  line: string,
  i: number,
  st: McSegment,
  flush: () => void,
  defaultColor: string,
): number => {
  // 十六进制颜色：&x&R&R&G&G&B&B
  if (code === "x" && i + HEX_LENGTH < line.length) {
    const hex = line.slice(i, i + HEX_LENGTH);
    if (BUNGEE_HEX_PATTERN.test(hex)) {
      flush();
      let hexColor = "#";
      for (let j = 3; j < HEX_LENGTH; j += 2) {
        hexColor += hex[j];
      }
      st.color = hexColor;
      st.obfuscated = false;
      return HEX_LENGTH;
    }
  }

  // 重置所有格式
  if (code === "r") {
    flush();
    Object.assign(st, makeSegment({ color: defaultColor }));
    return 2;
  }

  // 预设颜色（'f' 跟随暗色模式）
  const colorVal = code === "f" ? defaultColor : MINECRAFT_COLORS[code];
  if (colorVal !== undefined) {
    flush();
    st.color = colorVal;
    st.obfuscated = false;
    return 2;
  }

  // 格式化代码（k/l/m/n/o）
  const setter = FORMAT_SETTERS[code];
  if (setter !== undefined) {
    flush();
    setter(st);
    return 2;
  }

  // 未识别的代码
  return 0;
};

/**
 * 将 Minecraft 格式化字符串解析为样式片段列表。
 * @param text     含 `&` 或 `§` 颜色代码的原始文本
 * @param darkMode 为 true 时使用白色（#F0F8FF）作为默认文字颜色
 */
export const parseMinecraftText = (
  text: string,
  darkMode: boolean,
): McSegment[] => {
  if (text === "") {
    return [];
  }

  const defaultColor = darkMode ? "#F0F8FF" : "#808080";
  const lines = text.split(/\\n|\n/);
  const segments: McSegment[] = [];

  const st = makeSegment({ color: defaultColor });
  let buffer = "";

  const flush = (): void => {
    if (buffer === "") {
      return;
    }
    segments.push({ ...st, text: buffer });
    buffer = "";
  };

  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li];

    if (li > 0) {
      flush();
      segments.push(makeSegment({ color: st.color, lineBreak: true }));
      Object.assign(st, makeSegment({ color: defaultColor }));
    }

    if (line === undefined || line === "") {
      continue;
    }

    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch !== undefined && CODE_PREFIXES.has(ch) && i + 1 < line.length) {
        const next = line[i + 1];
        if (next === undefined || next === "") {
          buffer += ch;
          i += 1;
          continue;
        }
        const code = next.toLowerCase();
        const advance = applyCode(code, line, i, st, flush, defaultColor);
        if (advance > 0) {
          i += advance;
        } else {
          // 未识别的代码，原样输出
          buffer += ch;
          i += 1;
        }
      } else {
        buffer += ch ?? "";
        i += 1;
      }
    }
  }

  flush();
  return segments;
};

/**
 * 将 McSegment 列表转为内联样式的 HTML 片段，可用于服务端渲染或前端展示。
 */
export const segmentsToHtml = (segments: McSegment[]): string =>
  segments
    .map((seg) => {
      if (seg.lineBreak) {
        return "<br/>";
      }
      const styles: string[] = [`color:${seg.color}`];
      if (seg.bold) {
        styles.push("font-weight:bold");
      }
      if (seg.italic) {
        styles.push("font-style:italic");
      }

      const decorations: string[] = [];
      if (seg.strikethrough) {
        decorations.push("line-through");
      }
      if (seg.underline) {
        decorations.push("underline");
      }
      if (decorations.length > 0) {
        styles.push(`text-decoration:${decorations.join(" ")}`);
      }

      const escaped = seg.text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

      return `<span style="${styles.join(";")}">${escaped}</span>`;
    })
    .join("");

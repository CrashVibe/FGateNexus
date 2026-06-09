import { h } from "koishi";

/**
 * 将消息 element 数组转换为展示用字符串
 */
export const elements_to_string = (elements: h[]): string =>
  h
    // oxlint-disable-next-line sort-keys
    .transform(elements, {
      // 基础元素
      text: ({ content }) => h.unescape(String(content ?? "")),
      at: ({ id, name, role, type }) => {
        if (type === "all") {
          return "@全体成员";
        }
        if (type === "here") {
          return "@在线成员";
        }
        if (role) {
          return `@${role}`;
        }
        return `@<${id ?? name}:${id ?? name}>`;
      },
      sharp: ({ id, name }) => `#${name ?? id ?? ""}`,
      a: ({ href }, children) => {
        const text = children
          .map((c) => String(c.attrs.content ?? ""))
          .join("");
        return href ? `${text}(${href})` : text;
      },

      // 资源元素
      img: ({ subType }) => {
        if (subType === 1) {
          return "[表情包]";
        }
        return "[图片]";
      },
      image: ({ subType }) => {
        if (subType === 1) {
          return "[表情包]";
        }
        return "[图片]";
      },
      audio: () => "[语音]",
      video: () => "[视频]",
      file: ({ title }) => `[文件${title ? `:${title}` : ""}]`,

      // 修饰元素（递归子节点，自身标记略去）
      b: true,
      strong: true,
      i: true,
      em: true,
      u: true,
      ins: true,
      s: true,
      del: true,
      spl: true,
      code: true,
      sup: true,
      sub: true,

      // 排版元素
      br: () => "\n",
      p: (_, children) => [...children, "\n"],
      message: (_, children) =>
        children.length ? ["[转发: ", ...children, "]"] : false,

      // 元信息 — 略去自身，只保留子节点文本
      quote: ({ id }) => `回复<${id}:${id}> `,
      author: false,

      // 交互元素

      button: true,

      // 平台特有表情（Onebot）
      face: ({ name }) => `[表情包${name ? `：${name}` : ""}]`,
      mface: ({ summary }) => `[表情包${summary ? `：${summary}` : ""}]`,
    })
    .map((el) => String(el.attrs.content ?? ""))
    .join("")
    .trim();

// 运行：bun apps/server/scripts/check-chat-filter.ts
import { ChatSyncConfigSchema } from "#shared/model/server/schema/chat-sync";
import { getFilterReason } from "#shared/utils/chat-sync";

const base = ChatSyncConfigSchema.parse({});
const cfg = (f: object) => ({ ...base, filters: { ...base.filters, ...f } });
const eq = (a: unknown, b: unknown) => {
  if (a !== b) {
    throw new Error(`${a} !== ${b}`);
  }
};
eq(getFilterReason("hi", base), null);
eq(getFilterReason("", base), "太短了（少于 1 字）");
eq(getFilterReason("x".repeat(501), base), "太长了（超过 500 字）");
eq(
  getFilterReason("你是SB吧", cfg({ blacklistKeywords: ["sb"] })),
  "命中屏蔽词「sb」",
);
eq(
  getFilterReason("qq123", cfg({ blacklistRegex: ["qq\\d+"] })),
  "命中屏蔽正则 /qq\\d+/",
);
const wl = cfg({
  filterMode: "whitelist",
  whitelistPrefixes: ["#"],
  whitelistRegex: ["^!\\w+"],
});
eq(getFilterReason("#hello", wl), null);
eq(getFilterReason("!cmd", wl), null); // 修复前：正则白名单永远不通过
eq(getFilterReason("plain", wl), "不符合白名单前缀或正则");
console.log("filter ok");

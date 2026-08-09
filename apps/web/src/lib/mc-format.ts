/** Paper 等服务端把版本塞进一长串构建信息里，提取出 MC 版本号 */
export const formatMcVersion = (original: string | null): string => {
  if (!original) {
    return "未知版本";
  }
  const match =
    /^(?<full>[\d.]+-\d+-[a-f0-9]+)\s+\(MC:\s*(?<mcVersion>[^)]+)\)/u.exec(
      original,
    );
  if (match) {
    return `v${match.groups?.mcVersion ?? ""}`;
  }
  return original;
};

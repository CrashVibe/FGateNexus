export const renderTemplate = (
  msg: string,
  params: Record<string, string>,
): string =>
  msg.replaceAll(
    /\{(?<key>\w+)\}/gu,
    (_: string, key: string) => params[key] ?? `{${key}}`,
  );

export const renderTemplate = (
  msg: string,
  params: Record<string, string>,
): string =>
  msg.replaceAll(
    /\{(\w+)\}/g,
    (_: string, key: string) => params[key] ?? `{${key}}`,
  );

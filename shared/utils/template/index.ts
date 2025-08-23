export function renderTemplate(msg: string, params: Record<string, string>): string {
    return msg.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key] ?? `{${key}}`; // 如果没有传对应参数，就原样保留
    });
}

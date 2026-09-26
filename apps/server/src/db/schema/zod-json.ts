import { customType } from "drizzle-orm/sqlite-core";
import type { z } from "zod";

/** JSON 列：读出时按 schema 校验，旧行自动补上新字段的默认值 */
export const zodJson = <S extends z.ZodType>(name: string, schema: S) =>
  customType<{ data: z.infer<S>; driverData: string }>({
    dataType: () => "text",
    fromDriver: (value) => schema.parse(JSON.parse(value)),
    toDriver: (value) => JSON.stringify(value),
  })(name);

import { Hash } from "@adonisjs/hash";
import { Scrypt } from "@adonisjs/hash/drivers/scrypt";

/**
 * 密码哈希 —— 使用 `@adonisjs/hash` 的 Scrypt 驱动（默认参数）。
 * Scrypt 产出自描述的 PHC 串（`$scrypt$...`），校验时从串内读取参数，
 * 因此现有库存哈希可直接通过 verify，无需重设密码。
 */
const hash = new Hash(new Scrypt({}));

export const hashPassword = async (password: string): Promise<string> =>
  hash.make(password);

export const verifyPassword = async (
  hashedPassword: string,
  plainPassword: string,
): Promise<boolean> => hash.verify(hashedPassword, plainPassword);

import { customAlphabet } from "nanoid";

import { CODE_MODES } from "#shared/model/server/binding";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBER = "0123456789";

const generators: Record<CODE_MODES, (size: number) => string> = {
  [CODE_MODES.UPPER]: customAlphabet(UPPER),
  [CODE_MODES.LOWER]: customAlphabet(LOWER),
  [CODE_MODES.NUMBER]: customAlphabet(NUMBER),
  [CODE_MODES.WORD]: customAlphabet(UPPER + LOWER),
  [CODE_MODES.MIX]: customAlphabet(UPPER + LOWER + NUMBER),
};

export const generateVerificationCode = (
  code_mode: CODE_MODES,
  length: number,
): string => generators[code_mode](length);

import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";

import translations from "./translations";

const options = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations,
};
zxcvbnOptions.setOptions(options);

/**
 * 密码强度验证结果
 */
export interface PasswordValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 错误信息（如果验证失败） */
  error?: string;
  /** 密码强度分数 (0-4) */
  score: number;
  /** 反馈信息 */
  feedback?: {
    warning?: string;
    suggestions?: string[];
  };
}

/**
 * 验证密码强度
 * @returns 验证结果
 */
export const validatePasswordStrength = (
  password: string,
  minLength = 8,
  minScore = 2,
): PasswordValidationResult => {
  // 长度检查
  if (password.length < minLength) {
    return {
      error: `密码长度至少${minLength}位`,
      isValid: false,
      score: 0,
    };
  }

  const asciiPattern = /^[\u0021-\u007E]+$/;
  if (!asciiPattern.test(password)) {
    return {
      error: "密码只能包含英文字母、数字和常见符号",
      isValid: false,
      score: 0,
    };
  }

  // 强度检查
  const result = zxcvbn(password);

  if (result.score < minScore) {
    return {
      error: result.feedback.warning ?? "密码强度不够，请使用更复杂的密码",
      feedback: {
        suggestions: result.feedback.suggestions,
        warning: result.feedback.warning ?? undefined,
      },
      isValid: false,
      score: result.score,
    };
  }

  return {
    feedback: {
      suggestions: result.feedback.suggestions,
      warning: result.feedback.warning ?? undefined,
    },
    isValid: true,
    score: result.score,
  };
};

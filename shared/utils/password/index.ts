import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import translations from "./translations";

const options = {
    translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
        ...zxcvbnCommonPackage.dictionary
    }
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
 * @param password 待验证的密码
 * @param minLength 最小长度，默认 8
 * @param minScore 最小强度分数 (0-4)，默认 2
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string, minLength = 8, minScore = 2): PasswordValidationResult {
    // 长度检查
    if (password.length < minLength) {
        return {
            isValid: false,
            error: `密码长度至少${minLength}位`,
            score: 0
        };
    }

    const asciiPattern = /^[\x21-\x7E]+$/;
    if (!asciiPattern.test(password)) {
        return {
            isValid: false,
            error: "密码只能包含英文字母、数字和常见符号",
            score: 0
        };
    }

    // 强度检查
    const result = zxcvbn(password);

    if (result.score < minScore) {
        return {
            isValid: false,
            error: result.feedback.warning || "密码强度不够，请使用更复杂的密码",
            score: result.score,
            feedback: {
                warning: result.feedback.warning || undefined,
                suggestions: result.feedback.suggestions
            }
        };
    }

    return {
        isValid: true,
        score: result.score,
        feedback: {
            warning: result.feedback.warning || undefined,
            suggestions: result.feedback.suggestions
        }
    };
}

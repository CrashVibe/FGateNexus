interface Variable {
  label: string;
  example: string | number;
}

/**
 * 将变量映射转换为数组形式
 * @param variablesMap 变量映射对象
 * @returns 变量数组
 */
export function createVariablesArray(variablesMap: Record<string, Variable>) {
  return Object.entries(variablesMap).map(([value, { label, example }]) => ({
    value,
    label,
    example
  }));
}

/**
 * 创建占位符变量配置
 * 这是一个工厂函数，用于生成类型安全的变量映射
 * @param variables 变量定义对象
 * @returns 变量映射对象
 */
export function createVariableMap<T extends Record<string, Variable>>(variables: T): T {
  return variables satisfies Record<string, Variable>;
}

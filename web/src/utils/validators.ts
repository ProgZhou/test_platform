export const validateParamName = (name: string): boolean => {
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return regex.test(name);
};

export const getParamNameError = (name: string): string | null => {
  if (!name) {
    return "参数名不能为空";
  }
  if (!validateParamName(name)) {
    return "参数名必须以字母或下划线开头，只能包含字母、数字和下划线";
  }
  return null;
};

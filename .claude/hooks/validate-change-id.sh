#!/usr/bin/env bash
# 验证文件操作是否在正确的 change-id 目录下

FILE_PATH=$(jq -r '.tool_input.file_path // ""')

if [[ "$FILE_PATH" =~ sdd/changes/ ]]; then
  # 从环境变量或上下文获取当前 change-id
  CURRENT_CHANGE_ID=$(cat .claude/current-change-id 2>/dev/null || echo "")
  
  if [[ -n "$CURRENT_CHANGE_ID" ]] && [[ ! "$FILE_PATH" =~ "sdd/changes/$CURRENT_CHANGE_ID" ]]; then
    echo "⚠️ 警告: 正在操作其他变更目录的文件: $FILE_PATH" >&2
    echo "当前变更: $CURRENT_CHANGE_ID" >&2
    echo "是否继续? (输入 yes 继续，其他任意键中止)" >&2
    read -r response
    if [[ "$response" != "yes" ]]; then
      exit 2
    fi
  fi
fi

exit 0
#!/usr/bin/env bash
# 检测变更完成后自动更新 memory.md

# 获取变更 ID
CHANGE_ID=$(cat .claude/current-change-id 2>/dev/null || echo "")
if [[ -z "$CHANGE_ID" ]]; then
  exit 0
fi

# 获取操作类型
TOOL_NAME=$(jq -r '.tool_name // ""')
FILE_PATH=$(jq -r '.tool_input.file_path // ""')

# 只记录对变更目录的写操作
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]] && [[ "$FILE_PATH" =~ "sdd/changes/$CHANGE_ID" ]]; then
  TIMESTAMP=$(date -Iseconds)
  
  # 追加到 memory.md
  echo "## [$TIMESTAMP] 变更 $CHANGE_ID - 文件更新" >> sdd/memory/memory.md
  echo "- 操作: $TOOL_NAME" >> sdd/memory/memory.md
  echo "- 文件: $FILE_PATH" >> sdd/memory/memory.md
  echo "" >> sdd/memory/memory.md
fi

exit 0
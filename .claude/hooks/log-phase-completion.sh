#!/usr/bin/env bash
# Agent 执行完成后记录阶段完成状态

CHANGE_ID=$(cat .claude/current-change-id 2>/dev/null || echo "")
if [[ -z "$CHANGE_ID" ]]; then
  exit 0
fi

AGENT_NAME=$(jq -r '.agent_name // ""')
META_FILE="sdd/changes/$CHANGE_ID/meta.json"

if [[ -f "$META_FILE" ]] && [[ -n "$AGENT_NAME" ]]; then
  # 根据 Agent 名称更新对应的阶段状态
  case "$AGENT_NAME" in
    "product-analyst")
      jq '.phases.product = "completed"' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"
      ;;
    "architect")
      jq '.phases.design = "completed"' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"
      ;;
    "test-designer")
      jq '.phases.test_design = "completed"' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"
      ;;
    "frontend-dev"|"backend-dev")
      jq '.phases.implementation = "completed"' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"
      ;;
    "code-reviewer")
      jq '.phases.code_review = "completed"' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"
      ;;
    "test-executor")
      jq '.phases.test_execution = "completed"' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"
      ;;
  esac
fi

exit 0
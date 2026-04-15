#!/usr/bin/env bash
# PreToolUse hook for Glob|Grep — injects codebase graph as additionalContext.
# Outputs JSON understood by Claude Code's hook system.
# If no graph exists yet, prompts Claude to run /graphify.

GRAPH=".claude/graph.json"

if [ -f "$GRAPH" ]; then
  # Extract file paths and top-level structure for a compact context injection.
  # Limit to 120 files to avoid context bloat.
  files=$(jq -r '.files | keys | .[]' "$GRAPH" 2>/dev/null | head -120)
  structure=$(jq -r '.structure // [] | .[]' "$GRAPH" 2>/dev/null | tr '\n' '  ')
  generated=$(jq -r '.generated // "unknown"' "$GRAPH" 2>/dev/null)

  jq -Rns \
    --arg files "$files" \
    --arg structure "$structure" \
    --arg generated "$generated" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: (
          "[Graphify] Codebase graph (built " + $generated + ") — consult before searching:\n" +
          "Top-level: " + $structure + "\n" +
          "Indexed files:\n" + $files
        )
      }
    }'
else
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"[Graphify] No graph yet — run /graphify to index the codebase for smarter Glob/Grep searches."}}'
fi

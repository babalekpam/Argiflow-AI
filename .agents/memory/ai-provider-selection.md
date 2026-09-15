---
name: Explicit AI provider selection
description: Preserve tenant provider choices rather than silently routing to platform defaults.
---
An explicit tenant AI provider selection must take precedence over platform keys and must not silently fall back to a different provider on authentication failure.

**Why:** A retained invalid platform OpenAI key caused chat and Council failures even after the user selected Anthropic. Silent fallback hides the actual account requiring repair.

**How to apply:** Route tenant-facing AI operations, including multi-stage Council calls, through tenant-aware selection. Discard a stale model belonging to a different provider when switching.
---
name: Explicit AI provider selection
description: Preserve tenant provider choices rather than silently routing to platform defaults.
---
An explicit tenant AI provider selection must take precedence over platform keys and must not silently fall back to a different provider on authentication failure.

**Why:** A retained invalid platform OpenAI key caused chat and Council failures even after the user selected Anthropic. Silent fallback hides the actual account requiring repair.

**How to apply:** Route tenant-facing AI operations, including multi-stage Council calls, through tenant-aware selection. Discard a stale model belonging to a different provider when switching.

Verify the provider's live model catalog separately from credential validity and displayed provider labels.

**Why:** A valid Groq key authenticated successfully while the previously configured Llama model returned model-not-found. A separate provider-status page showed the platform OpenAI default instead of the account's saved Groq selection, obscuring the real failure.

**How to apply:** Check model availability and the actual request destination before diagnosing a provider switch failure. Model names or an OpenAI-compatible SDK are not proof of OpenAI routing. Keep retired-model replacements within the explicitly selected provider.
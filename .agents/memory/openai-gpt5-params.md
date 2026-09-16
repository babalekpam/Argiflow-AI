---
name: OpenAI GPT-5 / o-series parameter change
description: GPT-5 and o-series chat models reject `max_tokens` — they require `max_completion_tokens`. Bites any model swap from gpt-4o.
---

# OpenAI GPT-5 / o-series parameter change

**Rule:** GPT-5 family (`gpt-5*`) and o-series (`o1/o3/o4`) chat-completions calls reject
`max_tokens` with HTTP 400 (`Unsupported parameter: 'max_tokens' ... Use 'max_completion_tokens'`).
Older models (`gpt-4o`, `gpt-4`, `gpt-3.5`) still use `max_tokens`. Both accept
`response_format: { type: "json_object" }`.

**Why it matters:** Several files in this app make direct `openai.chat.completions.create`
calls hardcoding `max_tokens` (e.g. routes.ts, ai-provider.ts, voice/agents). Bumping any of
those to a GPT-5 model without switching the token param will 400 on every call. The intelligence
engine's `aiExtract` already branches on the model name to pick the right param — copy that
pattern (`/^(gpt-5|o[134])/.test(model)`) when upgrading other call sites.

**How to apply:** Before swapping any OpenAI model constant to gpt-5.x/o-series, switch its
`max_tokens` to `max_completion_tokens` (or branch on model name).

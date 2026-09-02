---
name: Tenant agent factual grounding
description: Source-of-truth boundary for tenant-facing AI campaign and strategy generation.
---

Tenant-facing agents must ground campaigns, strategies, and decisions in owner-entered tenant context and verified tenant website facts. Platform product context and prior model-generated profiles are not sources of tenant business facts.

**Why:** Mixing ArgiFlow product context into Track-Med generation caused generic, inaccurate claims that Track-Med offered patient-data and billing-process software instead of its verified RCM services.

**How to apply:** Inject a shared verified-tenant context and hard factual guard into every generation path. Omit unknown claims, treat prior strategies as ideas only, and learn outcomes only from genuine replies, meetings, conversions, bounces, and opt-outs—not opens or clicks.
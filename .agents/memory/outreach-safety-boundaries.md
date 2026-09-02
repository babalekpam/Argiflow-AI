---
name: Outreach safety boundaries
description: Durable safety rules for engagement scoring, shared-inbox replies, and unsubscribe enforcement.
---

Only a confidently parsed, uniquely attributed human reply should qualify a prospect or trigger an automated response. Opens and clicks are weak signals because privacy proxies and scanners can generate them.

**Why:** Sender-only matching in a shared inbox can cross tenant boundaries, and lead-row-only opt-outs disappear if a lead is deleted. Both create privacy or compliance risks.

**How to apply:** Quarantine ambiguous or unparseable inbound messages, never promote leads from opens/clicks alone, and store normalized email suppressions independently of lead lifecycle records.
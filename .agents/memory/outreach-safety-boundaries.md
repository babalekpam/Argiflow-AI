---
name: Outreach safety boundaries
description: Durable safety rules for engagement scoring, shared-inbox replies, and unsubscribe enforcement.
---

Only a confidently parsed, uniquely attributed human reply should qualify a prospect or trigger an automated response. Opens and clicks are weak signals because privacy proxies and scanners can generate them.

**Why:** Sender-only matching in a shared inbox can cross tenant boundaries, and lead-row-only opt-outs disappear if a lead is deleted. Both create privacy or compliance risks.

**How to apply:** Quarantine ambiguous or unparseable inbound messages, never promote leads from opens/clicks alone, and store normalized email suppressions independently of lead lifecycle records.

Approval to launch one campaign is limited to its selected recipients and sender; it is not approval to enable tenant-wide discovery, enrollment, or unrelated draft sending.

**Why:** The legacy outreach start operation combines discovery, enrollment, replies, and sending. Reusing it as a campaign launch action would exceed the scope of the owner's confirmation.

**How to apply:** Keep explicit campaign launch separate from full-agent activation. Publishing code alone must not create new launch authorization or enroll recipients.
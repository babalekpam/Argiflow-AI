---
name: Email outcome reconciliation
description: Why uncertain sends pause instead of retrying and why delivery evidence stays unknown.
---
Persist a claim before sending. Treat provider acceptance and bookkeeping as separate outcomes. If a send may have been accepted but its result cannot be safely recorded, pause for reconciliation; do not automatically resend.

**Why:** A logging or state-write failure after SMTP acceptance can otherwise turn a successful send into repeated outreach. Repeated attempts also distort funnel totals, so count unique recipients separately.

**How to apply:** Apply the same boundary to initial outreach, follow-ups, campaign sends and sequence steps. Provider handoff is not delivery; absence of bounce events is not delivery evidence. Historical provider labels may be inaccurate, so do not use them as proof of provider behavior.
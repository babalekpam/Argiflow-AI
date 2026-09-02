---
name: Tenant campaign sender identity
description: Boundary between tenant-owned campaign SMTP and the platform partnership mailbox.
---

Campaigns, automated sequences, and tenant-approved agent emails must send through the authenticated tenant's saved SMTP account. The platform partnership mailbox is reserved for platform-level mail and must not silently send a tenant's campaign.

**Why:** Track-Med explicitly confirmed that its campaigns belong to its own SMTP identity; using the platform mailbox misrepresents the sender and can break deliverability or reply routing.

**How to apply:** Resolve mail transport and From address from tenant settings for every tenant outreach path. If tenant SMTP is missing or fails, stop with a clear error rather than falling back to the platform identity.